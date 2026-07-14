import { useCallback, useEffect, useRef, useState } from 'react'
import {
  loadAudioPreferences,
  playAudioCue,
  setAmbience,
  updateAudioPreferences,
  type AudioCue,
  type AudioPreferences,
} from './audio'
import { mergeCodexFromRun } from './engine/codex'
import { applyCommand, createSim } from './engine/engine'
import {
  clearSim,
  importSim,
  loadCodex,
  loadSim,
  loadSimResult,
  saveCodex,
  saveSim,
} from './storage'
import HomeScreen from './ui/HomeScreen'
import PlayScreen from './ui/PlayScreen'
import NightReport from './ui/NightReport'
import EndScreen from './ui/EndScreen'
import PrologueScreen from './ui/PrologueScreen'
import UtilityDock from './ui/UtilityDock'
import Modal from './ui/Modal'
import type { PlayerCommand, SimState } from './types'

// 门面纪律：组件只提交 PlayerCommand，规则全在纯函数引擎里。
// 引擎抛出的中文错误就是给玩家看的话，直接上提示条。

export default function SimApp() {
  const [state, setState] = useState<SimState | null>(null)
  const stateRef = useRef<SimState | null>(null)
  const [savedState, setSavedState] = useState<SimState | undefined>()
  const [toast, setToast] = useState<string | null>(null)
  const [saveFailed, setSaveFailed] = useState(false)
  const [audio, setAudio] = useState<AudioPreferences>(() => loadAudioPreferences())
  const [pendingImport, setPendingImport] = useState<SimState | null>(null)
  const sceneCueRef = useRef('')

  useEffect(() => {
    const loaded = loadSimResult()
    if (loaded.status === 'loaded') setSavedState(loaded.state)
    else if (loaded.status === 'storage-unavailable') setSaveFailed(true)
    else if (loaded.status === 'invalid-json' || loaded.status === 'invalid-save') {
      setToast('旧档的因果对不上，已停在原处，没有载入。')
    }
  }, [])

  useEffect(() => {
    if (!state) return
    const saved = saveSim(state)
    setSaveFailed(!saved.ok)
    // 完局（含被处决）即入史鉴；按种子+结果族去重，StrictMode 双跑无害
    if (state.status !== 'playing') {
      const codexSaved = saveCodex(mergeCodexFromRun(loadCodex(), state, new Date().toISOString()))
      if (!codexSaved.ok) setSaveFailed(true)
    }
  }, [state])

  useEffect(() => {
    const ambience = !state || state.status !== 'playing'
      ? 'none'
      : state.phase === 'action' ? 'day' : 'night'
    setAmbience(ambience, audio)
  }, [audio, state?.phase, state?.status, state?.seed])

  useEffect(() => {
    if (!state) return
    const marker = `${state.seed}:${state.day}:${state.phase}:${state.status}`
    if (sceneCueRef.current === marker) return
    sceneCueRef.current = marker
    if (state.phase === 'night-report') playAudioCue('night', audio)
    if (state.status !== 'playing') playAudioCue(endingCue(state), audio)
  }, [audio, state])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(timer)
  }, [toast])

  const dispatch = useCallback((cmd: PlayerCommand) => {
    const current = stateRef.current
    if (!current) return
    playAudioCue(commandCue(cmd), audio)
    try {
      const next = applyCommand(current, cmd)
      stateRef.current = next
      setState(next)
    } catch (error) {
      playAudioCue('error', audio)
      setToast(error instanceof Error ? error.message : '这一步走不通。')
    }
  }, [audio])

  const startRun = useCallback((seed: number) => {
    playAudioCue('cannon', audio)
    if (!clearSim().ok) setSaveFailed(true)
    setSavedState(undefined)
    const next = createSim(seed)
    stateRef.current = next
    setState(next)
  }, [audio])

  const startNew = useCallback(() => startRun(Date.now() >>> 0), [startRun])

  const continueSave = useCallback(() => {
    const saved = loadSim()
    if (saved) {
      playAudioCue('paper', audio)
      stateRef.current = saved
      setState(saved)
    }
    else {
      setSavedState(undefined)
      setToast('旧档对不上因果，已经不能用了。')
    }
  }, [audio])

  const backHome = useCallback(() => {
    stateRef.current = null
    setState(null)
    setSavedState(loadSim())
  }, [])

  const changeAudio = useCallback((next: AudioPreferences) => {
    setAudio(next)
    updateAudioPreferences(next)
    if (!next.muted) playAudioCue('paper', next)
  }, [])

  const installImportedSave = useCallback((importedState: SimState) => {
    const saved = saveSim(importedState)
    playAudioCue('paper', audio)
    setSaveFailed(!saved.ok)
    setSavedState(importedState)
    stateRef.current = importedState
    setState(importedState)
    setPendingImport(null)
    setToast(saved.ok ? '存档已核对并读入。' : '存档已读入当前页面，但浏览器没能自动保存；请抄出备份。')
  }, [audio])

  const importSave = useCallback((raw: string) => {
    const imported = importSim(raw)
    if (!imported.ok) {
      setToast(imported.reason === 'invalid-json' ? '这不是能读的存档文件。' : '这份存档的结构或因果核对失败。')
      return
    }
    if (needsImportConfirmation(stateRef.current, savedState)) {
      setPendingImport(imported.state)
      return
    }
    installImportedSave(imported.state)
  }, [installImportedSave, savedState])

  const cancelImport = useCallback(() => setPendingImport(null), [])
  const confirmImport = useCallback(() => {
    if (pendingImport) installImportedSave(pendingImport)
  }, [installImportedSave, pendingImport])

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
    screen = (
      <EndScreen
        state={state}
        codex={loadCodex()}
        onRetrySeed={() => startRun(state.seed)}
        onRestart={startNew}
        onHome={backHome}
      />
    )
  } else if (state.phase === 'night-report') {
    screen = <NightReport state={state} dispatch={dispatch} />
  } else {
    // key=seed：换局时重置开场戏与提示条等局部 UI 状态
    screen = <PlayScreen key={state.seed} state={state} dispatch={dispatch} onAbandon={backHome} />
  }

  return (
    <>
      <div className="sim-app-layer" inert={pendingImport ? true : undefined}>
        {screen}
        {saveFailed ? (
          <div className="sim-save-warning" role="alert">
            <strong>自动存档失败</strong>
            <span>这一页还能继续玩，但刷新可能丢失进度。请用右下角「档」抄出备份。</span>
          </div>
        ) : null}
        <UtilityDock state={state} audio={audio} onAudioChange={changeAudio} onImport={importSave} onMessage={setToast} />
        {toast ? <div className="sim-toast" role="status">{toast}</div> : null}
      </div>
      {pendingImport ? (
        <Modal
          title="换成读入的存档？"
          eyebrow={state ? '当前这一局还在页面上' : '浏览器里已有一份自动存档'}
          closeLabel={state ? '保留当前局' : '保留原存档'}
          onClose={cancelImport}
        >
          <p className="sim-modal-lede">
            读入不会合并两局进度。确认后，{state ? '当前页面和自动存档' : '现有自动存档'}都会换成新读入的那一局。
          </p>
          <div className="sim-row sim-modal-actions">
            <button type="button" className="sim-btn" onClick={cancelImport}>{state ? '保留当前局' : '保留原存档'}</button>
            <button type="button" className="sim-btn sim-btn-danger" onClick={confirmImport}>确认读入，替换当前局</button>
          </div>
        </Modal>
      ) : null}
    </>
  )
}

export function needsImportConfirmation(currentState: SimState | null, savedState: SimState | undefined): boolean {
  return Boolean(currentState || savedState)
}

export function endingCue(state: SimState): AudioCue {
  if (state.status === 'executed') return 'ending-failure'
  const lever = state.vow === 'save-chunsheng'
    ? 'chunsheng'
    : state.vow === 'protect-roster'
      ? 'roster'
      : state.vow === 'protect-neighborhood'
        ? 'gate'
        : undefined
  const kept = lever
    ? state.node?.levers.some((outcome) => outcome.lever === lever && outcome.tipped)
    : false
  return kept ? 'ending-success' : 'ending-failure'
}

function commandCue(command: PlayerCommand): AudioCue {
  if (command.t === 'choose-vow' || command.t === 'forge') return 'stamp'
  if (command.t === 'move' || command.t === 'rest') return 'step'
  if (command.t === 'probe' || command.t === 'observe' || command.t === 'confirm-report') return 'paper'
  if (command.t === 'alter') return 'ink'
  if (command.t === 'collect' || command.t === 'dispatch') return 'latch'
  if (command.t === 'destroy') return 'paper'
  return 'paper'
}
