# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Test coverage reporting with Vitest coverage configuration
- Sentry error tracking integration for client, server, and edge runtimes
- ESLint plugin-perfectionist for code organization and consistency
- Alert validation module with reusable validation rules
- CHANGELOG file for tracking project changes
- i18n internationalization system with 5 language support
- Onboarding component with role-based guided tour
- Shared module library (src/lib/shared) with reusable components
- SyncManagerFactory for simplified protocol synchronization
- EvmOracleClient base class for EVM protocol clients
- Timeline event management system
- SLO monitoring and reporting
- Security monitoring and manipulation detection
- WebSocket price streaming with Redis adapter
- Database optimization and caching layers

### Changed

- Updated dependencies to locked versions for production stability
- Refactored AlertRulesManager validation logic into separate module
- Enhanced global error boundary to report errors to Sentry in production
- Migrated to Next.js 16 with App Router
- Updated to TypeScript 5.7 with strict mode
- Refactored all sync modules using SyncManagerFactory (68% code reduction)
- Refactored EVM clients using EvmOracleClient base class (49% code reduction)

### Fixed

- Improved type safety by locking critical dependency versions
- Enhanced error handling in API client with better error classification
- Fixed database connection pooling issues
- Resolved WebSocket reconnection stability

## [0.1.0] - 2024

### Initial Release

- Oracle monitoring and dispute resolution interface
- Real-time visualization of oracle data trends
- Multi-chain support (Polygon, Arbitrum, Optimism, Base, Avalanche, BSC)
- Internationalization support (English, Chinese, Spanish, French, Korean)
- Web3 wallet integration via viem
- Comprehensive API documentation
- Complete test suite with Vitest and Playwright
- Support for 9 oracle protocols (UMA, Chainlink, Pyth, Band, API3, RedStone, Switchboard, Flux, DIA)
- Price aggregation and cross-protocol comparison
- Smart alerting system with multi-channel notifications
- Real-time WebSocket streaming
- Enterprise security with RBAC and audit logging
- Optimized for Vercel + Supabase serverless deployment
