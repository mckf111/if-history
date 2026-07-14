// 《如果历史：刻下无名——城破前夜》
// Copyright (c) 2026 mckf111（文虎）
// 代码：AGPL-3.0-only；叙事与视觉内容：CC BY-NC-SA 4.0（详见 LICENSE 与 LICENSE-CONTENT.md）
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './sim/SimApp'
import './sim/sim.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
