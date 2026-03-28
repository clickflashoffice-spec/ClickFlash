# ClickFlash Project Index

> Quick navigation guide for the ClickFlash Photography Ecosystem

---

## 📚 Documentation Index

### Getting Started
| Document | Description |
|----------|-------------|
| [README.md](README.md) | Main project overview and quick start |
| [INSTALL.md](INSTALL.md) | Detailed installation instructions |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contribution guidelines and workflow |

### Development
| Document | Description |
|----------|-------------|
| [TESTING_GUIDE.md](TESTING_GUIDE.md) | Testing strategy and commands |
| [API.md](API.md) | Complete REST API documentation |
| [INTEGRATION.md](INTEGRATION.md) | Inter-app integration guide |

### Operations
| Document | Description |
|----------|-------------|
| [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | Production deployment steps |
| [CHANGELOG.md](CHANGELOG.md) | Version history and changes |
| [BAT_FILES_GUIDE.md](BAT_FILES_GUIDE.md) | Windows batch scripts guide |

### Project Status
| Document | Description |
|----------|-------------|
| [PROJECT_STATUS.md](PROJECT_STATUS.md) | Current development status |
| [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) | Comprehensive project overview |
| [CRITICAL_ISSUES.md](CRITICAL_ISSUES.md) | Known issues and fixes |
| [GAP_ANALYSIS.md](GAP_ANALYSIS.md) | Feature gap analysis |

### Feature Roadmaps
| Document | Description |
|----------|-------------|
| [DSR_DAILY_SALES_REPORT_ROADMAP.md](plans/DSR_DAILY_SALES_REPORT_ROADMAP.md) | Global Master analytics & Daily Sales Report |
| [RESORT_DASHBOARD_ROADMAP.md](plans/RESORT_DASHBOARD_ROADMAP.md) | Hotel Photography Resort BI Dashboard |
| [RESORT_DATA_INPUT_STRATEGY.md](plans/RESORT_DATA_INPUT_STRATEGY.md) | Where to input arrivals/departures (Master vs Management) |
| [RESORT_AUTO_MEETING_CALCULATION.md](plans/RESORT_AUTO_MEETING_CALCULATION.md) | Auto-calculate meetings from order timestamps |
| [RESORT_FULLY_AUTOMATIC_DETECTION.md](plans/RESORT_FULLY_AUTOMATIC_DETECTION.md) | 100% automatic M. Taken & M. No Sale detection |
| [PRODUCTION_DEPLOYMENT_3HOTELS.md](plans/PRODUCTION_DEPLOYMENT_3HOTELS.md) | Production deployment for 3 Sousse hotels (TN001-003) |

### Master Documentation
| Document | Description |
|----------|-------------|
| [CLICKFLASH_ECOSYSTEM_MASTER_DOCUMENT.md](plans/CLICKFLASH_ECOSYSTEM_MASTER_DOCUMENT.md) | **Complete ecosystem overview** - All features, architecture, improvement ideas |

### Architecture
| Document | Description |
|----------|-------------|
| [ORGANIZATION.md](ORGANIZATION.md) | File organization standards |
| [COMPLETION_SUMMARY.md](COMPLETION_SUMMARY.md) | Completion tracking |

---

## 🗂️ Configuration Files

### Environment Templates
| File | Purpose |
|------|---------|
| [.env.example](.env.example) | Root environment variables |
| [apps/master/.env.example](apps/master/.env.example) | Master app config |
| [apps/touch/.env.example](apps/touch/.env.example) | Touch kiosk config |
| [apps/moneytrash/.env.example](apps/moneytrash/.env.example) | MoneyTrash config |
| [apps/management/.env.example](apps/management/.env.example) | Management hub config |
| [apps/gallery/.env.example](apps/gallery/.env.example) | Gallery config |

### Build & Deploy
| File | Purpose |
|------|---------|
| [docker-compose.yml](docker-compose.yml) | Docker development setup |
| [Dockerfile](Dockerfile) | Production Docker image |
| [Makefile](Makefile) | Cross-platform build commands |
| [.github/workflows/ci.yml](.github/workflows/ci.yml) | CI pipeline |
| [.github/workflows/cd.yml](.github/workflows/cd.yml) | CD pipeline |
| [.github/workflows/e2e.yml](.github/workflows/e2e.yml) | E2E tests |

### Project Metadata
| File | Purpose |
|------|---------|
| [package.json](package.json) | Root package configuration |
| [LICENSE](LICENSE) | MIT License |
| [.gitignore](.gitignore) | Git ignore rules |

---

## 🚀 Quick Commands

### Setup
```bash
# Install all dependencies
install-all.bat
# OR
make install-all

# Copy environment files
copy .env.example .env
copy apps\master\.env.example apps\master\.env
```

### Development
```bash
# Start all apps
start-all.bat
# OR
make start-all

# Start specific app
cd apps/master && npm run dev:full
cd apps/touch && npm run dev
```

### Testing
```bash
# Run all tests
test-all.bat
# OR
make test-all

# E2E tests
make test-e2e-master
make test-e2e-touch
```

### Build
```bash
# Build all apps
build-all.bat
# OR
make build-all

# Package desktop apps
make dist-all
```

### Docker
```bash
# Start development environment
docker-compose up -d
# OR
make docker-up

# View logs
make docker-logs
```

---

## 📱 Applications

| App | Port | Path | Stack |
|-----|------|------|-------|
| Master | 8090 | `apps/master` | Electron + React |
| Touch | 8091 | `apps/touch` | Electron + React |
| MoneyTrash | 3000 | `apps/moneytrash` | Next.js |
| Management | 5173 | `apps/management` | React + Vite |
| Gallery | 5174 | `apps/gallery` | React + Vite |
| Website | 3001 | `apps/website` | Next.js |

---

## 🔧 Batch Scripts (46 total)

| Script | Purpose |
|--------|---------|
| `install-all.bat` | Install all dependencies |
| `build-all.bat` | Build all applications |
| `start-all.bat` | Start all apps |
| `test-all.bat` | Run all tests |
| `clean-all.bat` | Clean all build artifacts |
| `kill-all.bat` | Kill all Node processes |
| `status.bat` | Check project status |

**Per-app scripts** in each `apps/*/scripts/` folder:
- `install.bat` - Install dependencies
- `build.bat` - Build application
- `start.bat` - Start development server
- `test.bat` - Run tests
- `clean.bat` - Clean build artifacts
- `package.bat` - Package for distribution

---

## 📊 Project Statistics

| Metric | Count |
|--------|-------|
| Applications | 6 |
| Total Files | 1,200+ |
| Lines of Code | 85,000+ |
| React Components | 450+ |
| API Endpoints | 120+ |
| Batch Scripts | 46 |
| Documentation Pages | 15+ |
| CI/CD Workflows | 3 |
| Skills Learned | 280+ |

---

## 🆘 Support

### Getting Help
1. Check the [documentation](#-documentation-index) above
2. Review [CRITICAL_ISSUES.md](CRITICAL_ISSUES.md) for known problems
3. Search existing GitHub issues
4. Create a new issue with:
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Environment details

### Contact
- **Email**: support@clickflash.app
- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions

---

## 🎯 Roadmap

### Active Feature Development (Phase 83)
- **[Production Deployment: 3 Hotels](plans/PRODUCTION_DEPLOYMENT_3HOTELS.md)** - Marhaba Occidental, Mathaba Club, Concorde Green Park (Sousse, Tunisia)
- **[Cloudflare Email Integration](plans/ROADMAP_AUDIT_REPORT.md)** - Site-specific emails and automated campaigns (Phase 85)

### Recently Completed
- **[DSR & Resort Dashboard](plans/DSR_DAILY_SALES_REPORT_ROADMAP.md)** - Global Management Analytics (Phase 74-75) ✅
- **[Local BI Dashboard](plans/RESORT_DASHBOARD_ROADMAP.md)** - Master App Local BI View (Phase 81) ✅
- **[Session Booking](plans/ROADMAP_AUDIT_REPORT.md)** - Automated booking & calendar (Phase 84) ✅

### Full Roadmap
See [.agent/roadmap.md](.agent/roadmap.md) for complete project roadmap (82 of 89 phases complete)

---

*Quick tip: Use `Ctrl+F` to search this index for specific topics.*

*Last Updated: 2026-03-07*
