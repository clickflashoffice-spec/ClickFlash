---
description: "Daily startup routine for ClickFlash project context"
auto_load_skills:
  - clean-code
  - typescript-expert
  - cc-skill-coding-standards
  - react-best-practices
  - frontend-dev-guidelines
  - cc-skill-frontend-patterns
  - tailwind-patterns
  - ui-ux-pro-max
  - nextjs-best-practices
  - backend-dev-guidelines
  - cc-skill-backend-patterns
  - api-patterns
  - database-design
  - postgres-best-practices
  - api-security-best-practices
  - broken-authentication
  - idor-testing
  - xss-html-injection
  - testing-patterns
  - playwright-skill
  - verification-tdd
  - test-driven-development
  - web-performance-optimization
  - performance-profiling
  - docker-expert
  - deployment-procedures
  - vercel-deployment
  - code-review-checklist
  - lint-and-validate
  - codex-review
  - architecture
  - systematic-debugging
  - state-persistence
  - stripe-integration
  - email-systems
  - file-uploads
---

# ClickFlash Daily Startup

## Auto-Loaded Skills (36 Active)

### Core Development
| Skill | Purpose |
|-------|---------|
| `clean-code` | Code quality, no over-engineering |
| `typescript-expert` | Type safety, strict mode |
| `cc-skill-coding-standards` | Universal coding standards |

### Frontend
| Skill | Purpose |
|-------|---------|
| `react-best-practices` | React 19 optimization, no waterfalls |
| `frontend-dev-guidelines` | Component patterns, Suspense |
| `cc-skill-frontend-patterns` | React/Next.js patterns |
| `tailwind-patterns` | Tailwind CSS patterns |
| `ui-ux-pro-max` | UI/UX best practices |
| `nextjs-best-practices` | Next.js 15 patterns |

### Backend
| Skill | Purpose |
|-------|---------|
| `backend-dev-guidelines` | Layered architecture (routes→controllers→services) |
| `cc-skill-backend-patterns` | Node.js/Express patterns |
| `api-patterns` | REST/GraphQL design |

### Database
| Skill | Purpose |
|-------|---------|
| `database-design` | Schema design, indexing strategy |
| `postgres-best-practices` | PostgreSQL/SQLite optimization |

### Security
| Skill | Purpose |
|-------|---------|
| `api-security-best-practices` | Auth, validation, rate limiting |
| `broken-authentication` | Auth vulnerability testing |
| `idor-testing` | Access control testing |
| `xss-html-injection` | XSS prevention |

### Testing
| Skill | Purpose |
|-------|---------|
| `testing-patterns` | Jest, factories, mocking |
| `playwright-skill` | E2E browser testing |
| `verification-tdd` | TDD workflow |
| `test-driven-development` | Red-green-refactor |

### Performance
| Skill | Purpose |
|-------|---------|
| `web-performance-optimization` | Lighthouse, Core Web Vitals |
| `performance-profiling` | Profiling techniques |

### Deployment
| Skill | Purpose |
|-------|---------|
| `docker-expert` | Containerization, Compose |
| `deployment-procedures` | Safe deployment workflows |
| `vercel-deployment` | Vercel/Cloudflare deployment |

### Code Quality
| Skill | Purpose |
|-------|---------|
| `code-review-checklist` | PR review best practices |
| `lint-and-validate` | Linting, type checking |
| `codex-review` | Code review with CHANGELOG |

### Other
| Skill | Purpose |
|-------|---------|
| `architecture` | System design, ADRs |
| `systematic-debugging` | Debug methodology |
| `state-persistence` | State persistence patterns |
| `stripe-integration` | Stripe payment patterns |
| `email-systems` | Transactional email |
| `file-uploads` | S3, R2, multipart uploads |

---

## Phase 1: Essential Context (30 seconds)

1. **Project Overview**
   view_file "E:\\ClickFlash\\README.md"

2. **Architecture**
   view_file "E:\\ClickFlash\\ARCHITECTURE.md"

3. **Agent Guidelines**
   view_file "E:\\ClickFlash\\AGENTS.md"

---

## Phase 2: Deep Context (2 minutes)

