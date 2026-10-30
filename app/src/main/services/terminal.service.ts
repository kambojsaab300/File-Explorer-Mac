import { app } from 'electron'
import { exec } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import type { TerminalExecResult } from '@shared/types'

let sessionCwd: string = ''

export function getTerminalCwd(): string {
  if (!sessionCwd) {
    try {
      sessionCwd = app.getPath('home')
    } catch {
      sessionCwd = process.cwd()
    }
  }
  return sessionCwd
}

export function setTerminalCwd(cwd: string): string {
  if (cwd && existsSync(cwd)) {
    try {
      const st = statSync(cwd)
      if (st.isDirectory()) {
        sessionCwd = cwd
      }
    } catch {
      // Ignored if unreadable
    }
  }
  return getTerminalCwd()
}

export function getDefaultShell(): string {
  if (process.platform === 'darwin') {
    return process.env.SHELL || '/bin/zsh'
  }
  if (process.platform === 'win32') {
    return process.env.COMSPEC || 'powershell.exe'
  }
  return process.env.SHELL || '/bin/sh'
}

export async function execCommand(command: string, customCwd?: string): Promise<TerminalExecResult> {
  const cwd = customCwd ? setTerminalCwd(customCwd) : getTerminalCwd()
  const trimmed = command.trim()

  if (!trimmed) {
    return { stdout: '', stderr: '', code: 0, cwd }
  }

  // Handle cd commands internally so terminal cwd stays synchronized across commands
  if (trimmed === 'cd' || trimmed === 'cd ~') {
    try {
      const home = app.getPath('home')
      sessionCwd = home
      return { stdout: '', stderr: '', code: 0, cwd: home }
    } catch {
      return { stdout: '', stderr: '', code: 0, cwd }
    }
  }

  if (trimmed.startsWith('cd ')) {
    const rawTarget = trimmed.slice(3).trim().replace(/^['"]|['"]$/g, '')
    const target = rawTarget.startsWith('~')
      ? resolve(app.getPath('home'), rawTarget.slice(1).replace(/^[/\\]/, ''))
      : resolve(cwd, rawTarget)

    if (existsSync(target) && statSync(target).isDirectory()) {
      sessionCwd = target
      return { stdout: '', stderr: '', code: 0, cwd: target }
    } else {
      return { stdout: '', stderr: `cd: no such file or directory: ${rawTarget}\n`, code: 1, cwd }
    }
  }

  const shell = getDefaultShell()
  return new Promise((res) => {
    exec(command, { cwd, env: process.env, shell, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      res({
        stdout: stdout || '',
        stderr: stderr || (err && !stderr ? err.message : ''),
        code: typeof err?.code === 'number' ? err.code : err ? 1 : 0,
        cwd: sessionCwd
      })
    })
  })
}
