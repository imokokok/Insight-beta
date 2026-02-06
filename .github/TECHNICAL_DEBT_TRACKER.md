# 技术债务追踪

使用 GitHub Projects 追踪技术债务。

## 债务分类

| 分类                | 优先级 |
| ------------------- | ------ |
| `type:security`     | 高     |
| `type:performance`  | 中     |
| `type:code`         | 中     |
| `type:dependency`   | 中     |
| `type:architecture` | 低     |

## 优先级

- **Critical** - 立即修复（安全问题）
- **High** - 尽快修复
- **Medium** - 计划修复
- **Low** - 可选修复

## 模板

```markdown
## 描述

[技术债务简述]

## 影响

- [ ] 性能
- [ ] 安全
- [ ] 可维护性

## 当前状态

[当前实现]

## 期望状态

[理想实现]
```
