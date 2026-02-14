# Contributing to OracleMonitor

Thank you for your contribution!

## Contribution Process

1. **Create Issue** - Report bugs or suggest new features
2. **Fork Repository** - Create your branch
3. **Submit PR** - Follow the guidelines below

## Commit Guidelines

- Use present tense ("Add feature" not "Added feature")
- Use imperative mood ("Move cursor to..." not "Moves cursor to...")
- Keep the first line under 72 characters
- Reference issues in commit messages

## Git Commit Format

Use Conventional Commits:

```
feat(oracle): add sync status indicator
fix(api): resolve rate limit issue
docs(readme): update installation guide
chore: update dependencies
refactor: simplify query builder
test: add unit tests for module
```

## Code Style

- **Formatting**: Prettier + ESLint
- **Indentation**: 2 spaces
- **Quotes**: Single quotes
- **Semicolons**: Required
- **Line width**: 100 characters

## Development Setup

```bash
npm install
npm run dev
npm test
npm run lint
npm run typecheck
```

## Pull Request Process

1. Update documentation for any changes
2. Add tests for new features
3. Ensure all tests pass
4. Update CHANGELOG.md if needed
5. Request review from maintainers

Detailed development guide available at [Development Guide](docs/DEVELOPMENT_GUIDE.md)
