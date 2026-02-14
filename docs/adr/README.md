# Architecture Decision Records (ADR)

This document records key architecture decisions for the Insight project.

## Core Decisions

| Decision                  | Description                                    | Status      |
| ------------------------- | ---------------------------------------------- | ----------- |
| Next.js App Router        | Use Next.js 14+ App Router architecture        | Implemented |
| API Flat Structure        | API routes use flat directory structure        | Implemented |
| React 19 + Next.js 15     | Frontend framework upgraded to latest versions | Implemented |
| Multi-chain Support       | Support Ethereum, BSC, Polygon, Avalanche      | Implemented |
| Supabase as Single Source | Use Supabase as only database source           | Implemented |
| Shared Module Library     | Centralized reusable components                | Implemented |
| Event-driven Architecture | Timeline-based event management              | Implemented |

## Technical Stack

- **Framework**: Next.js 15 + React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL + Supabase
- **Blockchain**: viem

## Recent Decisions

### ADR-001: Supabase as Single Source

**Status**: Implemented

**Context**: We previously used both Prisma ORM and direct SQL migrations, which caused confusion and potential inconsistencies.

**Decision**: Use Supabase as the single source of truth for database schema. All database changes are made through SQL migrations in `supabase/migrations/`.

**Consequences**:

- Simplified database management
- Clear migration path
- Better team collaboration

### ADR-002: Shared Module Library

**Status**: Implemented

**Context**: Multiple protocol sync modules had duplicate code (505 lines total, 68% redundancy).

**Decision**: Created `src/lib/shared/` with reusable components:

- `BatchInserter` - Database batch operations
- `EvmOracleClient` - EVM oracle client base class
- `SyncManagerFactory` - Protocol sync factory
- `ErrorHandler` - Unified error handling
- `LoggerFactory` - Structured logging

**Consequences**:

- 54% code reduction
- Faster protocol integration
- Easier maintenance

### ADR-003: Event Timeline System

**Status**: Implemented

**Context**: Need to track system events for debugging and auditing.

**Decision**: Implement event timeline with:

- Unified event model
- Event correlation analysis
- Timeline view in UI

**Consequences**:

- Better incident debugging
- Complete audit trail
- Improved operational visibility
