# UI Interaction and Usability Guidelines

> Unified Loading, Error states, and table/list styling guidelines

---

## 1. Loading & Error State Consistency

### 1.1 Card-Level Data Loading

**Standard**: Use Skeleton placeholders, keep card size unchanged

```tsx
// ✅ Correct example
<CardEnhanced>
  {isLoading ? (
    <CardSkeleton />
  ) : (
    <CardContent>
      <StatValue value={data.value} />
    </CardContent>
  )}
</CardEnhanced>;

// CardSkeleton implementation
function CardSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <Skeleton className="h-4 w-20" /> {/* Title placeholder */}
      <Skeleton className="h-8 w-24" /> {/* Value placeholder */}
      <Skeleton className="h-3 w-16" /> {/* Subtitle placeholder */}
    </div>
  );
}
```

**Principles**:

- Skeleton height should match actual content to avoid layout shift
- Use `animate-pulse` for visual feedback
- When multiple cards load simultaneously, maintain consistent timing

### 1.2 Full Page Errors

**Standard**: Use Error Banner with unified styling at the top

```tsx
// ✅ Correct example
export default function Page() {
  const { data, isError, error, refetch } = useQuery({...});

  if (isError) {
    return (
      <div className="space-y-4">
        <ErrorBanner
          error={error}
          onRetry={refetch}
          title="Load Failed"
        />
        {/* Page other content can remain placeholder or empty state */}
      </div>
    );
  }

  return <PageContent data={data} />;
}

// ErrorBanner component
interface ErrorBannerProps {
  error: Error | null;
  onRetry?: () => void;
  title?: string;
  className?: string;
}

function ErrorBanner({ error, onRetry, title = "Load Failed", className }: ErrorBannerProps) {
  return (
    <div className={cn(
      "rounded-lg border border-red-500/30 bg-red-500/10 p-4",
      className
    )}>
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-medium text-foreground">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {error?.message || "Please check your network connection and try again"}
          </p>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="mt-3"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Principles**:

- Use red theme consistently (red-500/10 background, red-400 icon)
- Must include error description and retry button
- Fixed at page top, should not block main content area

### 1.3 Partial Load Failure

**Standard**: Use "Retry" button within the component, not just error text

```tsx
// ✅ Correct example
function DataTable({ queryKey }: { queryKey: string }) {
  const { data, isError, error, refetch, isFetching } = useQuery({
    queryKey: [queryKey],
    queryFn: fetchData,
  });

  if (isError) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-8 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">Failed to load data</p>
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
          Retry
        </Button>
      </div>
    );
  }

  return <Table data={data} />;
}

// ❌ Wrong example - only shows text, no retry button
if (isError) {
  return <p className="text-red-400">Load failed</p>;
}
```

**Principles**:

- Partial errors use muted theme (bg-muted/30), distinguish from full page errors (red)
- Must provide retry button
- Show loading state when retrying

---

## 2. Dense Mode Table & List Styling

### 2.1 Design Goals

For list-type pages like `/alerts`, `/disputes`, `/audit`, `/watchlist`, provide two display modes:

- **Normal Mode**: Product-oriented, moderate information density, suitable for beginners
- **Professional Mode**: High information density, suitable for operators to quickly scan

### 2.2 Professional Mode Standards

```tsx
// Professional mode table styles
const denseTableStyles = {
  // Reduce row height by 10-20%
  row: 'h-8 py-1', // Normal mode is h-12 py-3

  // Smaller font
  cell: 'text-xs',

  // Reduce padding
  padding: 'px-2',

  // Hide decorative elements
  hideDecorations: true,
};

// Professional mode list styles
const denseListStyles = {
  // Reduce row height
  item: 'py-2', // Normal mode is py-4

  // Font
  text: 'text-xs',

  // Hide secondary info
  showSecondary: false,
};
```

### 2.3 Color and Emphasis Standards

```tsx
// Column highlight colors - Using semantic colors
const columnHighlight = {
  severity: {
    critical: 'bg-red-500/20 text-red-400 font-bold',
    warning: 'bg-amber-500/20 text-amber-400 font-bold',
    info: 'bg-blue-500/20 text-blue-400',
  },
  status: {
    active: 'text-emerald-400 font-semibold',
    pending: 'text-amber-400 font-semibold',
    resolved: 'text-muted-foreground',
  },
  protocol: 'font-medium text-primary',
  time: 'text-muted-foreground font-mono text-[11px]',
};
```

### 2.4 Mode Toggle Component

```tsx
// ViewModeToggle component
interface ViewModeToggleProps {
  mode: 'normal' | 'dense';
  onChange: (mode: 'normal' | 'dense') => void;
}

