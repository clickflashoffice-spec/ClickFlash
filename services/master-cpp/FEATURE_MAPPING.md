# Feature Mapping: Electron (React) → C++ (Qt6)

This document provides a 1:1 mapping between the Master Portal Electron app and the target C++/Qt6 implementation.

---

## Core Modules

### Logger

| Aspect | Electron (TypeScript) | C++ (Qt) |
|--------|---------------------|-----------|
| Library | custom logger.ts | spdlog |
| Output | file + console | rotating file + console |
| Levels | debug, info, warn, error | trace, debug, info, warn, err |
| File | DATA_DIR/logs/*.log | ~/.local/share/clickflash/logs/*.log |
| Syntax | `logger.info("msg", { data })` | `SPDLOG_INFO("msg {}", data)` |

### Config

| Aspect | Electron | C++ |
|--------|----------|-----|
| Storage | config/*.ts + env | QSettings + JSON files |
| Location | HOME/.clickflash/ | QtStandardLocations |
| Format | TypeScript objects | QVariantMap + nlohmann::json |

### Database

| Aspect | Electron | C++ |
|--------|----------|-----|
| Driver | better-sqlite3 | Qt SQL (QSQLITE) |
| WAL mode | pragma wal | `db.open(); db.exec("PRAGMA journal_mode=WAL")` |
| Migrations | SQL files | SQL files (reused) |
| Query builder | raw SQL | QSqlQuery + prepared statements |
| Types | JavaScript objects | QVariantMap |

---

## Backend API Routes

### Auth Routes (`/api/auth/*`)

| Endpoint | Electron | C++ |
|----------|----------|-----|
| POST /login | `routes/auth.ts` | `AuthController::login()` |
| POST /signup | `routes/auth.ts` | `AuthController::signup()` |
| POST /logout | `routes/auth.ts` | `AuthController::logout()` |
| GET /me | `routes/auth.ts` | `AuthController::me()` |

### Collections Routes (`/api/collections/*`)

| Endpoint | Electron | C++ |
|----------|----------|-----|
| GET /:collection/records | `routes/collections.ts` | `CollectionsController::list()` |
| POST /:collection/records | `routes/collections.ts` | `CollectionsController::create()` |
| GET /:collection/records/:id | `routes/collections.ts` | `CollectionsController::get()` |
| PATCH /:collection/records/:id | `routes/collections.ts` | `CollectionsController::update()` |
| DELETE /:collection/records/:id | `routes/collections.ts` | `CollectionsController::remove()` |

### Orders Routes (`/api/orders/*`)

| Endpoint | Electron | C++ |
|----------|----------|-----|
| GET / | `routes/orders.ts` | `OrdersController::index()` |
| POST / | `routes/orders.ts` | `OrdersController::create()` |
| GET /:id | `routes/orders.ts` | `OrdersController::show()` |
| PATCH /:id | `routes/orders.ts` | `OrdersController::update()` |
| POST /:id/fulfillment/push | `routes/orders.ts` | `OrdersController::pushFulfillment()` |
| POST /:id/print | `routes/orders.ts` | `OrdersController::print()` |

### Sync Routes (`/api/sync/*`)

| Endpoint | Electron | C++ |
|----------|----------|-----|
| POST /mutation | `routes/sync.ts` | `SyncController::mutation()` |
| GET /status | `routes/sync.ts` | `SyncController::status()` |
| POST /resolve | `routes/sync.ts` | `SyncController::resolve()` |

### Pairing Routes (`/api/pairing/*`)

| Endpoint | Electron | C++ |
|----------|----------|-----|
| POST /initiate | `routes/pairing.ts` | `PairingController::initiate()` |
| POST /verify | `routes/pairing.ts` | `PairingController::verify()` |
| GET /status | `routes/pairing.ts` | `PairingController::status()` |

### System Routes (`/api/system/*`)

| Endpoint | Electron | C++ |
|----------|----------|-----|
| GET /health | `routes/system.ts` | `SystemController::health()` |
| GET /stats | `routes/system.ts` | `SystemController::stats()` |
| GET /info | `routes/system.ts` | `SystemController::info()` |

---

## Middleware

| Electron | C++ |
|----------|-----|
| session.ts | SessionMiddleware |
| auth.ts | AuthMiddleware |
| csrf.ts | CsrfMiddleware |
| rateLimiting.ts | RateLimitMiddleware |
| permissions.ts | PermissionMiddleware |
| lanSigningMiddleware.ts | LanSigningMiddleware |

---

## Services

| Electron | C++ |
|----------|-----|
| AuthService | AuthService |
| CollectionService | CollectionService |
| OrderService | OrderService |
| PhotoService | PhotoService |
| SyncService | SyncService |
| FulfillmentService | FulfillmentService |
| QueueProcessor | QueueProcessor |
| RealtimeService | RealtimeService |
| StripeService | StripeService |
| CloudSyncService | CloudSyncService |
| LedgerService | LedgerService |
| VectorIndexService | VectorIndexService |
| EmailService | EmailService |
| CircuitBreaker | CircuitBreaker |

---

## React Components → Qt Views

### Layout

| React | Qt |
|-------|-----|
| MainLayout.tsx | MainWindow |
| NavigationSidebar | NavigationSidebar |
| TopBar | TitleBar |

### Pages

| React | Qt |
|-------|-----|
| Dashboard.tsx | DashboardView |
| Albums.tsx | AlbumsView |
| AlbumEditor.tsx | AlbumEditorView |
| OrderManagementView.tsx | OrdersView |
| OrderDetail.tsx | OrderDetailView |
| Photographers.tsx | PhotographersView |
| Clients.tsx | ClientsView |
| SettingsPage.tsx | SettingsView |

### Widgets

| React | Qt |
|-------|-----|
| PhotoGrid | PhotoGrid |
| OrderCard | OrderCard |
| AlbumCard | AlbumCard |
| StatCard | StatCard |
| Modal | QDialog |
| Toast | NotificationWidget |
| Button | QPushButton |
| Input | QLineEdit |
| Select | QComboBox |
| Table | QTableWidget |
| Charts | QChart (Qt Charts) |

---

## Type Mappings

| TypeScript | C++ |
|------------|-----|
| string | QString |
| number | double / int |
| boolean | bool |
| string[] | QStringList |
| object | QVariantMap |
| Date | QDateTime |
| null | nullptr |
| undefined | - |

---

## Database Type Mappings

| SQLite | C++ |
|--------|-----|
| TEXT | QString |
| INTEGER | qint64 / int |
| REAL | double |
| BLOB | QByteArray |
| NUMERIC | QVariant |

---

## Environment Variables

| Electron | C++ |
|----------|-----|
| NODE_ENV | QT_ENV / qEnvironmentVariable |
| JWT_SECRET | JWT_SECRET |
| SERVICE_SECRET | SERVICE_SECRET |
| DATABASE_PATH | DATABASE_PATH |
| PORT | PORT (for HTTP server) |

---

## File Paths

| Electron | C++ |
|----------|-----|
| process.resourcesPath | QCoreApplication::applicationDirPath() |
| os.homedir() | QDir::homePath() |
| app.getPath('userData') | QStandardPaths::writableLocation(QStandardPaths::AppDataLocation) |
| DATA_DIR | QStandardPaths::writableLocation(QStandardPaths::AppDataLocation) + "/data" |

---

## Qt-Specific Features

### Signals & Slots (Event System)

```cpp
// Instead of React events
connect(photoGrid, &PhotoGrid::photoSelected, this, &AlbumView::onPhotoSelected);

// Instead of context.emit()
emit orderUpdated(order);
```

### Property System

```cpp
// Instead of React state
class Order : public QObject {
    Q_OBJECT
    Q_PROPERTY(QString clientName READ clientName WRITE setClientName NOTIFY clientNameChanged)
};
```

### Model/View (Tables)

```cpp
// Instead of manual rendering
QSqlTableModel *model = new QSqlTableModel(this);
model->setTable("orders");
model->select();

QTableView *view = new QTableView;
view->setModel(model);
```

---

## Missing Equivalents

| Electron Feature | Qt Alternative |
|-----------------|----------------|
| React components | Qt Widgets + QML |
| React Query | QTimer + QAbstractTableModel |
| React Router | QStackedWidget + manual navigation |
| CSS-in-JS | Qt StyleSheets + QSS |
| npm packages | CMake find_package / vcpkg |

---

## Performance Comparison

| Metric | Electron | C++/Qt |
|--------|----------|---------|
| Startup | ~5s | ~1.5s |
| Memory (idle) | ~300MB | ~80MB |
| Binary size | ~150MB | ~60MB |
| CPU (idle) | ~2% | ~0.5% |

---

## Testing Strategy

| Electron | C++ |
|----------|-----|
| Jest | Qt Test (QTestLib) |
| Playwright | Squish / pytest (auto) |
| React Testing Library | QSignalSpy |
| Mock Service Worker | MockNetworkAccessManager |

---

**Mapping Version:** 1.0  
**Last Updated:** 2026-04-08