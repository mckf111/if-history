// 《如果历史：刻下无名——城破前夜》
// Copyright (c) 2026 mckf111（文虎）
// v0.6.0 起保留所有权利（All Rights Reserved）；详见 LICENSE 与 LICENSE-CONTENT.md
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './sim/SimApp'
import './sim/sim.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
