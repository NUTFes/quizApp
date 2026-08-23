import type { MonitorState, ViewerState } from '../../../types'

/**
 * モニタ向けモックから joinUrl を除いて、スマホ向けにする。
 * スマホ向けは「モニタ向けから joinUrl を除いた形。それ以外は完全に同一」
 * と定められている(API仕様書 §2.2)。手で2セット持つと片方だけ直して
 * ずれるため、モニタ向けから導出する。
 */
export function toPhone({ joinUrl: _joinUrl, ...rest }: MonitorState): ViewerState {
  return rest
}
