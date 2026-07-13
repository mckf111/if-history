import { useCallback, useEffect, useState } from 'react'
import { mergeCodexFromRun } from './engine/codex'
import { applyCommand, createSim } from './engine/engine'
import { clearSim, loadCodex, loadSim, saveCodex, saveSim } from './storage'
import HomeScreen from './ui/HomeScreen'
import PlayScreen from './ui/PlayScreen'
import NightReport from './ui/NightReport'
import EndScreen from './ui/EndScreen'
import PrologueScreen from './ui/PrologueScreen'
import type { PlayerCommand, SimState } from './types'

// 门面纪律：组件只提交 PlayerCommand，规则全在纯函数引擎里。
// 引擎抛出的中文错误就是给玩家看的话，直接上提示条。

export default function SimApp() {
  const [state, setState] = useState<SimState | null>(null)
  const [savedState, setSavedState] = useState<SimState | undefined>()
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    setSavedState(loadSim())
  }, [])

  useEffect(() => {
    if (!state) return
    saveSim(state)
    // 完局（含被处决）即入史鉴；按种子+结果族去重，StrictMode 双跑无害
    if (state.status !== 'playing') {
      saveCodex(mergeCodexFromRun(loadCodex(), state, new Date().toISOString()))
    }
  }, [state])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(timer)
  }, [toast])

  const dispatch = useCallback((cmd: PlayerCommand) => {
    setState((current) => {
      if (!current) return current
      try {
        return applyCommand(current, cmd)
      } catch (error) {
        setToast(error instanceof Error ? error.message : '这一步走不通。')
        return current
      }
    })
  }, [])

  const startNew = useCallback(() => {
    clearSim()
    setSavedState(undefined)
    setState(createSim(Date.now() >>> 0))
  }, [])

  const continueSave = useCallback(() => {
    const saved = loadSim()
    if (saved) setState(saved)
    else {
      setSavedState(undefined)
      setToast('旧档对不上因果，已经不能用了。')
    }
  }, [])

  const backHome = useCallback(() => {
    setState(null)
    setSavedState(loadSim())
  }, [])

  let screen
  if (!state) {
    screen = (
      <HomeScreen
        hasSave={Boolean(savedState)}
        saveComplete={Boolean(savedState && savedState.status !== 'playing')}
        onStart={startNew}
        onContinue={continueSave}
      />
    )
  } else if (!state.vow && state.status === 'playing' && state.phase === 'action') {
    screen = <PrologueScreen state={state} dispatch={dispatch} />
  } else if (state.status !== 'playing' || state.phase === 'node' || state.phase === 'epilogue') {
    screen = <EndScreen state={state} onRestart={startNew} onHome={backHome} />
  } else if (state.phase === 'night-report') {
    screen = <NightReport state={state} dispatch={dispatch} />
  } else {
    // key=seed：换局时重置开场戏与提示条等局部 UI 状态
    screen = <PlayScreen key={state.seed} state={state} dispatch={dispatch} onAbandon={backHome} />
  }

  return (
    <>
      {screen}
      {toast ? <div className="sim-toast" role="status">{toast}</div> : null}
    </>
  )
}
