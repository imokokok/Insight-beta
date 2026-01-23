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

### Changed

- Updated dependencies to locked versions for production stability
- Refactored AlertRulesManager validation logic into separate module
- Enhanced global error boundary to report errors to Sentry in production

### Fixed

- Improved type safety by locking critical dependency versions
- Enhanced error handling in API client with better error classification

## [0.1.0] - 2024

### Initial Release

- Oracle monitoring and dispute resolution interface
- Real-time visualization of oracle data trends
- Multi-chain support (Polygon, Arbitrum, Optimism)
- Internationalization support (English, Chinese, Spanish)
- Web3 wallet integration via viem
- Comprehensive API documentation
- Complete test suite with Vitest and Hardhat
