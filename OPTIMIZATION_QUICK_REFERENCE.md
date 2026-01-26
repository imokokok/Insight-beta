# Insight优化功能快速参考指南

## 1. 增强的错误处理

### 新增功能
- 更详细的错误分类（13种错误类型）
- 用户友好的错误提示
- 恢复建议和文档链接
- 错误严重程度分级

### 使用示例

```typescript
import { normalizeWalletError } from '@/lib/errors/walletErrors';

try {
  // 执行钱包操作
} catch (error) {
  const errorDetail = normalizeWalletError(error);
  
  // 显示错误提示
  console.log(`错误: ${errorDetail.userMessage}`);
  console.log(`建议: ${errorDetail.recoveryAction}`);
  console.log(`文档: ${errorDetail.documentationLink}`);
}
```

### 错误类型
- `WALLET_NOT_FOUND` - 钱包未安装
- `USER_REJECTED` - 用户拒绝交易
- `REQUEST_PENDING` - 请求处理中
- `CHAIN_NOT_ADDED` - 网络未添加
- `WRONG_NETWORK` - 错误的网络
- `INSUFFICIENT_FUNDS` - 余额不足
- `GAS_ESTIMATION_FAILED` - Gas估算失败
- `TRANSACTION_FAILED` - 交易失败
- `CONTRACT_NOT_FOUND` - 合约未找到
- `NETWORK_ERROR` - 网络错误
- `TIMEOUT` - 请求超时
- `UNKNOWN` - 未知错误

### UI组件
```typescript
import { EnhancedErrorDisplay, TransactionErrorModal } from '@/components/features/common/EnhancedErrorDisplay';

// 页面级别错误显示
<EnhancedErrorDisplay 
  error={error}
  title="操作失败"
  showDetails={true}
  onRetry={retryHandler}
  onContactSupport={contactHandler}
/>

// 模态框形式
<TransactionErrorModal
  isOpen={isOpen}
  onClose={closeHandler}
  error={error}
  operationName="创建断言"
  onRetry={retryHandler}
/>
```

## 2. 移动端优化

### 新增功能
- 响应式断点系统
- 移动端专用导航
- 触摸优化按钮
- 响应式表格
- 加载骨架屏

### 使用示例

```typescript
import { useMobileOptimizations, MobileHeader, ResponsiveTable } from '@/components/features/common/MobileOptimizations';

function MyComponent() {
  const { isMobile, isTablet, isDesktop, screenWidth, orientation } = useMobileOptimizations();
  
  return (
    <div>
      <MobileHeader 
        showSearch={true}
        showNotifications={true}
        showUserMenu={true}
      />
      
      <ResponsiveTable
        headers={['ID', 'Market', 'Status']}
        rows={[
          ['0x123...', 'ETH/USD', 'Active'],
          ['0x456...', 'BTC/USD', 'Pending'],
        ]}
        onRowClick={(index) => handleRowClick(index)}
      />
    </div>
  );
}
```

### 断点定义
- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: >= 1024px

### 触摸优化按钮
```typescript
import { TouchOptimizedButton } from '@/components/features/common/MobileOptimizations';

<TouchOptimizedButton
  variant="primary"
  size="lg"
  onClick={handleClick}
>
  确认操作
</TouchOptimizedButton>
```

## 3. 批量操作功能

### 新增功能
- 多选/全选/取消选择
- 最大选择数量限制
- 批量处理进度跟踪
- 确认对话框
- 批量导出

### 使用示例

```typescript
import { useBatchOperations, BatchOperationsToolbar } from '@/hooks/ui/useBatchOperations';

interface AssertionItem {
  id: string;
  name: string;
}

function AssertionsList() {
  const {
    items,
    selectedItems,
    selectedCount,
    isAllSelected,
    isIndeterminate,
    toggleSelect,
    toggleSelectAll,
    processBatch,
  } = useBatchOperations<AssertionItem>({
    maxSelectable: 100,
    requireConfirmation: true,
    confirmationThreshold: 10,
  });

  // 设置数据
  useEffect(() => {
    setItems(assertions.map(a => ({
      id: a.id,
      data: a
    })));
  }, [assertions]);

  // 批量处理
  const handleBatchDispute = async () => {
    const result = await processBatch(async (item) => {
      // 处理每个选中的项目
      await disputeAssertion(item.id);
      return { success: true, data: item };
    });
    
    if (result.success) {
      showSuccess(`${result.data?.length}个断言已发起争议`);
    }
  };

  return (
    <div>
      {items.map((item) => (
        <div 
          key={item.id}
          onClick={() => toggleSelect(item.id)}
          className={item.selected ? 'selected' : ''}
        >
          {item.data.name}
        </div>
      ))}
      
      <BatchOperationsToolbar
        selectedCount={selectedCount}
        totalCount={items.length}
        isAllSelected={isAllSelected}
        isIndeterminate={isIndeterminate}
        onSelectAll={toggleSelectAll}
        onDeselectAll={deselectAll}
        onProcess={handleBatchDispute}
        onExport={handleBatchExport}
      />
    </div>
  );
}
```

