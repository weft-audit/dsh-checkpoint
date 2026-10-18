// 验收：两步任务完成一步后中断 → 恢复只出剩余一步；恢复不自动执行。
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createNew, markDone, readOne, resumePlan, update } from '../src/checkpoint.mjs'
import { findFiles } from '../src/checkpoint.mjs'

let fails = 0
function check(name, cond) {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}`)
  if (!cond) fails += 1
}

const dir = mkdtempSync(join(tmpdir(), 'ckpt-'))
const file = createNew(dir, '两步任务', '步骤1：读文件\n步骤2：写报告')
check('建断点文件存在', existsSync(file))
check('list 可发现断点文件', findFiles(dir, '两步任务').length === 1)

// 模拟：完成第 1 步后中断（只更新断点，不执行第 2 步）
update(dir, '两步任务', { doneText: '第1步 读文件', nextText: '第2步 写报告' })
const one = readOne(dir, '两步任务')
check('已完成含第1步', one.doneItems.includes('第1步 读文件'))
check('下一步=第2步', one.next === '第2步 写报告')

const plan = resumePlan(dir, '两步任务')
check('恢复只出剩余一步', plan.remaining.length === 1 && plan.remaining[0] === '第2步 写报告')
check('恢复不自动执行（plan 只读）', plan.status === '进行中' && !existsSync(join(dir, '第2步产物')))

markDone(dir, '两步任务')
check('done 后状态=已完成', readOne(dir, '两步任务').status === '已完成')

rmSync(dir, { recursive: true, force: true })
if (fails > 0) {
  console.error(`CHECKPOINT_TESTS_FAIL count=${fails}`)
  process.exit(1)
}
console.log('CHECKPOINT_TESTS_PASS')
