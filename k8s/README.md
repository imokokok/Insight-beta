# Kubernetes Deployment Guide

OracleMonitor Kubernetes 部署指南

## 快速开始

```bash
# 1. 创建命名空间
kubectl apply -f k8s/namespace.yaml

# 2. 创建配置和密钥
kubectl apply -f k8s/configmap.yaml

# 3. 部署数据库
kubectl apply -f k8s/postgres.yaml

# 4. 部署 Redis
kubectl apply -f k8s/redis.yaml

# 5. 部署应用
kubectl apply -f k8s/app.yaml

# 6. 部署后台 Worker
kubectl apply -f k8s/worker.yaml
```

## 验证部署

```bash
# 查看所有 Pod
kubectl get pods -n oracle-monitor

# 查看服务
kubectl get svc -n oracle-monitor

# 查看日志
kubectl logs -f deployment/oracle-monitor-app -n oracle-monitor

# 端口转发（本地测试）
kubectl port-forward svc/oracle-monitor-app 3000:3000 -n oracle-monitor
```

## 更新配置

```bash
# 编辑 ConfigMap
kubectl edit configmap oracle-monitor-config -n oracle-monitor

# 重启应用以应用新配置
kubectl rollout restart deployment/oracle-monitor-app -n oracle-monitor
```

## 扩缩容

```bash
# 手动扩缩容
kubectl scale deployment oracle-monitor-app --replicas=3 -n oracle-monitor

# 查看 HPA 状态
kubectl get hpa -n oracle-monitor
```

## 清理资源

```bash
kubectl delete -f k8s/
```
