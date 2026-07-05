---
sidebar_position: 1
title: Contributing
description: Guide to contributing to the ClickFlash Photography Ecosystem — coding standards, testing, and PR workflow.
---

# Contributing to ClickFlash

Thank you for your interest in contributing to the ClickFlash Photography Ecosystem! 🎉

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to:

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Respect different viewpoints and experiences

## Getting Started

### Prerequisites

- **Node.js** 20.x or higher
- **npm** 10.x or higher
- **Git** 2.x or higher
- **Windows** (for Desktop apps)

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/your-org/clickflash.git
cd clickflash

# Install all dependencies
install-all.bat

# Or install per app
cd apps/master && npm install
cd apps/touch && npm install
```

## Development Workflow

### Branch Strategy

```
main (production)
  ↑
develop (integration)
  ↑
feature/feature-name
  ↑
hotfix/fix-name
```

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Examples:**
```
feat(albums): add bulk selection mode
fix(orders): resolve payment status sync issue
docs(readme): update installation instructions
refactor(api): simplify error handling
test(dashboard): add unit tests for StatCard
```

## Coding Standards

### TypeScript

```typescript
// ✅ Good - Explicit types, clear naming
interface PhotoProps {
  id: string;
  url: string;
  alt: string;
  onClick: (id: string) => void;
}

const PhotoCard: React.FC<PhotoProps> = ({ id, url, alt, onClick }) => {
  const handleClick = useCallback(() => {
    onClick(id);
  }, [id, onClick]);

  return (
    <div onClick={handleClick} className="photo-card">
      <img src={url} alt={alt} loading="lazy" />
    </div>
  );
};
```

### File Organization

```
src/
├── components/
│   ├── common/          # Shared components
│   ├── albums/          # Feature-specific
│   └── __tests__/       # Component tests
├── hooks/               # Custom hooks
├── services/            # API services
├── utils/               # Utilities
└── types/               # Type definitions
```

### CSS/Styling (Tailwind)

```tsx
// ✅ Good - Utility classes, responsive, dark mode
<div className="
  flex flex-col gap-4
  p-4 md:p-6 lg:p-8
  bg-white dark:bg-slate-800
  rounded-lg shadow-md
">
  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
    Title
  </h2>
</div>
```

## Testing

### Running Tests

```bash
# All tests
npm run test:all

# Specific app
cd apps/master && npm test

# With coverage
npm test -- --coverage

# E2E tests
cd apps/master && npm run test:e2e
```

### Test Coverage

- Aim for **80%+** coverage on new code
- Test user workflows, not implementation
- Include error cases and edge cases

## Submitting Changes

### PR Checklist

- [ ] Tests pass locally
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] No console errors
- [ ] Responsive design checked
- [ ] Dark mode tested

### Review Process

1. Automated checks (CI/CD)
2. Code review by maintainers
3. Address feedback
4. Merge to develop

## Release Process

### Version Bump

```bash
npm version [major|minor|patch]
```

### Release Steps

1. Update `CHANGELOG.md`
2. Bump version in `package.json`
3. Create git tag: `git tag -a v1.1.0 -m "Release v1.1.0"`
4. GitHub Actions builds and releases automatically

## 🆘 Getting Help

- **Documentation**: Check `docs/` folder
- **Issues**: Create GitHub issue
- **Discussions**: Use GitHub Discussions
- **Email**: dev@clickflash.app

Thank you for contributing to ClickFlash! 🚀
