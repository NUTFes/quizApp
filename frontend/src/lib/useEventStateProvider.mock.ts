import { useEffect, useState } from 'react'
import type { AdminState, MonitorState, ViewerState } from '../types'
import { assertStateContract } from './assertStateContract'

type EventState = AdminState | MonitorState | ViewerState
type MockStep<Type extends EventState> = { at: number; mock: Type }
type View = 'phone' | 'monitor' | 'admin'

function useMockEventState<Type extends EventState>(
  loadMockSteps: () => Promise<MockStep<Type>[]>,
  view: View,
): Type | null {
  const [state, setState] = useState<Type | null>(null)

  useEffect(() => {
    // import の所要時間に左右されないよう、effect の開始時点を台本の0秒とする。
    const startedAt = performance.now()
    let closed = false
    const timers: ReturnType<typeof setTimeout>[] = []

    loadMockSteps()
      .then((steps) => {
        if (closed) return
        const elapsed = performance.now() - startedAt

        for (const { at, mock } of steps) {
          const delay = Math.max(0, at - elapsed)
          timers.push(
            setTimeout(() => {
              assertStateContract(mock, view)
              setState(mock)
            }, delay),
          )
        }
      })
      .catch((e: unknown) => {
        if (!closed) console.error('モックデータを読み込めませんでした', e)
      })

    return () => {
      closed = true
      for (const timer of timers) {
        clearTimeout(timer)
      }
    }
  }, [loadMockSteps, view])

  return state
}

async function loadAdminMockSteps(): Promise<MockStep<AdminState>[]> {
  const {
    adminWaiting,
    adminQuestionFour,
    adminQuestionArunashi,
    adminAnswerAri,
    adminAnswerNashi,
    adminFinished,
  } = await import('./mock/admin/index')

  return [
    { at: 300, mock: adminWaiting },
    { at: 2000, mock: adminQuestionFour },
    { at: 5000, mock: adminAnswerAri },
    { at: 8000, mock: adminQuestionArunashi },
    { at: 11000, mock: adminAnswerNashi },
    { at: 14000, mock: adminFinished },
  ]
}

async function loadMonitorMockSteps(): Promise<MockStep<MonitorState>[]> {
  const {
    monitorWaiting,
    monitorQuestionFour,
    monitorQuestionArunashi,
    monitorAnswerAri,
    monitorAnswerNashi,
    monitorFinished,
    monitorRevivalVideo,
  } = await import('./mock/monitor/index')

  return [
    { at: 300, mock: monitorWaiting },
    { at: 2000, mock: monitorQuestionFour },
    { at: 5000, mock: monitorAnswerAri },
    { at: 8000, mock: monitorQuestionArunashi },
    { at: 11000, mock: monitorAnswerNashi },
    { at: 14000, mock: monitorRevivalVideo },
    { at: 17000, mock: monitorFinished },
  ]
}

async function loadViewerMockSteps(): Promise<MockStep<ViewerState>[]> {
  const {
    phoneWaiting,
    phoneQuestionFour,
    phoneQuestionArunashi,
    phoneAnswerAri,
    phoneAnswerNashi,
    phoneRevivalEntry,
    phoneRevivalVideo,
    phoneFinished,
  } = await import('./mock/phone/index')

  return [
    { at: 300, mock: phoneWaiting },
    { at: 2000, mock: phoneQuestionFour },
    { at: 5000, mock: phoneAnswerAri },
    { at: 8000, mock: phoneQuestionArunashi },
    { at: 11000, mock: phoneAnswerNashi },
    { at: 14000, mock: phoneRevivalVideo },
    { at: 17000, mock: phoneRevivalEntry },
    { at: 20000, mock: phoneFinished },
  ]
}

export const useAdminState = (_onUnauthorized?: () => void) =>
  useMockEventState(loadAdminMockSteps, 'admin')

export const useMonitorState = () => useMockEventState(loadMonitorMockSteps, 'monitor')

export const useViewerState = () => useMockEventState(loadViewerMockSteps, 'phone')
