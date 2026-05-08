# ClickFlash Skills Activation Guide

> How to use the 280+ available skills in `.agent/skills`

---

## 🚀 Quick Start

All skills are located in: `E:\ClickFlash\.agent\skills\`

To use a skill, reference it in your request:

```
"Apply react-best-practices to optimize the Albums component"
"Use database-design skill to optimize photo queries"
"Follow api-security-best-practices to secure the upload endpoint"
```

---

## 📚 Skills by Category

### 🎨 Frontend Development
| Skill | Use When | Triggers |
|-------|----------|----------|
| `react-best-practices` | React/Next.js optimization | Components, data fetching, performance |
| `frontend-dev-guidelines` | React 19/TypeScript patterns | Creating components, features, routing |
| `frontend-design` | UI/UX design | Building interfaces, styling, layouts |
| `tailwind-patterns` | Tailwind CSS | Styling components, responsive design |
| `typescript-expert` | Type safety | Type definitions, generics, strict mode |
| `3d-web-experience` | 3D UI elements | Three.js, React Three Fiber |
| `mobile-design` | Mobile responsiveness | React Native, mobile-first design |

### 🖥️ Backend Development
| Skill | Use When | Triggers |
|-------|----------|----------|
| `backend-dev-guidelines` | Node.js/Express APIs | Routes, controllers, services |
| `nodejs-best-practices` | Server architecture | Framework selection, async patterns |
| `api-patterns` | API design | REST vs GraphQL, versioning |
| `api-security-best-practices` | Security hardening | Auth, validation, rate limiting |
| `nestjs-expert` | Nest.js apps | Module architecture, DI |
| `bullmq-specialist` | Background jobs | Redis queues, job processing |
| `graphql` | GraphQL APIs | Schema design, resolvers |

### 🗄️ Database & Storage
| Skill | Use When | Triggers |
|-------|----------|----------|
| `database-design` | Schema design | PostgreSQL, SQLite, indexing |
| `postgres-best-practices` | PostgreSQL | Optimization, queries |
| `neon-postgres` | Neon serverless | Branching, connection pooling |
| `prisma-expert` | Prisma ORM | Schema, migrations, queries |
| `nosql-expert` | NoSQL (DynamoDB) | Distributed DBs, single-table |
| `file-uploads` | File handling | S3, R2, multipart uploads |

### 🔒 Security
| Skill | Use When | Triggers |
|-------|----------|----------|
| `api-security-best-practices` | API security | Auth, validation, headers |
| `sql-injection-testing` | SQL injection | Database vulnerability testing |
| `xss-html-injection` | XSS prevention | Client-side injection |
| `idor-testing` | Access control | Broken object references |
| `broken-authentication` | Auth testing | Session management |
| `vulnerability-scanner` | Security scans | Automated vulnerability detection |
| `pentest-checklist` | Penetration testing | Security assessment |

### 🧪 Testing & Quality
| Skill | Use When | Triggers |
|-------|----------|----------|
| `testing-patterns` | Unit tests | Jest, factories, mocking |
| `test-driven-development` | TDD workflow | Red-green-refactor |
| `playwright-skill` | E2E testing | Browser automation |
| `lint-and-validate` | Code quality | Linting, type checking |
| `codex-review` | Code reviews | CHANGELOG generation |
| `code-review-checklist` | PR reviews | Review best practices |

### 🏗️ Architecture & DevOps
| Skill | Use When | Triggers |
|-------|----------|----------|
| `architecture` | System design | ADRs, trade-off analysis |
| `docker-expert` | Containerization | Docker, Compose, optimization |
| `aws-serverless` | AWS Lambda | SAM/CDK, cold starts |
| `vercel-deployment` | Vercel deploy | Next.js hosting |
| `ci-cd` | Pipeline setup | GitHub Actions, automation |
| `performance-profiling` | Optimization | Lighthouse, profiling |

### 🤖 AI & Automation
| Skill | Use When | Triggers |
|-------|----------|----------|
| `ai-agents-architect` | Building AI agents | Tool use, memory systems |
| `langgraph` | LangGraph apps | Stateful agents, ReAct |
| `crewai` | Multi-agent teams | Role-based agents |
| `llm-app-patterns` | LLM integration | RAG, prompt management |
| `mcp-builder` | MCP servers | Model Context Protocol |
| `rag-engineer` | RAG systems | Vector stores, retrieval |

---

## 🎯 Skill Combinations for ClickFlash

### Scenario 1: Optimizing Album Page
```
"Apply react-best-practices and frontend-dev-guidelines 
 to optimize the AlbumDetail component"

