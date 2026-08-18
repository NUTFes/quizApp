import { useEffect, useState } from "react"

import type { AdminState, MonitorState, ViewerState } from "../types"

import { adminWaiting, adminQuestionFour, adminQuestionArunashi, adminAnswerAri, adminAnswerNashi, adminFinished } from "./mock/admin/index"
import { monitorWaiting, monitorQuestionFour, monitorQuestionArunashi, monitorAnswerAri, monitorAnswerNashi, monitorFinished, } from "./mock/monitor/index"
import { phoneWaiting, phoneQuestionFour, phoneQuestionArunashi, phoneAnswerAri, phoneAnswerNashi, phoneFinished } from "./mock/phone/index"

import { USE_MOCK } from "./config"

function useEventState<Type>(testSteps: {at:number, mock:Type}[]) :Type | null{
    const [state, setState] = useState<Type | null>(null)
    useEffect(() =>{
        if(USE_MOCK){
            const ts:ReturnType<typeof setTimeout>[] = []
            for(const {at, mock} of testSteps){
                ts.push(setTimeout(() => setState(mock), at))
            }
            return () => {
                console.log("in useEffect.return() 接続解除のため通信切断")
                for(const [i,t] of ts.entries()){
                    clearTimeout(t)
                    console.log(`t[${i}]: 削除完了`)
                }
            }
        }
    }, [])
    return state
}

export const useAdminState = () => useEventState<AdminState>([
    { at:   300, mock: adminWaiting          },
    { at:  2000, mock: adminQuestionFour     },
    { at:  5000, mock: adminAnswerAri        },
    { at:  8000, mock: adminQuestionArunashi },
    { at: 11000, mock: adminAnswerNashi      },
    { at: 14000, mock: adminFinished         },
])
export const useMonitorState = () => useEventState<MonitorState>([
    { at:   300, mock: monitorWaiting          },
    { at:  2000, mock: monitorQuestionFour     },
    { at:  5000, mock: monitorAnswerAri        },
    { at:  8000, mock: monitorQuestionArunashi },
    { at: 11000, mock: monitorAnswerNashi      },
    { at: 14000, mock: monitorFinished         },
])
export const useViewerState = () => useEventState<ViewerState>([
    { at:   300, mock: phoneWaiting          },
    { at:  2000, mock: phoneQuestionFour     },
    { at:  5000, mock: phoneAnswerAri        },
    { at:  8000, mock: phoneQuestionArunashi },
    { at: 11000, mock: phoneAnswerNashi      },
    { at: 14000, mock: phoneFinished         },
])