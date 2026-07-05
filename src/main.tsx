import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerServiceWorker } from './pwa/registerSW'

const APP_THEME_COLOR = '#0C385C'

function applyThemeColor(color: string) {
  const head = document.head
  let themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (!themeMeta) {
    themeMeta = document.createElement('meta')
    themeMeta.setAttribute('name', 'theme-color')
    head.appendChild(themeMeta)
  }
  themeMeta.setAttribute('content', color)
}

applyThemeColor(APP_THEME_COLOR)
registerServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
