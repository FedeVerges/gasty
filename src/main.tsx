import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { seedDatabase } from './lib/db'
import { renewRecurringRules } from './lib/recurring'
import { SettingsProvider } from './context/SettingsContext.tsx'
import { ProfileProvider } from './context/ProfileContext.tsx'

async function init() {
  await seedDatabase()
  await renewRecurringRules()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ProfileProvider>
        <SettingsProvider>
          <App />
        </SettingsProvider>
      </ProfileProvider>
    </StrictMode>,
  )
}

init()
