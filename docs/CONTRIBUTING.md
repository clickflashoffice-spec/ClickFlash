# Contributing to ClickFlash

Thank you for your interest in contributing to the ClickFlash Photography Ecosystem! 🎉

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Release Process](#release-process)

---

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to:

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Respect different viewpoints and experiences

---

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

### Development Environment

```bash
# Start all apps in development mode
start-all.bat

# Or start specific apps
cd apps/master && npm run dev:full
cd apps/touch && npm run dev
```

---

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

### Creating a Feature

```bash
# Create feature branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/amazing-feature

# Make your changes
git add .
git commit -m "feat: add amazing feature"

# Push and create PR
git push origin feature/amazing-feature
```

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Code style (formatting)
- `refactor` - Code refactoring
- `test` - Tests
- `chore` - Build/config changes

**Examples:**
```
feat(albums): add bulk selection mode

fix(orders): resolve payment status sync issue
docs(readme): update installation instructions
refactor(api): simplify error handling
test(dashboard): add unit tests for StatCard
```

---

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

// ❌ Bad - Implicit types, unclear naming
const Photo = (props) => {
  return <div onClick={() => props.click(props.i)}>
    <img src={props.u} />
  </div>;
};
```

### React Components

```typescript
// ✅ Good - Functional components, hooks, memo
import React, { useState, useCallback, useMemo } from 'react';

interface ListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  keyExtractor: (item: T) => string;
}

export const VirtualList = React.memo(<T extends unknown>({
  items,
  renderItem,
  keyExtractor
}: ListProps<T>) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });

  const visibleItems = useMemo(() => 
    items.slice(visibleRange.start, visibleRange.end),
    [items, visibleRange]
  );

  const handleScroll = useCallback((e: React.UIEvent) => {
    // Scroll handling logic
  }, []);

  return (
    <div onScroll={handleScroll} className="virtual-list">
      {visibleItems.map(item => (
        <div key={keyExtractor(item)}>
          {renderItem(item)}
        </div>
      ))}
    </div>
  );
});

VirtualList.displayName = 'VirtualList';
```

### File Organization

```
src/
├── components/
│   ├── common/          # Shared components
│   │   ├── Button.tsx
│   │   └── Card.tsx
│   ├── albums/          # Feature-specific
│   │   ├── AlbumGrid.tsx
│   │   └── AlbumCard.tsx
│   └── __tests__/       # Component tests
├── hooks/               # Custom hooks
│   ├── useAlbums.ts
│   └── useAuth.ts
├── services/            # API services
│   ├── api/
│   └── __tests__/
├── utils/               # Utilities
│   ├── formatters.ts
│   └── validators.ts
└── types/               # Type definitions
    └── index.ts
```

### CSS/Styling (Tailwind)

```tsx
// ✅ Good - Utility classes, responsive, dark mode
<div className="
  flex flex-col gap-4
  p-4 md:p-6 lg:p-8
  bg-white dark:bg-slate-800
  rounded-lg shadow-md
  transition-all duration-200
">
  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
    Title
  </h2>
</div>

// ❌ Bad - Custom CSS when utilities exist
<div className="card-container">
  <h2 className="card-title">Title</h2>
</div>
```

---

## Testing

### Running Tests

```bash
# All tests
npm run test:all

# Specific app
cd apps/master && npm test

# With coverage
npm test -- --coverage

# Watch mode
npm test -- --watch

# E2E tests
cd apps/master && npm run test:e2e
```

### Writing Tests

```typescript
// Component test
import { render, screen, fireEvent } from '@testing-library/react';
import { AlbumCard } from './AlbumCard';

describe('AlbumCard', () => {
  const mockAlbum = {
    id: '1',
    title: 'Test Album',
    photoCount: 10,
    coverUrl: 'test.jpg'
  };

  it('renders album information', () => {
    render(<AlbumCard album={mockAlbum} />);
    
    expect(screen.getByText('Test Album')).toBeInTheDocument();
    expect(screen.getByText('10 photos')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const onClick = jest.fn();
    render(<AlbumCard album={mockAlbum} onClick={onClick} />);
    
    fireEvent.click(screen.getByText('Test Album'));
    expect(onClick).toHaveBeenCalledWith('1');
  });
});
```

### Test Coverage

- Aim for **80%+** coverage on new code
- Test user workflows, not implementation
- Include error cases and edge cases

---

## Submitting Changes

### Pull Request Process

1. **Create Branch**
   ```bash
   git checkout -b feature/description
   ```

2. **Make Changes**
   - Follow coding standards
   - Add tests
   - Update documentation

3. **Commit**
   ```bash
   git add .
   git commit -m "feat: description"
   ```

4. **Push**
   ```bash
   git push origin feature/description
   ```

5. **Create PR**
   - Fill out PR template
   - Link related issues
   - Request review

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

---

## Release Process

### Version Bump

```bash
# Update version
npm version [major|minor|patch]

# Example
npm version minor  # 1.0.0 → 1.1.0
```

### Release Steps

1. Update `CHANGELOG.md`
2. Bump version in `package.json`
3. Create git tag
   ```bash
   git tag -a v1.1.0 -m "Release v1.1.0"
   git push origin v1.1.0
   ```
4. GitHub Actions builds and releases automatically
5. Update release notes on GitHub

---

## 🆘 Getting Help

- **Documentation**: Check `docs/` folder
- **Issues**: Create GitHub issue
- **Discussions**: Use GitHub Discussions
- **Email**: dev@clickflash.app

---

## 🙏 Recognition

Contributors will be:
- Listed in README.md
- Mentioned in release notes
- Added to CONTRIBUTORS.md

---

Thank you for contributing to ClickFlash! 🚀
