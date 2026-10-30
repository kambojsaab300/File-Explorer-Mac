import { createRoot } from 'react-dom/client'
import sprite from './assets-sprite.svg?raw'
import './styles/tokens.css'
import './styles/app.css'
import { App } from './App'

// Inline the icon sprite once so every <Icon> can reference it with <use href="#id">.
document.body.insertAdjacentHTML('afterbegin', sprite)

createRoot(document.getElementById('root')!).render(<App />)
