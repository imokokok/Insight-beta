[English](./DEPLOYMENT.md)

# 部署（生产）

## 1) 环境变量

Minimum required:

- `DATABASE_URL`

Optional but strongly recommended:

- `INSIGHT_ADMIN_TOKEN_SALT`: Enable revocable/rotatable multi-admin tokens
- `INSIGHT_SLOW_REQUEST_MS`: Slow request threshold (ms)
- `INSIGHT_MEMORY_MAX_VOTE_KEYS`: Max vote deduplication entries in memory without database (default 200000)
- `INSIGHT_MEMORY_VOTE_BLOCK_WINDOW`: Block window for vote elimination without database (default 50000)

If you still want to use a single Root Token (only recommended for bootstrapping/emergency):

- `INSIGHT_ADMIN_TOKEN`

## 2) Docker Deployment

Build image:

```bash
docker build -t insight:latest .
```

Start (example):

```bash
docker run --rm -p 3000:3000 \
  -e DATABASE_URL='postgres://...' \
  -e INSIGHT_ADMIN_TOKEN_SALT='change-me-to-a-random-string' \
  insight:latest
```

Health check:

- `GET /api/health`

Note: Do not run `next dev` and `next build` in the same working directory simultaneously, both read/write the `.next` directory, which may rarely cause page collection failures during build. Production deployment should only run `next build` + `next start` (or use Docker image directly).

## 3) Initialize Admin Token (Recommended Flow)

1. Use temporary Root Token or existing root permission token to call:

- `POST /api/admin/tokens` (with `x-admin-token` and `x-admin-actor`)

2. Distribute the returned plaintext token to corresponding roles (returned only once).

3. Regularly rotate and revoke old tokens using `DELETE /api/admin/tokens?id=...`.
