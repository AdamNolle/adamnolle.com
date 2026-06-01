import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

const container = document.getElementById('root')
if (!container) throw new Error('Root element #root not found')

// StrictMode is intentionally omitted: we manage three.js GPU resources
// (textures, PMREM targets) manually, and its double-invoke in dev would
// double-allocate them.
createRoot(container).render(<App />)
