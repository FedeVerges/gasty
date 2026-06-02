import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { seedDatabase } from './lib/db'
import { SettingsProvider } from './context/SettingsContext.tsx'

async function init() {
  await seedDatabase()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <SettingsProvider>
        <App />
      </SettingsProvider>
    </StrictMode>,
  )
}

init()
