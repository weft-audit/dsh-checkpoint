// 用法：
//   node dsh_checkpoint.mjs new <任务名> <任务全文> [--dir DIR]
//   node dsh_checkpoint.mjs update <任务名> --done "<本步摘要>" --next "<下步摘要>" [--dir DIR]
//   node dsh_checkpoint.mjs done <任务名> [--dir DIR]
//   node dsh_checkpoint.mjs plan <任务名> [--dir DIR]   # 恢复视图（只读，不执行）
import { createNew, markDone, resumePlan, update } from './src/checkpoint.mjs'
import { findFiles } from './src/checkpoint.mjs'
import { readFileSync } from 'node:fs'

const args = process.argv.slice(2)
const dirFlag = args.indexOf('--dir')
const dir = dirFlag >= 0 ? args[dirFlag + 1] : (process.env.DSH_HOME || '.') + '/_断点'
const rest = dirFlag >= 0 ? args.filter((_, i) => i !== dirFlag && i !== dirFlag + 1) : args
const [cmd, name] = rest

if (cmd === 'new') {
  const text = rest.slice(2).join(' ')
  const file = createNew(dir, name, text)
  console.log('已建断点：' + file)
} else if (cmd === 'update') {
  let doneText = null
  let nextText = null
  for (let i = 2; i < rest.length; i++) {
    if (rest[i] === '--done') { doneText = rest[++i] ?? '' }
    if (rest[i] === '--next') { nextText = rest[++i] ?? '' }
  }
  if (doneText === null && nextText === null) {
    console.error('update 需要 --done 或 --next')
    process.exit(1)
  }
  const files = update(dir, name, { doneText, nextText })
  console.log('已更新：' + (files ?? ['（找不到断点）']).join(', '))
} else if (cmd === 'done') {
  const files = markDone(dir, name)
  console.log('已标完成：' + (files.length ? files.join(', ') : '（找不到断点）'))
} else if (cmd === 'plan') {
  const plan = resumePlan(dir, name)
  console.log(JSON.stringify(plan, null, 2))
  process.exit(plan ? 0 : 1)
} else if (cmd === 'list') {
  const files = findFiles(dir, name || '')
  if (files.length === 0) {
    console.log('暂无断点')
  } else {
    for (const f of files) {
      const c = readFileSync(f, 'utf-8')
      const status = (c.match(/^状态：(.+)$/m) || [])[1]?.trim() ?? '未知'
      console.log(`${f} ${status}`)
    }
  }
} else {
  console.error('用法见文件头注释')
  process.exit(2)
}