4. **Full Deep Dive**
   view_file "E:\\ClickFlash\\.agent\\PROJECT_DEEP_DIVE.md"

5. **File Census**
   view_file "E:\\ClickFlash\\.agent\\FILE_CENSUS.md"

6. **Roadmap**
   view_file "E:\\ClickFlash\\.agent\\common\\roadmap.md"

---

## Phase 3: Current Work

7. **Task List** (if exists)
   view_file "E:\\ClickFlash\\.agent\\task.md"

8. **Scratchpad State**
   view_file "E:\\ClickFlash\\.agent\\scratchpad.log"

9. **Recent Walkthrough** (if exists)
   view_file "E:\\ClickFlash\\.agent\\walkthrough.md"

---

## Skills Reference

### Available Skills: 284
Location: `E:\ClickFlash\.agent\skills\`

### Skills Activation Guide
view_file "E:\\ClickFlash\\.agent\\skills\\application\\SKILL_ACTIVATION_GUIDE.md"

### Trigger On-Demand Skills
```
"Apply vulnerability-scanner for security audit"
"Use bullmq-specialist for queue optimization"
"Apply react-patterns for component architecture"
"Use graphql for API design"
"Apply prisma-expert for ORM patterns"
"Use i18n-localization for translations"
"Apply systematic-debugging for bug investigation"
```

---

## Quick Reference

### Apps
| App | Port | Stack | Location |
|-----|------|-------|----------|
| Master | 8090 | Electron + React 19 | `apps/master/` |
| Touch | 8091 | Electron + React 19 | `apps/touch/` |
| MoneyTrash | 1420 | Tauri + React | `apps/moneytrash/` |
| Management | 8090 | React + Express | `apps/management/` |
| Gallery | 8090 | React + Express + Stripe | `apps/gallery/` |
| Website | 3001 | Next.js 15 | `apps/website/` |

### Commands
```bash
npm run dev:full      # Master + Touch together
npm run dev:master    # Master Portal only
npm run dev:touch     # Touch Kiosk only
npm run build:all     # Build all apps
npm run test:e2e      # Playwright E2E tests
npm run lint          # Lint all files
npm run lint:fix      # Lint with auto-fix
npm run format        # Format with Prettier
```

### Key Directories
| Directory | Purpose |
|-----------|---------|
| `apps/master/backend/` | Express API server |
| `apps/master/src/components/` | React components |
| `apps/master/backend/migrations/` | DB migrations (51 files) |
| `apps/touch/backend/` | Kiosk API server |
| `apps/shared/cloud-schema.sql` | Cloud DB schema |

### Key Technologies
- **Frontend**: React 19, TypeScript, Tailwind CSS 4
- **Backend**: Express, SQLite (better-sqlite3), WebSocket
- **Desktop**: Electron 39, Tauri v2
- **State**: TanStack Query, React Context
- **Testing**: Jest, Playwright
- **AI/ML**: face-api.js, TensorFlow.js
- **Payments**: Stripe
- **Cloud**: Cloudflare Workers, R2, D1

---

## Active Development Rules

1. **No Waterfalls** - Use Promise.all for parallel fetching
2. **Clean Code** - Components < 200 lines, single responsibility
3. **Type Safety** - Strict TypeScript, no `any`
4. **Security First** - Validate all inputs, rate limit all endpoints
5. **Test Coverage** - Write tests for new features
6. **Performance** - Lazy load, code split, optimize images
7. **Dark Mode** - Always support dark mode with Tailwind classes
8. **Absolute Imports** - Use `@/` aliases, not relative paths
9. **Structured Logging** - Use logger, not console.log

---

## Project Stats

| Metric | Value |
|--------|-------|
| Total Apps | 6 |
| Total Skills | 284 |
| Auto-Load Skills | 36 |
| DB Migrations | 51 |
| E2E Tests | 5 |
| Total Files | 900+ |

---

## Skills Index

View all available skills:
```bash
cat E:\ClickFlash\.agent\skills_index.json
```

Browse skills folder:
```bash
ls E:\ClickFlash\.agent\skills\
```

---

*Last Updated: 2026-02-17*
*ClickFlash v4.2.0*
