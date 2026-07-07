# Evidence Collection Script

## Purpose
This script automates evidence collection for the ClickFlash Ecosystem Audit.

## Usage

```bash
# Collect all evidence
node collect_evidence.js

# Collect specific app evidence
node collect_evidence.js --app master

# Collect specific domain evidence
node collect_evidence.js --domain security
```

## Evidence Categories

### Architecture Evidence
- Folder structure screenshots
- Component dependency graphs
- Database schema exports
- Configuration files

### Security Evidence
- Environment variable files (sanitized)
- Auth middleware code
- Secret scanning results
- TLS configuration

### Feature Evidence
- UI screenshots
- Feature matrix exports
- API response samples

### Backend Evidence
- Route handler code
- API response schemas
- Error handling middleware

### Performance Evidence
- Health endpoint responses
- Query execution plans
- Configuration limits

### Data Governance Evidence
- Database schema with classifications
- Data flow diagrams
- Retention policy scripts

### Compliance Evidence
- Privacy policy documents
- Audit log configurations
- Training records

### Observability Evidence
- Logger configuration
- Metrics endpoint responses
- Alert configurations

### Integration Evidence
- Third-party API configurations
- Dependency version lists

---

*For manual evidence collection, use the templates in /templates*
