# UI 交互与可用性规范

> 统一 Loading、Error 状态以及表格列表的样式规范

---

## 1. Loading & Error 状态一致性

### 1.1 卡片级数据加载

**规范**：使用 Skeleton 占位，保持卡片尺寸不变

```tsx
// ✅ 正确示例
<CardEnhanced>
  {isLoading ? (
    <CardSkeleton />
  ) : (
    <CardContent>
      <StatValue value={data.value} />
    </CardContent>
  )}
</CardEnhanced>;

// CardSkeleton 实现
function CardSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <Skeleton className="h-4 w-20" /> {/* 标题占位 */}
      <Skeleton className="h-8 w-24" /> {/* 数值占位 */}
      <Skeleton className="h-3 w-16" /> {/* 副标题占位 */}
    </div>
  );
}
```

**原则**：

- Skeleton 高度与实际内容一致，避免布局跳动
- 使用 `animate-pulse` 提供视觉反馈
- 多个卡片同时加载时，保持统一节奏

### 1.2 全页级错误

**规范**：顶部统一使用固定样式的 Error Banner

```tsx
// ✅ 正确示例
export default function Page() {
  const { data, isError, error, refetch } = useQuery({...});

  if (isError) {
    return (
      <div className="space-y-4">
        <ErrorBanner
          error={error}
          onRetry={refetch}
          title="加载失败"
        />
        {/* 页面其他部分可以保持占位或空状态 */}
      </div>
    );
  }

  return <PageContent data={data} />;
}

// ErrorBanner 组件
interface ErrorBannerProps {
  error: Error | null;
  onRetry?: () => void;
  title?: string;
  className?: string;
}

function ErrorBanner({ error, onRetry, title = "加载失败", className }: ErrorBannerProps) {
  return (
    <div className={cn(
      "rounded-lg border border-red-200 bg-red-50 p-4",
      className
    )}>
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-medium text-red-900">{title}</h3>
          <p className="mt-1 text-sm text-red-700">
            {error?.message || "请检查网络连接后重试"}
          </p>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="mt-3 bg-white hover:bg-red-100"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              重试
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
```

**原则**：

- 统一使用红色主题（red-50 背景，red-600 图标）
- 必须包含错误描述和重试按钮
- 固定在页面顶部，不遮挡主要内容区域

### 1.3 局部加载失败

**规范**：在组件内部使用"重试"按钮，而不是只显示报错文案

```tsx
// ✅ 正确示例
function DataTable({ queryKey }: { queryKey: string }) {
  const { data, isError, error, refetch, isFetching } = useQuery({
    queryKey: [queryKey],
    queryFn: fetchData,
  });

  if (isError) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">加载数据失败</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="mt-4"
        >
          {isFetching ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          重试
        </Button>
      </div>
    );
  }

  return <Table data={data} />;
}

// ❌ 错误示例 - 只显示文案，没有重试按钮
if (isError) {
  return <p className="text-red-500">加载失败</p>;
}
```

**原则**：

- 局部错误使用灰色主题（gray-50 背景），区别于全页错误的红色
- 必须提供重试按钮
- 重试时显示 loading 状态

---

## 2. 密集模式下的表格 & 列表样式

### 2.1 设计目标

针对 `/alerts`, `/disputes`, `/audit`, `/watchlist` 等列表型页面，提供两种显示模式：

- **普通模式**：偏产品化，信息密度适中，适合新手
- **专业模式**：信息密度高，适合运维人员快速扫描

### 2.2 专业模式规范

```tsx
// 专业模式表格样式
const denseTableStyles = {
  // 行高降低 10-20%
  row: 'h-8 py-1', // 普通模式是 h-12 py-3

  // 字体缩小
  cell: 'text-xs',

  // 减少内边距
  padding: 'px-2',

  // 隐藏装饰性元素
  hideDecorations: true,
};

// 专业模式列表样式
const denseListStyles = {
  // 行高降低
  item: 'py-2', // 普通模式是 py-4

  // 字体
  text: 'text-xs',

  // 隐藏次要信息
  showSecondary: false,
};
```

### 2.3 颜色与强调规范

```tsx
// 重要列的颜色强调
const columnHighlight = {
  severity: {
    critical: 'bg-red-100 text-red-800 font-bold',
    warning: 'bg-amber-100 text-amber-800 font-bold',
    info: 'bg-blue-100 text-blue-800',
  },
  status: {
    active: 'text-green-600 font-semibold',
    pending: 'text-amber-600 font-semibold',
    resolved: 'text-gray-500',
  },
  protocol: 'font-medium text-purple-700',
  time: 'text-gray-500 font-mono text-[11px]',
};
```

### 2.4 模式切换组件

```tsx
// ViewModeToggle 组件
interface ViewModeToggleProps {
  mode: 'normal' | 'dense';
  onChange: (mode: 'normal' | 'dense') => void;
}

function ViewModeToggle({ mode, onChange }: ViewModeToggleProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-white p-1">
      <button
        onClick={() => onChange('normal')}
        className={cn(
          'flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors',
          mode === 'normal' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-100',
        )}
        title="普通模式 - 适合查看详细信息"
      >
        <LayoutList className="h-3.5 w-3.5" />
        普通
      </button>
      <button
        onClick={() => onChange('dense')}
        className={cn(
          'flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors',
          mode === 'dense' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-100',
        )}
        title="专业模式 - 高密度信息展示"
      >
        <Rows3 className="h-3.5 w-3.5" />
        专业
      </button>
    </div>
  );
}
```

