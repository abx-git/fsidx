import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { E2EditPage } from './pages/E2EditPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <E2EditPage />
  </StrictMode>,
)