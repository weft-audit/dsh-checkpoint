// dsh-checkpoint 断点协议（移植自 Jarvis checkpoint.py，语义一致）：
// 纯文本断点文件：状态 / 任务全文 / 已完成（每子步一行 "- …"）/ 下一步 / 更新时间。
// 恢复不自动执行：plan 只返回「已完成 + 剩余下一步」，执行仍由人/会话决定。
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export function slug(name) {
  const s = String(name).replace(/[\\/:*?"<>|\s]+/g, '-').replace(/^-+|-+$/g, '')
  return s || '未命名'
}

export function stamp() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export function fileStamp() {
  return stamp().slice(0, 10).replace(/-/g, '') + '-' + stamp().slice(11, 16).replace(':', '')
}

export function findFiles(dir, name) {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md') && f.includes(slug(name)))
    .map((f) => join(dir, f))
}

export function createNew(dir, name, text) {
  mkdirSync(dir, { recursive: true })
  const file = join(dir, `任务-${fileStamp()}-${slug(name)}.md`)
  const body = [
    `# 任务断点：${name}`,
    '',
    '状态：进行中',
    '',
    `任务全文：${text}`,
    '',
    '已完成：无',
    '',
    '下一步：开始执行',
    '',
    '落盘产物：',
    '',
    `更新时间：${stamp()}`,
    '',
  ].join('\n')
  writeFileSync(file, body, 'utf-8')
  return file
}

export function update(dir, name, { doneText, nextText } = {}) {
  const files = findFiles(dir, name)
  if (files.length === 0) return null
  const changed = []
  for (const f of files) {
    const lines = readFileSync(f, 'utf-8').split('\n')
    if (doneText) {
      const doneIdx = lines.findIndex((l) => l.startsWith('已完成：'))
      if (doneIdx >= 0) {
        if (lines[doneIdx].trim() === '已完成：无') lines[doneIdx] = '已完成：'
        const nextIdx = lines.findIndex((l) => l.startsWith('下一步：'))
        const insertAt = nextIdx >= 0 ? nextIdx : doneIdx + 1
        lines.splice(insertAt, 0, '- ' + doneText)
      }
    }
    if (nextText) {
      const nextIdx = lines.findIndex((l) => l.startsWith('下一步：'))
      if (nextIdx >= 0) lines[nextIdx] = '下一步：' + nextText
    }
    const tsIdx = lines.findIndex((l) => l.startsWith('更新时间：'))
    if (tsIdx >= 0) lines[tsIdx] = '更新时间：' + stamp()
    writeFileSync(f, lines.join('\n'), 'utf-8')
    changed.push(f)
  }
  return changed
}

export function markDone(dir, name) {
  const files = findFiles(dir, name)
  for (const f of files) {
    let c = readFileSync(f, 'utf-8')
    c = c.replace(/^状态：.+$/m, '状态：已完成')
    c = c.replace(/^更新时间：.+$/m, '更新时间：' + stamp())
    writeFileSync(f, c, 'utf-8')
  }
  return files
}

export function readOne(dir, name) {
  const files = findFiles(dir, name)
  if (files.length === 0) return null
  const c = readFileSync(files[0], 'utf-8')
  const status = (c.match(/^状态：(.+)$/m) || [])[1]?.trim() ?? '未知'
  const next = (c.match(/^下一步：(.+)$/m) || [])[1]?.trim() ?? ''
  const lines = c.split('\n')
  const doneIdx = lines.findIndex((l) => l.startsWith('已完成：'))
  const doneItems = []
  if (doneIdx >= 0) {
    for (let i = doneIdx + 1; i < lines.length; i++) {
      const t = lines[i].trim()
      if (t.startsWith('- ')) doneItems.push(t.slice(2))
      else if (t !== '') break
    }
  }
  return { status, next, doneItems, file: files[0] }
}

// 恢复视图：只返回剩余步骤（下一步），不执行任何步骤。
export function resumePlan(dir, name) {
  const one = readOne(dir, name)
  if (!one) return null
  return { done: one.doneItems, remaining: one.next && one.next !== '开始执行' ? [one.next] : [], status: one.status }
}