## 4. 多格式数据导出

### 新增功能
- CSV导出
- JSON导出
- Excel导出
- 字段映射
- 进度跟踪

### 使用示例

```typescript
import { useExport, ExportButton } from '@/lib/api/exportUtils';

// 使用Hook
const { exportToCSV, exportToJSON, exportToExcel, progress, download } = useExport({
  data: assertions,
  filename: 'assertions-report',
  onSuccess: (result) => download(result),
  onError: (error) => showError(error),
});

// 导出按钮组件
<ExportButton
  data={assertions}
  filename="oracle-report"
  disabled={isExporting}
  showLabels={true}
  onExportStart={() => setIsExporting(true)}
  onExportComplete={(result) => {
    setIsExporting(false);
    download(result);
  }}
/>

// 手动调用
await exportToCSV({
  includeHeaders: true,
  fieldMappings: {
    id: 'Assertion ID',
    market: 'Market',
    status: 'Status',
  },
});
```

### 导出配置
```typescript
interface ExportOptions {
  filename?: string;        // 自定义文件名
  includeHeaders?: boolean; // 包含表头
  dateFormat?: string;      // 日期格式
  fieldMappings?: Record<string, string>; // 字段映射
  maxRows?: number;         // 最大行数
}
```

## 5. 官方UMA Optimistic Oracle集成

### 新增功能
- OOv2协议支持
- OOv3协议支持
- 多链配置
- 完整的ABI定义

### 使用示例

```typescript
import { 
  UMAOracleClient, 
  createUMAOracleConfig,
  UMA_OPTIMISTIC_ORACLE_V2_ABI,
  UMA_OPTIMISTIC_ORACLE_V3_ABI,
} from '@/lib/blockchain/umaOptimisticOracle';

// 创建配置
const config = createUMAOracleConfig(137, {
  optimisticOracleV3Address: '0x...',
});

// 创建客户端
const client = new UMAOracleClient(config, walletClient);

// 获取价格请求
const request = await client.getPriceRequest(
  'UMIP-128',      // identifier
  BigInt(123456),  // timestamp
  ''               // ancillaryData
);

// 提议价格
const txHash = await client.proposePrice(request, proposedPrice, proposerAddress);

// 争议价格
const disputeTx = await client.disputePrice(identifier, timestamp, ancillaryData, disputerAddress);

// 结算价格
const result = await client.settlePrice(identifier, timestamp, ancillaryData);

// OOv3断言
const assertionId = await client.assertTruth(
  'Some claim',    // claim
  currencyAddress, // currency
  bondAmount,      // bond
  'UMIP-128',      // identifier
  asserterAddress, // asserter
);
```

### 支持的链
- Ethereum Mainnet (1)
- Polygon Mainnet (137)
- Arbitrum One (42161)
- Optimism (10)
- Polygon Amoy (80002)

## 6. 实时数据推送

### 新增功能
- Server-Sent Events (SSE)
- WebSocket支持
- 自动重连
- 心跳保活
- 连接状态管理

### 使用示例

```typescript
import { useRealTime, useWebSocket, useConnectionHealth } from '@/hooks/ui/useRealTime';

// SSE方式
const {
  connectionState,
  subscribe,
  unsubscribeAll,
  isSupported,
  lastEvent,
  eventCount,
} = useRealTime({
  url: '/api/realtime',
  enabled: true,
  autoReconnect: true,
  reconnectInterval: 5000,
  maxReconnectAttempts: 10,
  onEvent: (event) => {
    console.log('收到事件:', event.type, event.data);
  },
  onConnect: () => console.log('已连接'),
  onDisconnect: () => console.log('已断开'),
});

// 订阅特定事件
useEffect(() => {
  subscribe(['assertion_created', 'assertion_disputed', 'price_settled']);
  
  return () => unsubscribeAll();
}, []);

// WebSocket方式
const { isConnected, lastMessage, send } = useWebSocket({
  url: 'wss://api.example.com/ws',
  enabled: true,
  autoReconnect: true,
  onMessage: (data) => handleMessage(data),
});

// 连接健康检查
const health = useConnectionHealth();
// health = { isOnline: true, lastCheck: 1234567890, latency: 45 }
```

