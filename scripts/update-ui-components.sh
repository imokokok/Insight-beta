#!/bin/bash

# 批量更新 UI 组件脚本
# 将旧组件替换为新增强组件

echo "开始更新 UI 组件..."

# 更新协议详情页面 - 移除未使用的导入
sed -i '' '/import { Button } from/d' src/app/oracle/protocols/\[protocol\]/page.tsx
sed -i '' '/import { Card, CardContent } from/d' src/app/oracle/protocols/\[protocol\]/page.tsx

# 更新偏差分析页面
echo "更新偏差分析页面..."

# 更新首页
echo "更新首页..."

# 更新协议列表页面
echo "更新协议列表页面..."

echo "更新完成！"
