# 部署（生产）

## 1) 环境变量

最少需要：

- `DATABASE_URL`

可选但强烈建议：

- `INSIGHT_ADMIN_TOKEN_SALT`：启用可撤销/可轮换的多管理员 Token
- `INSIGHT_SLOW_REQUEST_MS`：慢请求阈值（毫秒）
- `INSIGHT_MEMORY_MAX_VOTE_KEYS`：无数据库时，内存 votes 去重表最大条数（默认 200000）
- `INSIGHT_MEMORY_VOTE_BLOCK_WINDOW`：无数据库时，按区块窗口淘汰 votes（默认 50000）

若你仍要使用单一 Root Token（仅建议用于引导/应急）：

- `INSIGHT_ADMIN_TOKEN`

## 2) Docker 部署

构建镜像：

```bash
docker build -t insight:latest .
```

启动（示例）：

```bash
docker run --rm -p 3000:3000 \
  -e DATABASE_URL='postgres://...' \
  -e INSIGHT_ADMIN_TOKEN_SALT='change-me-to-a-random-string' \
  insight:latest
```

健康检查：

- `GET /api/health`

注意：不要在同一个工作目录里同时运行 `next dev` 和 `next build`，两者都会读写 `.next` 目录，极少数情况下可能导致构建期页面收集失败。生产发布建议只跑 `next build` + `next start`（或直接用 Docker 镜像）。

## 3) 初始化管理员 Token（推荐流程）

1) 用临时 Root Token 或现有 root 权限 token 调用：

- `POST /api/admin/tokens`（带 `x-admin-token` 和 `x-admin-actor`）

2) 把返回的明文 token 分发给对应角色使用（只返回一次）。
3) 定期轮换并用 `DELETE /api/admin/tokens?id=...` 吊销旧 token。
