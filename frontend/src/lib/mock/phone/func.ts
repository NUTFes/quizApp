import { MonitorState, ViewerState } from "../../../types";

export function toPhone({ joinUrl: _joinUrl, ...rest }: MonitorState): ViewerState {
  return rest
}