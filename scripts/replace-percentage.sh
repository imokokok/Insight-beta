#!/bin/bash

# 批量替换百分比格式化逻辑

# 1. GasProviderHealthCard.tsx
sed -i "s/import { cn } from '@\/lib\/utils';/import { cn, formatPercentValue } from '@\/lib\/utils';/" src/components/features/gas/GasProviderHealthCard.tsx
sed -i 's/{provider.successRate.toFixed(1)}%/{formatPercentValue(provider.successRate, 1)}/' src/components/features/gas/GasProviderHealthCard.tsx

# 2. GasPriceTrendChart.tsx - 删除本地函数并更新导入
sed -i "s/import { cn } from '@\/lib\/utils';/import { cn, formatChangePercent, formatPercentValue } from '@\/lib\/utils';/" src/components/features/gas/GasPriceTrendChart.tsx
sed -i '/^function formatChangePercent/,/^}$/d' src/components/features/gas/GasPriceTrendChart.tsx
sed -i 's/formatChangePercent(data.changePercent)/formatChangePercent(data.changePercent \/ 100, 2, false)/' src/components/features/gas/GasPriceTrendChart.tsx
sed -i 's/{data.volatility.toFixed(2)}%/{formatPercentValue(data.volatility, 2)}/' src/components/features/gas/GasPriceTrendChart.tsx

# 3. GasPriceHistoryViewer.tsx
sed -i "s/import { cn } from '@\/lib\/utils';/import { cn, formatChangePercent } from '@\/lib\/utils';/" src/components/features/gas/GasPriceHistoryViewer.tsx
sed -i 's/{stats.changePercent >= 0 ? '\''+'\'' : '\''\''}{stats.changePercent.toFixed(2)}%/{formatChangePercent(stats.changePercent \/ 100, 2, false)}/' src/components/features/gas/GasPriceHistoryViewer.tsx

echo "Gas components updated"
