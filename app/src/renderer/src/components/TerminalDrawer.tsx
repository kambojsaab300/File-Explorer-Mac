import { useEffect, useRef, useState } from 'react'
import { api } from '@/api/client'
import { currentDir } from '@/actions'
import { locOf, useStore } from '@/store'
import { Icon } from './Icon'

interface HistoryEntry {
  id: number
  command: string
  output?: string
  error?: string
  cwd: string
  timestamp: string
}

// Convert ANSI color escape codes into styled React elements
function renderAnsi(text: string): React.ReactNode {
  if (!text) return null
  // Standard ANSI regex
  const parts = text.split(/(\u001b\[[0-9;]*m)/g)
  let currentColor = ''
  let isBold = false
  let isDim = false

  const COLOR_MAP: Record<string, string> = {
    '30': '#4b5563', // black/gray
    '31': '#f87171', // red
    '32': '#4ade80', // green
    '33': '#fbbf24', // yellow
    '34': '#60a5fa', // blue
    '35': '#c084fc', // magenta
    '36': '#22d3ee', // cyan
    '37': '#f3f4f6', // white
    '90': '#6b7280', // bright black
    '91': '#ef4444', // bright red
    '92': '#10b981', // bright green
    '93': '#f59e0b', // bright yellow
    '94': '#3b82f6', // bright blue
    '95': '#a855f7', // bright magenta
    '96': '#06b6d4', // bright cyan
    '97': '#ffffff'  // bright white
  }

  return (
    <span>
      {parts.map((part, i) => {
        const match = part.match(/^\u001b\[([0-9;]*)m$/)
        if (match) {
          const codes = match[1].split(';')
          for (const c of codes) {
            if (c === '0') {
              currentColor = ''
              isBold = false
              isDim = false
            } else if (c === '1') isBold = true
            else if (c === '2') isDim = true
            else if (COLOR_MAP[c]) currentColor = COLOR_MAP[c]
          }
          return null
        }
        if (!part) return null
        return (
          <span
            key={i}
            style={{
              color: currentColor || undefined,
              fontWeight: isBold ? 600 : undefined,
              opacity: isDim ? 0.7 : undefined
            }}
          >
            {part}
          </span>
        )
      })}
    </span>
  )
}

export function TerminalDrawer() {
  const { terminalOpen, terminalHeight, toggleTerminal, setTerminalHeight } = useStore()
  const [cwd, setCwd] = useState<string>('')
  const [shellName, setShellName] = useState<string>('')
  const [inputVal, setInputVal] = useState<string>('')
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [cmdIndex, setCmdIndex] = useState<number>(-1)
  const [isExecuting, setIsExecuting] = useState<boolean>(false)
  const [resizing, setResizing] = useState<boolean>(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const historyCommandsRef = useRef<string[]>([])

  useEffect(() => {
    if (!terminalOpen) return
    void api.terminal.getCwd().then(setCwd)
    void api.terminal.getDefaultShell().then((sh) => {
      const parts = sh.replace(/\\/g, '/').split('/')
      setShellName(parts[parts.length - 1] || sh)
    })
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [terminalOpen])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [history, isExecuting])

  const runCommand = async (cmdToRun: string): Promise<void> => {
    const raw = cmdToRun.trim()
    if (!raw) return

    if (raw === 'clear' || raw === 'cls') {
      setHistory([])
      setInputVal('')
      return
    }

    historyCommandsRef.current.push(raw)
    setCmdIndex(-1)
    setInputVal('')
    setIsExecuting(true)

    const entryId = Date.now()
    const now = new Date()
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`

    try {
      const result = await api.terminal.exec(raw, cwd)
      if (result.cwd) setCwd(result.cwd)
      setHistory((prev) => [
        ...prev,
        {
          id: entryId,
          command: raw,
          output: result.stdout,
          error: result.stderr,
          cwd: result.cwd || cwd,
          timestamp: timeStr
        }
      ])
    } catch (e) {
      setHistory((prev) => [
        ...prev,
        {
          id: entryId,
          command: raw,
          error: String((e as Error)?.message ?? e),
          cwd,
          timestamp: timeStr
        }
      ])
    } finally {
      setIsExecuting(false)
      setTimeout(() => inputRef.current?.focus(), 20)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      void runCommand(inputVal)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const list = historyCommandsRef.current
      if (!list.length) return
      const nextIdx = cmdIndex === -1 ? list.length - 1 : Math.max(0, cmdIndex - 1)
      setCmdIndex(nextIdx)
      setInputVal(list[nextIdx] || '')
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const list = historyCommandsRef.current
      if (cmdIndex === -1) return
      const nextIdx = cmdIndex + 1
      if (nextIdx >= list.length) {
        setCmdIndex(-1)
        setInputVal('')
      } else {
        setCmdIndex(nextIdx)
        setInputVal(list[nextIdx] || '')
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
      e.preventDefault()
      setHistory([])
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      if (inputVal) {
        setInputVal('')
      }
    }
  }

  const syncCwdWithExplorer = async (): Promise<void> => {
    const explorerDir = currentDir()
    if (!explorerDir) return
    const nextCwd = await api.terminal.setCwd(explorerDir)
    setCwd(nextCwd)
    setHistory((prev) => [
      ...prev,
      {
        id: Date.now(),
        command: `cd "${explorerDir}"`,
        output: `Working directory synced to: ${explorerDir}\n`,
        cwd: nextCwd,
        timestamp: new Date().toLocaleTimeString()
      }
    ])
    inputRef.current?.focus()
  }

  const startResize = (e: React.MouseEvent): void => {
    e.preventDefault()
    setResizing(true)
    const startY = e.clientY
    const startH = terminalHeight

    const onMove = (ev: MouseEvent): void => {
      const next = Math.max(120, Math.min(600, startH - (ev.clientY - startY)))
      setTerminalHeight(next)
    }
    const onUp = (): void => {
      setResizing(false)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  if (!terminalOpen) return null

  // Shorten cwd display for prompt
  const displayCwd = cwd.length > 35 ? '...' + cwd.slice(-32) : cwd

  return (
    <div className="terminal-drawer" style={{ height: terminalHeight }}>
      <div className={`terminal-splitter${resizing ? ' dragging' : ''}`} onMouseDown={startResize} />
      <div className="terminal-header">
        <div className="terminal-title">
          <span className="terminal-icon">
            <Icon name="u-terminal" size={14} />
          </span>
          <span className="terminal-name">Terminal</span>
          {shellName && <span className="terminal-badge">{shellName}</span>}
          <span className="terminal-cwd" title={cwd}>
            {displayCwd || '~'}
          </span>
        </div>

        <div className="terminal-quick-chips">
          <button className="t-chip" onClick={() => void runCommand('git status')}>
            git status
          </button>
          <button className="t-chip" onClick={() => void runCommand(api.platform === 'win32' ? 'dir' : 'ls -la')}>
            {api.platform === 'win32' ? 'dir' : 'ls -la'}
          </button>
          <button className="t-chip" onClick={() => void runCommand('pwd')}>
            pwd
          </button>
          <button className="t-chip" onClick={() => void runCommand('git log --oneline -5')}>
            git log
          </button>
        </div>

        <div className="terminal-actions">
          <button className="t-btn" title="Sync directory with active Explorer tab" onClick={() => void syncCwdWithExplorer()}>
            <Icon name="u-refresh" size={12} />
            <span>Sync CWD</span>
          </button>
          <button className="t-btn" title="Clear console" onClick={() => setHistory([])}>
            <Icon name="u-delete" size={12} />
            <span>Clear</span>
          </button>
          <button className="t-btn" title="Open in system terminal" onClick={() => api.shell.openTerminal(cwd)}>
            <Icon name="u-external" size={12} />
            <span>External</span>
          </button>
          <button className="t-btn t-close" title="Close terminal (Ctrl+~)" onClick={toggleTerminal}>
            <Icon name="u-close" size={12} />
          </button>
        </div>
      </div>

      <div className="terminal-body" ref={scrollRef} onClick={() => inputRef.current?.focus()}>
        <div className="terminal-banner">
          <span>Khoj Integrated Terminal · Windows Terminal for macOS</span>
          <span className="banner-sub">Press Ctrl+~ to toggle · Type commands or click quick actions</span>
        </div>

        {history.map((item) => (
          <div key={item.id} className="terminal-entry">
            <div className="terminal-cmd-line">
              <span className="prompt-prefix">➜</span>
              <span className="prompt-path">{item.cwd.split('/').pop() || item.cwd}</span>
              <span className="prompt-cmd">{item.command}</span>
              <span className="prompt-time">{item.timestamp}</span>
            </div>
            {item.output && <div className="terminal-stdout">{renderAnsi(item.output)}</div>}
            {item.error && <div className="terminal-stderr">{renderAnsi(item.error)}</div>}
          </div>
        ))}

        {isExecuting && (
          <div className="terminal-running">
            <span className="spinner-dots">Running...</span>
          </div>
        )}

        <div className="terminal-prompt-row">
          <span className="prompt-prefix">➜</span>
          <span className="prompt-path">{cwd.split('/').pop() || cwd}</span>
          <input
            ref={inputRef}
            type="text"
            className="terminal-input"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type command and press Enter (e.g. ls, git status, cd ...)"
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            disabled={isExecuting}
          />
        </div>
      </div>
    </div>
  )
}
