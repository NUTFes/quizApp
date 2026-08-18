import { useEffect, useState } from "react"
import type { AdminState, MonitorState, ViewerState } from "../types"

function useEventState<Type>(testSteps: {at:number, mock:Type}[]) :Type | null{
    const [state, setState] = useState<Type | null>(null)
    const ts:ReturnType<typeof setTimeout>[] = []
    useEffect(() =>{
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
    }, [])
    return state
}

export const useAdminState = () => useEventState<AdminState>()
export const useMonitorState = () => useEventState<MonitorState>()
export const useViewerState = () => useEventState<ViewerState>()