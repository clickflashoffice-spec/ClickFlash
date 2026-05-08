---
category: development
priority: medium
---

# Development Workflow

> **Operational Law 11**: All development artifacts MUST be stored in the `.agent` folder at the project root.

---

## Artifact Storage

### Location

All artifacts are stored in:

```
d:\master os\New folder\.agent\
```

### Artifact Types

| File | Purpose | Update Frequency |
|------|---------|------------------|
| `task.md` | Current task checklist and progress | Continuously during work |
| `implementation_plan.md` | Technical plans for major features | Before starting new features |
| `walkthrough.md` | Documentation of completed work | After completing features |
| `roadmap.md` | Project roadmap and future plans | Weekly/monthly |

### Benefits

1. **Cross-Laptop Sync**: Artifacts are in the project directory, not user-specific folders
2. **Version Control**: Can be committed to Git for team collaboration
3. **Persistence**: Survives across different development sessions and machines
4. **Accessibility**: Easy to find and reference in any development environment

---

## Development Best Practices

### Before Starting Work

**The Loop Rule (Operational Law 10)**:
> Review all rules before starting any major task, code generation, or deployment phase.

**Checklist**:

- [ ] Review [core principles](01-core-principles.md)
- [ ] Check [operational laws](02-operational-laws.md)
- [ ] Confirm Master vs Touch context ([Law 01](02-operational-laws.md#law-01-dual-scope-path-guard))
- [ ] Update `task.md` with new tasks
- [ ] Create `implementation_plan.md` if needed

### During Development

**Code Organization**:

```
Master App Python/
├── backend/
│   ├── main.py              # FastAPI app
│   ├── config.py            # Configuration
│   ├── models/              # Database models
│   ├── routes/              # API routes
│   ├── services/            # Business logic
│   └── utils/               # Utility functions
├── frontend/
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── assets/
├── local/                   # Local data storage
├── tests/                   # Test files
└── requirements.txt         # Dependencies
```

**Commit Messages**:

```bash
# Format: [App] Category: Description

git commit -m "[Master] Feature: Add face recognition indexing"
git commit -m "[Touch] Fix: Resolve order creation bug"
git commit -m "[Both] Refactor: Update asset tiering logic"
```

### After Completing Work

**Update Artifacts**:

1. Mark tasks as complete in `task.md`
2. Create `walkthrough.md` documenting changes
3. Update `roadmap.md` if priorities changed

---

## Testing Requirements

### Unit Tests

```python
# tests/test_photo_processing.py
import pytest
from backend.services.photo_service import process_photo

def test_generate_tiny_tier():
    """Test tiny tier generation"""
    result = process_photo("test.jpg", tier="tiny")
    
    assert result.width <= 100
    assert result.height <= 100
    assert result.format == "WEBP"

def test_generate_preview_tier():
    """Test preview tier generation"""
    result = process_photo("test.jpg", tier="preview")
    
    assert result.width <= 1200
    assert result.height <= 1200
    assert result.format == "JPEG"
```

### Integration Tests

```python
# tests/test_order_flow.py
import pytest
from backend.services.order_service import create_order, push_to_master

@pytest.mark.asyncio
async def test_order_creation_and_push():
    """Test complete order flow"""
    
    # Create order in Touch
    order = await create_order({
        "customer_name": "Test Customer",
        "selected_photos": ["photo1.jpg", "photo2.jpg"]
    })
    
    assert order.id is not None
    
    # Push to Master
    result = await push_to_master(order)
    
    assert result.success is True
    assert os.path.exists(f"Master App Python/local/orders/from_touch/{order.id}.json")
```

### Test Coverage

```bash
# Run tests with coverage
pytest --cov=backend --cov-report=html

# Minimum coverage: 80%
```

---

## Deployment Procedures

### Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] Version number incremented
- [ ] Changelog updated
- [ ] Artifacts up to date

### Deployment Steps

**1. Build Applications**:

```bash
# Master-App
cd "Master App Python"
python -m PyInstaller main.spec

# Touch-App
cd "Touch App Python"
python -m PyInstaller main.spec
```

**2. Test Built Applications**:

```bash
# Test Master
cd "Master App Python/dist"
./MasterApp.exe

# Test Touch
cd "Touch App Python/dist"
./TouchApp.exe
```

**3. Create Installers** (NSIS):

```bash
# Build NSIS installer
makensis master-installer.nsi
makensis touch-installer.nsi
```

**4. Deploy**:

```bash
# Copy installers to deployment location
cp MasterAppSetup.exe "\\deployment-server\installers\"
cp TouchAppSetup.exe "\\deployment-server\installers\"
```

---

## Version Control

### Git Workflow

```bash
# Feature branch workflow
git checkout -b feature/face-recognition-indexing

# Make changes
git add .
git commit -m "[Master] Feature: Add face recognition indexing"

# Push to remote
git push origin feature/face-recognition-indexing

# Create pull request
# After review, merge to main
```

### Branch Strategy

```
main                    # Production-ready code
├── develop             # Development branch
│   ├── feature/*       # Feature branches
│   ├── bugfix/*        # Bug fix branches
│   └── hotfix/*        # Urgent fixes
```

---

## Code Review Guidelines

### Review Checklist

**Operational Laws**:

- [ ] Confirms Master vs Touch context (Law 01)
- [ ] Follows data flow rules (Laws 02, 06, 07, 08, 09)
- [ ] Maintains scope integrity (Law 04)
- [ ] Respects data role separation (Law 05)

**Code Quality**:

- [ ] Follows Python PEP 8 style guide
- [ ] Has appropriate type hints
- [ ] Includes docstrings
- [ ] Has unit tests
- [ ] No hardcoded values (use config)

**Performance**:

- [ ] Efficient database queries
- [ ] Proper async/await usage
- [ ] No blocking operations in async code
- [ ] Appropriate caching

**Security**:

- [ ] No SQL injection vulnerabilities
- [ ] Proper input validation
- [ ] No hardcoded credentials
- [ ] Follows kiosk mode requirements

---

## Documentation Standards

### Code Documentation

```python
def process_photo(photo_path: str, album_id: int) -> dict:
    """
    Process a photo through the complete pipeline.
    
    This function handles:
    1. Raw photo import
    2. Edit application
    3. Asset tier generation (tiny/preview/fulfillment)
    4. Face recognition indexing
    5. Push to Touch-App
    
    Args:
        photo_path: Absolute path to the photo file
        album_id: ID of the album this photo belongs to
    
    Returns:
        Dictionary containing paths to all generated tiers:
        {
            "tiny": "path/to/tiny.webp",
            "preview": "path/to/preview.jpg",
            "fulfillment": "path/to/fulfillment.jpg"
        }
    
    Raises:
        FileNotFoundError: If photo_path doesn't exist
        ValueError: If album_id is invalid
    
    Example:
        >>> result = process_photo("photo.jpg", album_id=1)
        >>> print(result["tiny"])
        "local/assets/tiny/photo_tiny.webp"
    """
    pass
```

### API Documentation

```python
@app.post("/api/photos/process", response_model=PhotoProcessResult)
async def process_photo_endpoint(
    photo_id: int,
    album_id: int
) -> PhotoProcessResult:
    """
    Process a photo through the complete pipeline.
    
    **Endpoint**: `POST /api/photos/process`
    
    **Request Body**:
    ```json
    {
        "photo_id": 123,
        "album_id": 1
    }
    ```
    
    **Response**:
    ```json
    {
        "photo_id": 123,
        "tiers": {
            "tiny": "path/to/tiny.webp",
            "preview": "path/to/preview.jpg",
            "fulfillment": "path/to/fulfillment.jpg"
        },
        "faces_found": 2
    }
    ```
    
    **Errors**:
    - `404`: Photo not found
    - `500`: Processing failed
    """
    pass
```

---

## Performance Monitoring

### Logging

```python
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# Log important events
logger.info("Photo processing started", extra={"photo_id": photo_id})
logger.warning("Face detection found no faces", extra={"photo_id": photo_id})
logger.error("Failed to generate preview tier", extra={"error": str(e)})
```

### Performance Metrics

```python
import time
from functools import wraps

def measure_time(func):
    """Decorator to measure function execution time"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        start = time.time()
        result = await func(*args, **kwargs)
        duration = time.time() - start
        
        logger.info(f"{func.__name__} took {duration:.2f}s")
        return result
    
    return wrapper

@measure_time
async def process_photo(photo_path: str, album_id: int):
    # Processing logic
    pass
```

---

## Troubleshooting

### Common Issues

**Issue**: Import errors between Master and Touch

**Solution**: Verify you're in the correct app directory and not importing from the other app

**Issue**: Database locked errors

**Solution**: Ensure only one instance of the app is running, use proper async database connections

**Issue**: Slow photo processing

**Solution**: Enable batch processing, use async operations, consider GPU acceleration for face recognition

---

## Summary

**Development Workflow**:

1. **Before**: Review rules, update task.md, create plan
2. **During**: Follow code standards, write tests, commit regularly
3. **After**: Update artifacts, create walkthrough, deploy

**Key Principles**:

- Store artifacts in `.agent` folder
- Follow The Loop Rule
- Maintain test coverage
- Document thoroughly
- Review code carefully

This workflow ensures **consistent, high-quality development** across all platforms.
