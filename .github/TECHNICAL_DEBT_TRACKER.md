# Technical Debt Tracker

This project uses GitHub Projects to track technical debt. This document outlines the workflow and template for managing technical debt items.

## Overview

Technical debt represents the cost of choosing a quick solution now instead of a better approach that would take longer. This tracker helps the team identify, prioritize, and manage technical debt items systematically.

## Project Board Setup

The technical debt is tracked in a GitHub Project with the following columns:

| Column      | Description                                   |
| ----------- | --------------------------------------------- |
| Backlog     | Debt items identified but not yet prioritized |
| To Refactor | Items selected for upcoming sprint            |
| In Progress | Currently being addressed                     |
| Code Review | PR open for review                            |
| Done        | Completed and merged                          |

## Debt Categories

| Category             | Description                                   | Priority |
| -------------------- | --------------------------------------------- | -------- |
| `type:code`          | Code quality issues (duplication, complexity) | Medium   |
| `type:architecture`  | Design/architecture improvements              | Low      |
| `type:performance`   | Performance optimizations                     | Medium   |
| `type:security`      | Security hardening                            | High     |
| `type:testing`       | Test coverage improvements                    | Medium   |
| `type:documentation` | Documentation gaps                            | Low      |
| `type:dependency`    | Outdated dependencies                         | Medium   |
| `type:deprecation`   | Using deprecated APIs                         | High     |

## Priority Levels

| Priority | Label               | Description                                  |
| -------- | ------------------- | -------------------------------------------- |
| Critical | `priority:critical` | Must fix immediately, security/critical bugs |
| High     | `priority:high`     | Should fix soon, significant impact          |
| Medium   | `priority:medium`   | Plan to fix, moderate impact                 |
| Low      | `priority:low`      | Nice to have, minor impact                   |

## Effort Estimation

| Effort | Label           | Description    |
| ------ | --------------- | -------------- |
| Small  | `effort:small`  | Takes < 1 day  |
| Medium | `effort:medium` | Takes 1-3 days |
| Large  | `effort:large`  | Takes > 3 days |

## Template for New Debt Items

Use this template when creating a new technical debt item:

```markdown
## Description

[Brief description of the technical debt]

## Impact

- [ ] Performance impact
- [ ] Security risk
- [ ] Maintainability cost
- [ ] Developer experience
- [ ] Other

## Current State

[Describe the current problematic implementation]

## Desired State

[Describe the ideal implementation]

## Notes

- [Links to related issues/PRs]
- [Additional context]
- [References to documentation]
```

## Example Items

### Code Duplication

- **Title**: Extract common API utilities
- **Labels**: `type:code`, `priority:medium`, `effort:medium`
- **Description**: Multiple API routes have similar error handling and validation logic that should be extracted to shared utilities.

### Performance Optimization

- **Title**: Optimize dashboard page bundle size
- **Labels**: `type:performance`, `priority:high`, `effort:small`
- **Description**: The dashboard page bundle is 450KB. Implement code splitting and lazy loading to reduce initial load time.

### Security Hardening

- **Title**: Add rate limiting to all API endpoints
- **Labels**: `type:security`, `priority:critical`, `effort:medium`
- **Description**: API endpoints lack rate limiting, making them vulnerable to abuse. Implement rate limiting using Redis.

### Dependency Update

- **Title**: Upgrade Next.js to latest stable
- **Labels**: `type:dependency`, `priority:high`, `effort:small`
- **Description**: Current Next.js version has known performance issues. Newer version includes security patches and performance improvements.

## Workflow

1. **Identify**: Team members notice technical debt during development
2. **Document**: Create issue with template and appropriate labels
3. **Review**: Weekly sync to prioritize backlog items
4. **Schedule**: Add prioritized items to sprint backlog
5. **Execute**: Complete the refactoring work
6. **Verify**: Ensure tests pass and performance improves
7. **Close**: Mark item as done in project board

## Metrics

Track the following metrics to monitor technical debt:

- **Debt Backlog Size**: Number of items in backlog
- **Debt Resolution Rate**: Items completed per sprint
- **Debt Age**: Average time debt items stay in backlog
- **Debt by Category**: Distribution of debt types
- **Debt by Priority**: Distribution of priority levels

## Related Resources

- [Coding Standards](../CODING_STANDARDS.md)
- [Architecture Documentation](../docs/ARCHITECTURE.md)
- [Development Guide](../docs/DEVELOPMENT_GUIDE.md)
- [Testing Strategy](#) (link to testing documentation)

## References

- [Martin Fowler on Technical Debt](https://martinfowler.com/bliki/TechnicalDebt.html)
- [Ward Cunningham's Debt Metaphor](https://www.youtube.com/watch?v=pqeJFY6B2e4)
