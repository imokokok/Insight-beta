# Contributing to Insight

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

## Code Style

- Format: Prettier + ESLint
- Indentation: 2 spaces
- Quotes: Single quotes
- Semicolons: Required
- Line width: 100 characters

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

## Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Check code style
npm run lint

# Type check
npm run typecheck
```

## Pull Request Process

1. Update documentation for any changes
2. Add tests for new features
3. Ensure all tests pass
4. Update CHANGELOG.md if needed
5. Request review from maintainers

## Development Setup

Detailed development guide available at [Development Guide](docs/DEVELOPMENT_GUIDE.md)
