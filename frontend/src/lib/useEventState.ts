import { useEffect, useState } from "react"

import type { AdminState, MonitorState, ViewerState } from "../types"

import { adminWaiting, adminQuestionFour, adminQuestionArunashi, adminAnswerAri, adminAnswerNashi, adminFinished } from "./mock/admin/index"
import { monitorWaiting, monitorQuestionFour, monitorQuestionArunashi, monitorAnswerAri, monitorAnswerNashi, monitorFinished, } from "./mock/monitor/index"
import { phoneWaiting, phoneQuestionFour, phoneQuestionArunashi, phoneAnswerAri, phoneAnswerNashi, phoneFinished } from "./mock/phone/index"

import { BASE, USE_MOCK } from "./config"
import { getAdminState, getMonitorState, getViewerState } from "./api"

type opts<Type> = {
    path:string
    getState:() => Promise<Type>
    testSteps:{at:number, mock:Type}[]
}

function useEventState<Type>({path,getState,testSteps}:opts<Type>) :Type | null{
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
        const es = new EventSource(`${BASE}${path}`)
        // 初回接続時、再接続時に State を能動的にとってくる
        es.onopen = () =>{
            getState()
                .then(setState)
                .catch((e) => console.error('SSE qq接続時に State が取得できませんでした', e))
        }
        // サーバーから送られたときに State を更新する
        es.addEventListener('state', (event:MessageEvent) => {
            setState(JSON.parse(event.data) as Type)
        })
        // コンポーネントレンダー終了時に接続を解除
        return () => es.close()
    }, [])
    return state
}

export const useAdminState = () => useEventState<AdminState>({
    path:`/api/admin/events?token=<ADMIN_TOKEN>`,
    getState:getAdminState,
    testSteps:[
        { at:   300, mock: adminWaiting          },
        { at:  2000, mock: adminQuestionFour     },
        { at:  5000, mock: adminAnswerAri        },
        { at:  8000, mock: adminQuestionArunashi },
        { at: 11000, mock: adminAnswerNashi      },
        { at: 14000, mock: adminFinished         },
    ]
})
export const useMonitorState = () => useEventState<MonitorState>({
    path:'/api/events?view=monitor',
    getState:getMonitorState,
    testSteps:[
        { at:   300, mock: monitorWaiting          },
        { at:  2000, mock: monitorQuestionFour     },
        { at:  5000, mock: monitorAnswerAri        },
        { at:  8000, mock: monitorQuestionArunashi },
        { at: 11000, mock: monitorAnswerNashi      },
        { at: 14000, mock: monitorFinished         },
    ]
})
export const useViewerState = () => useEventState<ViewerState>({
    path:'/api/events?view=phone',
    getState:getViewerState,
    testSteps:[
        { at:   300, mock: phoneWaiting          },
        { at:  2000, mock: phoneQuestionFour     },
        { at:  5000, mock: phoneAnswerAri        },
        { at:  8000, mock: phoneQuestionArunashi },
        { at: 11000, mock: phoneAnswerNashi      },
        { at: 14000, mock: phoneFinished         },
    ]
})