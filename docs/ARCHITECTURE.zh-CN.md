[English](./ARCHITECTURE.md)

# 系统架构

## 概览

**Insight** is a comprehensive oracle monitoring and dispute resolution interface. It provides real-time visualization of oracle data, manages dispute lifecycles, and enables user interaction with the protocol through a modern web interface.

## Tech Stack

### Frontend

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Shadcn UI
- **State Management**: React Hooks + SWR (Stale-While-Revalidate)
- **Web3 Integration**: `viem` for blockchain interaction and wallet connection (EIP-1193 provider).
- **Charts**: Recharts

### Backend (Server Actions / API Routes)

- **Runtime**: Next.js Serverless Functions (Node.js)
- **Database**: PostgreSQL (via `pg` driver)
- **Observability**: Custom observability layer (`src/server/observability.ts`)
- **Validation**: `zod` for runtime schema validation

## Directory Structure

```
src/
├── app/              # Next.js App Router pages and API routes
│   ├── api/          # Backend API endpoints (Oracle, Admin, Auth)
│   └── ...           # UI Pages
├── components/       # React components
│   ├── ui/           # Generic UI components (Buttons, Cards)
│   └── ...           # Business components (OracleCharts, DisputeList)
├── lib/              # Shared utilities (Types, Helpers)
├── server/           # Backend logic (Database, Oracle Contract, Indexer)
└── test/             # Contract tests (Hardhat)
```

## Key Data Flows

### 1. Oracle Data Synchronization

The system uses a pull-based synchronization mechanism (triggered via cron or admin API) to index events from the Insight Oracle smart contract.

- **Source**: On-chain events (AssertionMade, DisputeRaised).
- **Process**: `src/server/oracle/index.ts` handles fetching logs and updating the PostgreSQL database.
- **Trigger**: `/api/oracle/sync` endpoint.

### 2. Dispute Resolution

- **User Action**: Users view disputes in `DisputeList`.
- **Interaction**: Users can vote or propose settlements via `VoteModal` or `SettleModal`.
- **Transaction**: Transactions are built using `viem` and sent via the user's wallet.

### 3. Monitoring & Alerts

- **Stats**: `OracleCharts` fetches aggregated data from `/api/oracle/charts`.
- **Alerts**: The system monitors sync lag and contract events, triggering alerts based on rules defined in `src/app/api/oracle/alert-rules`.

## Security & Performance

- **Rate Limiting**: API routes are protected by a custom rate limiter (`src/server/apiResponse.ts`).
- **Caching**: Heavy computations are cached using `cachedJson`.
- **Validation**: All API inputs are strictly validated using `zod` schemas.
