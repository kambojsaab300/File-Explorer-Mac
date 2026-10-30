import { useEffect } from 'react'
import { initOps } from './actions'
import { AddressRow } from './components/AddressRow'
import { ContextMenu } from './components/ContextMenu'
import { Dialogs } from './components/Dialogs'
import { CommandBar } from './components/CommandBar'
import { DetailsPane } from './components/DetailsPane'
import { MainArea } from './components/MainArea'
import { NavPane } from './components/NavPane'
import { StatusBar } from './components/StatusBar'
import { TitleBar } from './components/TitleBar'
import { useShortcuts } from './keyboard'
import { useStore } from './store'

function useSystemTheme(): void {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = (): void => document.documentElement.setAttribute('data-theme', mq.matches ? 'dark' : 'light')
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])
}

export function App() {
  const detailsPane = useStore((s) => s.detailsPane)
  useSystemTheme()
  useShortcuts()
  useEffect(() => {
    void useStore.getState().init()
    initOps()
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
    </div>
  )
}