function ViewModeToggle({ mode, onChange }: ViewModeToggleProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-1">
      <button
        onClick={() => onChange('normal')}
        className={cn(
          'flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors',
          mode === 'normal' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-muted',
        )}
        title="Normal Mode - Suitable for viewing details"
      >
        <LayoutList className="h-3.5 w-3.5" />
        Normal
      </button>
      <button
        onClick={() => onChange('dense')}
        className={cn(
          'flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors',
          mode === 'dense' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-muted',
        )}
        title="Professional Mode - High density information"
      >
        <Rows3 className="h-3.5 w-3.5" />
        Dense
      </button>
    </div>
  );
}
```

### 2.5 Complete Example: Alerts Table

```tsx
function AlertsTable({ alerts }: { alerts: Alert[] }) {
  const [viewMode, setViewMode] = useState<'normal' | 'dense'>('normal');
  const isDense = viewMode === 'dense';

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Alerts List</h2>
        <ViewModeToggle mode={viewMode} onChange={setViewMode} />
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow className={isDense ? 'h-8' : 'h-12'}>
            <TableHead className={isDense ? 'px-2 text-xs' : ''}>Severity</TableHead>
            <TableHead className={isDense ? 'px-2 text-xs' : ''}>Protocol</TableHead>
            <TableHead className={isDense ? 'px-2 text-xs' : ''}>Description</TableHead>
            {!isDense && <TableHead>Status</TableHead>}
            <TableHead className={isDense ? 'px-2 text-xs' : ''}>Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alerts.map((alert) => (
            <TableRow
              key={alert.id}
              className={cn(isDense ? 'h-8 py-1' : 'h-12 py-3', 'cursor-pointer hover:bg-muted/50')}
            >
              {/* Severity - Always highlighted */}
              <TableCell
                className={cn(
                  isDense ? 'px-2 py-1' : '',
                  alert.severity === 'critical' && 'bg-red-500/20 font-bold text-red-400',
                  alert.severity === 'warning' && 'bg-amber-500/20 font-bold text-amber-400',
                )}
              >
                {isDense ? (
                  <span className="text-xs">{alert.severity[0].toUpperCase()}</span>
                ) : (
                  <StatusBadge status={alert.severity} />
                )}
              </TableCell>

              {/* Protocol - Bold in dense mode */}
              <TableCell className={cn(isDense ? 'px-2 text-xs font-medium text-primary' : '')}>
                {alert.protocol}
              </TableCell>

              {/* Description */}
              <TableCell className={isDense ? 'max-w-[200px] truncate px-2 text-xs' : ''}>
                {alert.message}
              </TableCell>

              {/* Status - Show in normal mode */}
              {!isDense && (
                <TableCell>
                  <StatusBadge status={alert.status} />
                </TableCell>
              )}

              {/* Time - Monospace in dense mode */}
              <TableCell className={cn(isDense ? 'px-2 font-mono text-[11px] text-muted-foreground' : '')}>
                {formatTime(alert.timestamp, isDense)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// Time formatting
function formatTime(timestamp: string, isDense: boolean): string {
  if (isDense) {
    // Dense mode: compact format
    return dayjs(timestamp).format('HH:mm');
  }
  // Normal mode: full format
  return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss');
}
```

### 2.6 Apply to Pages

| Page         | Normal Mode Features              | Professional Mode Features                                         |
| ------------ | --------------------------------- | ------------------------------------------------------------------ |
| `/alerts`    | Full description, status badge    | Compressed rows, only key columns, time simplified to HH:mm        |
| `/disputes`  | Evidence summary, voting progress | Compact layout, hide decorative icons, emphasize amount and status |
| `/audit`     | Full operation description        | Single line, use icons instead of text labels                      |
| `/watchlist` | Price trend chart                 | Pure list form, emphasize price change                             |

---

## 3. Color System Guidelines

### 3.1 Semantic Colors (Recommended)

This project uses a dark theme. Always use semantic colors instead of hardcoded colors:

| Semantic Color | Usage | CSS Variable |
|---------------|-------|--------------|
| `bg-background` | Page background | `--background` |
| `bg-card` | Card/Panel background | `--color-card` |
| `bg-muted` | Secondary background | `--color-muted` |
| `text-foreground` | Primary text | `--color-foreground` |
| `text-muted-foreground` | Secondary text | `--color-muted-foreground` |
| `border-border` | Borders | `--color-border` |
| `text-primary` | Primary accent | `--color-primary` |

### 3.2 Usage Examples

```tsx
// ✅ Correct - Using semantic colors
<div className="bg-card border-border">
  <h1 className="text-foreground">Title</h1>
  <p className="text-muted-foreground">Description</p>
</div>

// ❌ Wrong - Using hardcoded colors
<div className="bg-slate-900">
  <h1 className="text-white">Title</h1>
  <p className="text-slate-400">Description</p>
</div>
```

### 3.3 Status Colors

For status indicators, use these patterns:

```tsx
// Success/Active
<span className="text-emerald-400">Active</span>

// Warning/Pending
<span className="text-amber-400">Pending</span>

// Error/Critical
<span className="text-red-400">Error</span>

// Info
<span className="text-blue-400">Info</span>
```

### 3.4 Background Variations

```tsx
// Error backgrounds
<div className="bg-red-500/10">Error background</div>

// Warning backgrounds
<div className="bg-amber-500/10">Warning background</div>

// Success backgrounds
<div className="bg-emerald-500/10">Success background</div>

// Info backgrounds
<div className="bg-blue-500/10">Info background</div>
```

---

## 4. Implementation Suggestions

### 4.1 Create Common Components

Recommended to create the following common components in `src/components/ui/`:

```
src/components/ui/
├── error-banner.tsx      # Unified error banner
├── loading-states.tsx   # Various skeleton components
├── view-mode-toggle.tsx # Normal/Professional mode toggle
└── dense-table.tsx      # Dense mode table wrapper
```

### 4.2 State Management

View mode state suggestions:

- Use localStorage to save user preferences
- Support global settings or per-page settings

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

### 4.3 Progressive Implementation

Recommended implementation order:

1. **Phase 1**: Unify Error Banner and Skeleton components
2. **Phase 2**: Apply Loading/Error standards on Dashboard page
3. **Phase 3**: Implement Normal/Professional mode toggle on Alerts page
4. **Phase 4**: Expand to Disputes, Audit, Watchlist pages
