# Monitoring Stack

OracleMonitor 监控栈 - Prometheus + Grafana

## 组件

- **Prometheus** - 指标收集和存储 (端口: 9090)
- **Grafana** - 可视化仪表板 (端口: 3001)
- **AlertManager** - 告警管理 (端口: 9093)
- **Node Exporter** - 系统指标
- **Redis Exporter** - Redis 指标
- **PostgreSQL Exporter** - 数据库指标

## 快速开始

```bash
# 启动主应用
docker-compose up -d

# 启动监控栈
cd monitoring
docker-compose -f docker-compose.monitoring.yml up -d

# 访问 Prometheus: http://localhost:9090
# 访问 Grafana: http://localhost:3001 (admin/admin123)
# 访问 AlertManager: http://localhost:9093
```

## 告警规则

- **HighPriceDeviation** - 价格偏差超过 5%
- **StalePriceData** - 价格数据超过 10 分钟未更新
- **OracleSyncFailure** - 预言机同步失败
- **APIHighErrorRate** - API 错误率过高
- **DatabaseConnectionFailure** - 数据库连接失败
- **RedisConnectionFailure** - Redis 连接失败

## 仪表板

预置仪表板包含:
- 价格偏差趋势
- 数据新鲜度
- 同步状态
- API 请求率
- 系统资源使用
