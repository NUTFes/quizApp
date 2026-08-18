import { useState } from "react"
import type { AdminState, MonitorState, ViewerState } from "../types"

function useEventState<Type>() :Type | null{
    const [state, setState] = useState<Type | null>(null)
    return state
}

export const useAdminState = () => useEventState<AdminState>()
export const useMonitorState = () => useEventState<MonitorState>()
export const useViewerState = () => useEventState<ViewerState>()