# dsh-checkpoint

任务断点协议（移植自 Jarvis checkpoint.py，语义一致）：纯文本断点文件，
每子步骤一更新；恢复时 `plan` 只返回「已完成 + 剩余下一步」。

## 禁用

**不自动执行恢复**：plan 只读，执行剩余步骤必须由人/会话显式发起。

## 测试

```bash
node --test test/checkpoint.test.mjs
```
