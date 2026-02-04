#!/bin/bash
# 批量替换 console.log 和 console.warn 为 logger 调用

# 文件列表
files=(
  "src/hooks/ui/useBatchOperations.tsx"
  "src/components/features/common/PerformanceMonitor.tsx"
  "src/app/oracle/dashboard/page.tsx"
  "src/lib/observability/sentryIntegration.tsx"
  "src/hooks/usePerformance.ts"
  "src/i18n/loader.ts"
  "src/lib/api/export.ts"
  "src/lib/blockchain/solana/connection.ts"
  "src/lib/pwa.ts"
  "src/lib/monitoring/performanceMonitoring.ts"
  "src/lib/monitoring/webVitals.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing: $file"
    
    # 检查是否已有 logger 导入
    if ! grep -q "import.*logger.*from.*@/lib/logger" "$file"; then
      # 在第一个 import 后添加 logger 导入
      sed -i '' "/^import.*from/a\\
import { logger } from '@/lib/logger';" "$file"
    fi
    
    # 替换 console.warn (不在 catch 块中的)
    sed -i '' 's/console\.warn(\([^)]*\))/logger.warn(\1)/g' "$file"
    
    # 替换 console.log
    sed -i '' 's/console\.log(\([^)]*\))/logger.debug(\1)/g' "$file"
  else
    echo "File not found: $file"
  fi
done

echo "Done!"
