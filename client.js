// dsh-checkpoint 薄装载入口：断点协议本身由办事者在任务中显式调用 CLI 维护，
// 本插件不做事件钩子——只声明装载并打印 loaded 日志，保持可发现性。
export const name = 'dsh-checkpoint'

export function apply(ctx) {
  console.log('[dsh-checkpoint] loaded: task checkpoint protocol (CLI-driven, no auto-resume)')
}
