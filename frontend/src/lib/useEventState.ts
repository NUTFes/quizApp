// VITE_USE_MOCK の値に応じて、Vite がこの参照先をビルド時に差し替える。
// これにより、本番成果物にはモック配信の処理自体が含まれない。
export { useAdminState, useMonitorState, useViewerState } from './useEventStateProvider'
