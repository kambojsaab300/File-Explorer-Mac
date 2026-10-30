import { useEffect, useState } from 'react'
import { api } from './api/client'
import { initOps } from './actions'
import { runMenuCommand } from './commands'
import { AddressRow } from './components/AddressRow'
import { ContextMenu } from './components/ContextMenu'
import { Dialogs } from './components/Dialogs'
import { CommandBar } from './components/CommandBar'
import { DetailsPane } from './components/DetailsPane'
import { PreviewPane } from './components/PreviewPane'
import { MainArea } from './components/MainArea'
import { NavPane } from './components/NavPane'
import { Onboarding, OptionsDialog } from './components/Settings'
import { StatusBar } from './components/StatusBar'
import { TitleBar } from './components/TitleBar'
import { useShortcuts } from './keyboard'
import { useStore } from './store'

function useTheme(): void {
  const theme = useStore((s) => s.prefs.theme)
  const macButtons = useStore((s) => s.prefs.macButtons)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = (): void => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches)
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
  useEffect(() => {
    document.documentElement.classList.toggle('mac-buttons', macButtons && api.platform === 'darwin')
  }, [macButtons])
}

export function App() {
  const detailsPane = useStore((s) => s.detailsPane)
  const activePane = useStore((s) => s.activePane)
  const showOptions = useStore((s) => s.showOptions)
  const compact = useStore((s) => s.prefs.compact)
  const [navW, setNavW] = useState(300)
  const [draggingNav, setDraggingNav] = useState(false)

  useTheme()
  useShortcuts()

  useEffect(() => {
    void useStore.getState().init()
    initOps()
    void api.settings.get<number>('navWidth').then((w) => {
      if (w && w >= 160 && w <= 600) setNavW(w)
    })
    return api.app.onMenu(runMenuCommand)
  }, [])

  const startResizeNav = (e: React.MouseEvent): void => {
    e.preventDefault()
    setDraggingNav(true)
    const startX = e.clientX
    const startW = navW
    const onMove = (ev: MouseEvent): void => {
      const next = Math.max(160, Math.min(600, startW + (ev.clientX - startX)))
      setNavW(next)
    }
    const onUp = (ev: MouseEvent): void => {
      setDraggingNav(false)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      const finalW = Math.max(160, Math.min(600, startW + (ev.clientX - startX)))
      void api.settings.set('navWidth', finalW)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div className={`window${compact ? ' compact' : ''}`}>
      <TitleBar />
      <AddressRow />
      <CommandBar />
      <div className="body" style={{ '--nav-w': `${navW}px` } as React.CSSProperties}>
        <NavPane />
        <div className={`splitter${draggingNav ? ' dragging' : ''}`} onMouseDown={startResizeNav} />
        <MainArea />
        {detailsPane && (activePane === 'preview' ? <PreviewPane /> : <DetailsPane />)}
      </div>
      <StatusBar />
      <ContextMenu />
      <Dialogs />
      {showOptions && <OptionsDialog />}
      <Onboarding />
    </div>
  )
}