### 2.5 完整示例：Alerts 表格

```tsx
function AlertsTable({ alerts }: { alerts: Alert[] }) {
  const [viewMode, setViewMode] = useState<'normal' | 'dense'>('normal');
  const isDense = viewMode === 'dense';

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">告警列表</h2>
        <ViewModeToggle mode={viewMode} onChange={setViewMode} />
      </div>

      {/* 表格 */}
      <Table>
        <TableHeader>
          <TableRow className={isDense ? 'h-8' : 'h-12'}>
            <TableHead className={isDense ? 'px-2 text-xs' : ''}>级别</TableHead>
            <TableHead className={isDense ? 'px-2 text-xs' : ''}>协议</TableHead>
            <TableHead className={isDense ? 'px-2 text-xs' : ''}>描述</TableHead>
            {!isDense && <TableHead>状态</TableHead>}
            <TableHead className={isDense ? 'px-2 text-xs' : ''}>时间</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alerts.map((alert) => (
            <TableRow
              key={alert.id}
              className={cn(isDense ? 'h-8 py-1' : 'h-12 py-3', 'cursor-pointer hover:bg-gray-50')}
            >
              {/* Severity - 始终高亮 */}
              <TableCell
                className={cn(
                  isDense ? 'px-2 py-1' : '',
                  alert.severity === 'critical' && 'bg-red-100 font-bold text-red-800',
                  alert.severity === 'warning' && 'bg-amber-100 font-bold text-amber-800',
                )}
              >
                {isDense ? (
                  <span className="text-xs">{alert.severity[0].toUpperCase()}</span>
                ) : (
                  <StatusBadge status={alert.severity} />
                )}
              </TableCell>

              {/* Protocol - 专业模式加粗 */}
              <TableCell className={cn(isDense ? 'px-2 text-xs font-medium text-purple-700' : '')}>
                {alert.protocol}
              </TableCell>

              {/* Description */}
              <TableCell className={isDense ? 'max-w-[200px] truncate px-2 text-xs' : ''}>
                {alert.message}
              </TableCell>

              {/* Status - 普通模式显示 */}
              {!isDense && (
                <TableCell>
                  <StatusBadge status={alert.status} />
                </TableCell>
              )}

              {/* Time - 专业模式使用等宽字体 */}
              <TableCell className={cn(isDense ? 'px-2 font-mono text-[11px] text-gray-500' : '')}>
                {formatTime(alert.timestamp, isDense)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// 时间格式化
function formatTime(timestamp: string, isDense: boolean): string {
  if (isDense) {
    // 专业模式：简洁格式
    return dayjs(timestamp).format('HH:mm');
  }
  // 普通模式：完整格式
  return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss');
}
```

### 2.6 应用到各页面

| 页面         | 普通模式特点           | 专业模式特点                             |
| ------------ | ---------------------- | ---------------------------------------- |
| `/alerts`    | 显示完整描述、状态标签 | 行高压缩，仅显示关键列，时间简化为 HH:mm |
| `/disputes`  | 显示证据摘要、投票进度 | 紧凑布局，隐藏装饰图标，强调金额和状态   |
| `/audit`     | 显示完整操作描述       | 单行显示，使用图标代替文字标签           |
| `/watchlist` | 显示价格走势图         | 纯列表形式，突出涨跌幅                   |

---

## 3. 实现建议

### 3.1 创建通用组件

建议创建以下通用组件放在 `src/components/ui/` 下：

```
src/components/ui/
├── error-banner.tsx      # 统一错误横幅
├── loading-states.tsx    # 各种 skeleton 组件
├── view-mode-toggle.tsx  # 普通/专业模式切换
└── dense-table.tsx       # 密集模式表格封装
```

### 3.2 状态管理

视图模式状态建议：

- 使用 localStorage 保存用户偏好
- 支持全局设置或按页面设置

```tsx
// hooks/useViewMode.ts
export function useViewMode(pageId: string) {
  const [globalMode, setGlobalMode] = useLocalStorage<'normal' | 'dense'>('view-mode', 'normal');
  const [pageMode, setPageMode] = useLocalStorage<'normal' | 'dense' | 'inherit'>(
    `view-mode-${pageId}`,
    'inherit',
  );

  const mode = pageMode === 'inherit' ? globalMode : pageMode;

  return { mode, setMode: setPageMode, globalMode, setGlobalMode };
}
```

### 3.3 渐进式实现

建议按以下顺序实现：

1. **Phase 1**：统一 Error Banner 和 Skeleton 组件
2. **Phase 2**：在 Dashboard 页面应用 Loading/Error 规范
3. **Phase 3**：在 Alerts 页面实现普通/专业模式切换
4. **Phase 4**：推广到 Disputes、Audit、Watchlist 页面