Skills triggered:
- react-best-practices: Waterfall elimination, lazy loading
- frontend-dev-guidelines: React 19 patterns, Suspense
- clean-code: Component splitting
```

### Scenario 2: Securing Upload API
```
"Use api-security-best-practices and backend-dev-guidelines 
 to secure the photo upload endpoint"

Skills triggered:
- api-security-best-practices: Rate limiting, validation
- backend-dev-guidelines: Layered architecture
- file-uploads: Secure upload handling
```

### Scenario 3: Database Optimization
```
"Apply database-design and postgres-best-practices 
 to optimize photo queries"

Skills triggered:
- database-design: Indexing strategy, query optimization
- postgres-best-practices: PostgreSQL-specific optimizations
```

### Scenario 4: Testing Strategy
```
"Use testing-patterns and playwright-skill 
 to add tests for the Orders flow"

Skills triggered:
- testing-patterns: Unit tests, factories
- playwright-skill: E2E browser testing
```

### Scenario 5: Security Audit
```
"Run vulnerability-scanner and pentest-checklist 
 for security audit"

Skills triggered:
- vulnerability-scanner: Automated scanning
- pentest-checklist: Manual testing checklist
- api-security-best-practices: Fix implementation
```

---

## 🛠️ Most Used Skills for ClickFlash

### Daily Development
1. **clean-code** - Always active for code quality
2. **react-best-practices** - Frontend optimization
3. **backend-dev-guidelines** - API development
4. **typescript-expert** - Type safety

### Weekly Tasks
1. **testing-patterns** - Add/update tests
2. **database-design** - Query optimization
3. **api-security-best-practices** - Security reviews

### Monthly Reviews
1. **performance-profiling** - Lighthouse audits
2. **vulnerability-scanner** - Security scans
3. **architecture** - System design decisions

---

## 📖 Skill Documentation

Each skill contains:
- `SKILL.md` - Main documentation
- Examples and patterns
- Anti-patterns to avoid
- Code samples

Example structure:
```
skills/react-best-practices/
├── SKILL.md           # Main guidelines
├── examples/          # Code examples
└── rules/             # Specific rules
```

---

## 🔍 Finding Skills

### By Keyword Search
```bash
# Search skill descriptions
grep -r "performance" .agent/skills/*/SKILL.md
grep -r "security" .agent/skills/*/SKILL.md
grep -r "optimization" .agent/skills/*/SKILL.md
```

### By Category
- Frontend: `skills/*react*`, `skills/*frontend*`, `skills/*design*`
- Backend: `skills/*backend*`, `skills/*api*`, `skills/*nodejs*`
- Security: `skills/*security*`, `skills/*pentest*`, `skills/*vulnerability*`
- Database: `skills/*database*`, `skills/*postgres*`, `skills/*sql*`

---

## ✅ Auto-Activation Triggers

Skills automatically activate when you mention:

| Keywords | Activated Skills |
|----------|------------------|
| "optimize React", "component performance" | react-best-practices |
| "secure API", "auth", "rate limit" | api-security-best-practices |
| "database", "query", "index" | database-design |
| "test", "jest", "testing" | testing-patterns |
| "docker", "container" | docker-expert |
| "AI agent", "LangChain" | ai-agents-architect, langgraph |
| "refactor", "clean code" | clean-code |

---

## 📊 Skills Statistics

Total: **280+ skills**

| Category | Count |
|----------|-------|
| Security/Pentesting | 35 |
| Frontend Development | 30 |
| Backend Development | 25 |
| Database | 15 |
| AI/ML | 20 |
| DevOps/Deployment | 20 |
| Testing/Quality | 15 |
| Marketing/Growth | 30 |
| General Development | 70 |

---

## 🎓 Recommended Learning Path

### For ClickFlash Team

1. **Week 1**: clean-code, typescript-expert
2. **Week 2**: react-best-practices, frontend-dev-guidelines
3. **Week 3**: backend-dev-guidelines, api-patterns
4. **Week 4**: database-design, testing-patterns
5. **Week 5**: api-security-best-practices, vulnerability-scanner

---

## 🚀 Next Steps

1. Reference skills in your requests
2. Combine multiple skills for complex tasks
3. Review skill documentation before major changes
4. Apply verification scripts after changes

---

*Skills Framework v2.0*
*Location: E:\ClickFlash\.agent\skills*
