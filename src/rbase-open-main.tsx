import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { RBaseOpenPage } from './pages/RBaseOpenPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RBaseOpenPage />
  </StrictMode>,
)