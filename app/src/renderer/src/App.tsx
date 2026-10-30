import { useEffect } from 'react'
import { api } from './api/client'
import { initOps } from './actions'
import { runMenuCommand } from './commands'
import { AddressRow } from './components/AddressRow'
import { ContextMenu } from './components/ContextMenu'
import { Dialogs } from './components/Dialogs'
import { CommandBar } from './components/CommandBar'
import { DetailsPane } from './components/DetailsPane'
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
  const showOptions = useStore((s) => s.showOptions)
  useTheme()
  useShortcuts()
  useEffect(() => {
    void useStore.getState().init()
    initOps()
    return api.app.onMenu(runMenuCommand)
  }, [])

  return (
    <div className="window">
      <TitleBar />
      <AddressRow />
      <CommandBar />
      <div className="body">
        <NavPane />
        <div className="splitter" />
        <MainArea />
        {detailsPane && <DetailsPane />}
      </div>
      <StatusBar />
      <ContextMenu />
      <Dialogs />
      {showOptions && <OptionsDialog />}
      <Onboarding />
    </div>
  )
}
