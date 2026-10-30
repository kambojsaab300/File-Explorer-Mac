import { TitleBar } from './components/TitleBar'

export function App() {
  return (
    <div className="window">
      <TitleBar />
      <main className="content-area" />
    </div>
  )
}
