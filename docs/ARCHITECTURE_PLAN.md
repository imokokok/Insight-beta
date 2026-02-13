# Oracle Monitor - Feature-Based Architecture

## 一、架构说明

本项目采用 **Feature-Based Architecture（基于功能的架构）** 进行组织。

### 架构原则

- 每个功能域 = 自包含单元（组件 + Hook + 服务 + 类型）
- 相关代码放在一起（Colocation）
- 渐进式迁移，保持向后兼容

---

## 二、目录结构

```
src/
├── app/                          # Next.js App Router
│
├── features/                     # ⭐ 功能模块（新结构）
│   ├── oracle/
│   │   ├── components/          # ✅ Oracle 组件
│   │   ├── hooks/               # ✅ Oracle hooks
│   │   ├── services/            # ✅ Oracle 服务
│   │   └── index.ts
│   │
│   ├── alert/
│   │   ├── components/          # ✅ Alert 组件
│   │   ├── hooks/               # ✅ Alert hooks
│   │   ├── services/            # ✅ Alert 服务
│   │   └── index.ts
│   │
│   ├── security/
│   │   ├── components/          # ✅ Security 组件
│   │   ├── services/            # ✅ Security 服务
│   │   └── index.ts
│   │
│   ├── gas/
│   │   ├── components/           # ✅ Gas 组件
│   │   ├── hooks/               # ✅ Gas hooks
│   │   ├── services/            # ✅ Gas 服务
│   │   └── index.ts
│   │
│   ├── cross-chain/
│   │   ├── components/           # ✅ Cross-chain 组件
│   │   ├── hooks/               # ✅ Cross-chain hooks
│   │   └── index.ts
│   │
│   ├── wallet/
│   │   ├── components/           # ✅ Wallet 组件
│   │   ├── hooks/               # ✅ Wallet hooks
│   │   └── index.ts
│   │
│   ├── dashboard/
│   │   ├── components/          # ✅ Dashboard 组件
│   │   ├── hooks/               # ✅ Dashboard hooks
│   │   └── index.ts
│   │
│   ├── dispute/
│   │   ├── components/           # ✅ Dispute 组件
│   │   ├── hooks/               # ✅ Dispute hooks
│   │   └── index.ts
│   │
│   ├── protocol/
│   │   ├── components/           # ✅ Protocol 组件
│   │   └── index.ts
│   │
│   ├── monitoring/
│   │   ├── components/           # ✅ Monitoring 组件
│   │   ├── services/            # ✅ Monitoring 服务
│   │   └── index.ts
│   │
│   ├── comparison/
│   │   ├── components/          # ✅ Comparison 组件
│   │   ├── hooks/               # ✅ Comparison hooks
│   │   └── index.ts
│   │
│   ├── assertion/
│   │   ├── components/           # ✅ Assertion 组件
│   │   └── index.ts
│   │
│   ├── onboarding/
│   │   ├── components/           # ✅ Onboarding 组件
│   │   └── index.ts
│   │
│   ├── pwa/
│   │   ├── components/           # ✅ PWA 组件
│   │   └── index.ts
│   │
│   └── common/                   # 通用功能模块
│
├── components/                   # 通用组件（保留）
│   ├── common/
│   ├── ui/
│   ├── charts/
│   └── security/
│
├── hooks/                        # 全局 hooks（保留）
│   └── index.ts
│
├── services/                     # 全局服务（保留）
│   ├── oracle/
│   ├── alert/
│   ├── gas/
│   ├── security/
│   └── monitoring/
│
├── lib/                          # 基础设施
├── types/                        # 共享类型
├── shared/                       # 共享工具
└── config/                       # 配置
```

---

## 三、迁移状态

| 功能域      | components | hooks | services | 状态    |
| ----------- | ---------- | ----- | -------- | ------- |
| Oracle      | ✅         | ✅    | ✅       | ✅ 完成 |
| Alert       | ✅         | ✅    | ✅       | ✅ 完成 |
| Security    | ✅         | -     | ✅       | ✅ 完成 |
| Gas         | ✅         | ✅    | ✅       | ✅ 完成 |
| Cross-chain | ✅         | ✅    | -        | ✅ 完成 |
| Wallet      | ✅         | ✅    | -        | ✅ 完成 |
| Dashboard   | ✅         | ✅    | -        | ✅ 完成 |
| Dispute     | ✅         | ✅    | -        | ✅ 完成 |
| Protocol    | ✅         | -     | -        | ✅ 完成 |
| Monitoring  | ✅         | -     | ✅       | ✅ 完成 |
| Comparison  | ✅         | ✅    | -        | ✅ 完成 |
| Assertion   | ✅         | -     | -        | ✅ 完成 |
| Onboarding  | ✅         | -     | -        | ✅ 完成 |
| PWA         | ✅         | -     | -        | ✅ 完成 |

---

## 四、使用说明

### 新功能开发

新增功能时，使用 `features/[domain]/` 结构：

```
src/features/
└── new-feature/
    ├── components/
    ├── hooks/
    ├── services/
    ├── types/
    └── index.ts
```

### 现有代码

- 原有 `components/features/*` 保持不变（向后兼容）
- 原有 `hooks/*` 保持不变（向后兼容）
- 原有 `services/*` 保持不变（向后兼容）

---

## 五、架构优势

1. **可维护性** - 新人可快速定位代码
2. **可扩展性** - 新功能有明确位置
3. **可测试性** - 模块内可独立测试
4. **团队协作** - 不同团队负责不同 features/

---

## 六、依赖规则

```
app/ → features/ → hooks/ → lib/
              ↓
         services/
              ↓
           shared/
```

**禁止**：

- features/ → app/
- features/A → features/B
- 通用 hooks → features/