### 事件类型
- `assertion_created` - 新断言创建
- `assertion_disputed` - 断言被争议
- `assertion_resolved` - 断言已解决
- `dispute_created` - 新争议
- `dispute_resolved` - 争议已解决
- `price_proposed` - 价格已提议
- `price_settled` - 价格已结算
- `sync_completed` - 同步完成
- `alert_triggered` - 告警触发
- `system_status` - 系统状态

## 7. 预测性分析

### 新增功能
- 争议概率预测
- 结算结果预测
- 异常检测
- 风险评估
- 推荐生成

### 使用示例

```typescript
import { predictiveAnalytics, usePredictiveAnalytics } from '@/lib/monitoring/predictiveAnalytics';

// 直接使用引擎
const engine = new PredictiveAnalyticsEngine();

// 预测争议概率
const disputePrediction = engine.predictDisputeProbability({
  historicalData: [
    { timestamp: Date.now() - 86400000 * 7, value: 0.1, metadata: { disputeRate: 0.05 } },
    // ... 更多历史数据
  ],
  currentValue: 0.2,
  timeWindow: 7,
});

// disputePrediction = {
//   prediction: 0.35,          // 争议概率
//   confidence: 0.85,         // 置信度
//   trend: 'stable',          // 趋势
//   riskLevel: 'medium',      // 风险等级
//   factors: [...],           // 影响因素
//   recommendations: [...],   // 建议
//   timestamp: 1234567890,    // 时间戳
// }

// 预测结算结果
const settlementPrediction = engine.predictSettlementOutcome({
  bondAmount: 5000,
  livenessPeriod: 86400 * 2,
  marketVolatility: 0.2,
  historicalAccuracy: 0.9,
  disputerActivity: 5,
});

// 检测异常
const anomalies = engine.detectAnomalies([
  { timestamp: 1, value: 100 },
  { timestamp: 2, value: 102 },
  { timestamp: 3, value: 98 },
  // ...
  { timestamp: 11, value: 500 }, // 异常值
]);
// anomalies[0] = {
//   isAnomaly: true,
//   anomalyType: 'spike',
//   severity: 'high',
//   expectedValue: 100,
//   actualValue: 500,
//   deviation: 400%,
// }

// 风险评估
const riskAssessment = engine.assessRisk({
  disputeRate: [0.05, 0.04, 0.06],
  assertionVolume: [50, 60, 55],
  errorRate: [0.01, 0.02, 0.01],
  syncLatency: [1000, 1200, 1100],
  livenessScore: [0.95, 0.94, 0.96],
});
// riskAssessment = {
//   overallScore: 0.85,
//   riskLevel: 'low',
//   factors: [...],
//   recommendations: [...],
// }
```

### 预测结果说明
- **prediction**: 0-1之间的概率值
- **confidence**: 预测的置信度（0-1）
- **trend**: `increasing`/`decreasing`/`stable`
- **riskLevel**: `low`/`medium`/`high`/`critical`
- **factors**: 影响预测的因素列表
- **recommendations**: 基于预测的建议操作

## 8. 测试工具

### 新增功能
- Mock辅助函数
- 场景测试
- 边缘情况测试
- 异步测试
- 网络模拟

### 使用示例

```typescript
import { testUtils } from '@/lib/test/testUtils';

const { mock, scenarios, edgeCases, async: asyncUtils } = testUtils;

// Mock示例
const mockFn = mock(obj, 'myMethod');
mockFn.mockReturnValue('mocked value');

// 场景测试
scenarios<TestScenario>(
  (scenario) => {
    const result = processScenario(scenario.input);
    expect(result).toEqual(scenario.expected);
  },
  [
    { name: '正常情况', input: {...}, expected: {...} },
    { name: '边界情况', input: {...}, expected: {...} },
  ]
);

// 异步测试
const { wait, waitFor, waitForAsync } = asyncUtils;
await wait(1000); // 等待1秒

const result = await waitFor(
  () => someAsyncCondition(), // 等待条件满足
  5000,                       // 超时时间
  100                         // 轮询间隔
);
```

## 总结

本次优化为Insight平台带来了以下核心能力提升：

1. **用户体验** - 更友好的错误提示、移动端完整支持
2. **操作效率** - 批量操作、多格式导出
3. **实时性** - SSE/WebSocket实时推送
4. **智能化** - 预测性分析、异常检测、风险评估
5. **集成能力** - 官方UMA协议完整支持
6. **代码质量** - 完整测试覆盖、TypeScript类型安全

所有功能均已通过测试验证，可以直接在生产环境中使用。
