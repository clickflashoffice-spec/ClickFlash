# React to C++ Feature Mapping

## Overview

This document provides a comprehensive mapping of all features, components, and services from the React Master and Touch applications to their C++ Qt6 equivalents. This ensures complete feature parity during migration.

---

## Master App React Analysis

### Application Structure

**React Entry Point**: `App.tsx`

- **Authentication Flow**: Session-based with localStorage fallback
- **Real-time Updates**: WebSocket + Server-Sent Events (SSE)
- **Offline Support**: Service Worker for offline orders
- **Data Versioning**: `dataVersionManager` for incremental updates

**C++ Equivalent**:

```cpp
class Application {
    LoginWindow* loginWindow;
    MainWindow* mainWindow;
    WebSocketClient* wsClient;
    SSEClient* sseClient;
    SessionManager* sessionManager;
};
```

### Master App Components (122 Total)

#### Core Pages

| React Component | Description | Qt6 Equivalent | Priority |
|----------------|-------------|----------------|----------|
| `Dashboard.tsx` | KPI dashboard, recent activity | `DashboardPage` (QWidget) | High |
| `Albums.tsx` | Album grid, filtering, sorting | `AlbumsPage` (QWidget + QGridLayout) | High |
| `AlbumDetail.tsx` | Photo grid for album | `AlbumDetailView` (QScrollArea + VirtualGrid) | High |
| `Orders.tsx` | Order management table | `OrdersPage` (QTableView + Model) | High |
| `Photos.tsx` | Global photo library | `PhotosPage` (QWidget + VirtualGrid) | Medium |
| `Clients.tsx` | Customer database | `ClientsPage` (QTableView) | Medium |
| `Photographers.tsx` | User management | `PhotographersPage` (QTableView) | Medium |
| `Bookings.tsx` | Calendar bookings | `BookingsPage` (QCalendarWidget) | Medium |
| `ProductsPage.tsx` | Product catalog | `ProductsPage` (QListView) | Low |
| `Locations.tsx` | Destination management | `LocationsPage` (QListView) | Low |

#### Album Features

| React Component | Description | Qt6 Equivalent |
|----------------|-------------|----------------|
| `albums/Editor/EditorSidebar.tsx` | Photo editing tools | `EditorSidebar` (QDockWidget) |
| `albums/Editor/Filmstrip.tsx` | Thumbnail filmstrip | `Filmstrip` (QListView horizontal) |
| `albums/Editor/VirtualFilmstrip.tsx` | Optimized filmstrip | `VirtualFilmstrip` (Custom QAbstractItemView) |
| `albums/TetherMode.tsx` | Live camera tethering | `TetherMode` (QWidget + File Watcher) |
| `albums/ImportAlbumModal.tsx` | Import dialog | `ImportDialog` (QDialog) |
| `albums/FileBrowserModal.tsx` | File picker | `FileBrowserDialog` (QFileDialog) |

#### Common UI Components

| React Component | Description | Qt6 Equivalent |
|----------------|-------------|----------------|
| `common/Button.tsx` | Styled button | `ModernButton` (QPushButton) |
| `common/Modal.tsx` | Dialog overlay | `QDialog` |
| `common/Card.tsx` | Container card | `QFrame` with stylesheet |
| `common/Input.tsx` | Text input | `QLineEdit` |
| `common/Spinner.tsx` | Loading indicator | `QProgressIndicator` |
| `common/Toast.tsx` | Notification | `QMessageBox` or custom |
| `common/VirtualGrid.tsx` | Optimized photo grid | `VirtualGrid` (QAbstractItemView) |
| `common/LazyImage.tsx` | Lazy-loaded images | `LazyImageWidget` (QLabel + async loader) |
| `common/Skeleton.tsx` | Loading placeholder | `SkeletonWidget` (QWidget + animation) |
| `common/ErrorBoundary.tsx` | Error handling | C++ exception handling |
| `common/ConfirmationModal.tsx` | Confirm dialog | `QMessageBox::question` |

#### Settings Components

| React Component | Description | Qt6 Equivalent |
|----------------|-------------|----------------|
| `settings/GeneralSettings.tsx` | General config | `GeneralSettingsTab` (QWidget) |
| `settings/UserManagement.tsx` | User CRUD | `UserManagementTab` (QTableView) |
| `settings/BackupSettings.tsx` | Backup config | `BackupSettingsTab` (QWidget) |
| `settings/PrintingSettings.tsx` | Printer setup | `PrintingSettingsTab` (QWidget) |
| `settings/WatermarkSettings.tsx` | Watermark config | `WatermarkSettingsTab` (QWidget) |
| `settings/KioskManagement.tsx` | Kiosk devices | `KioskManagementTab` (QTableView) |
| `settings/CloudSyncSettings.tsx` | Cloud integration | `CloudSyncTab` (QWidget) |
| `settings/DatabaseSettings.tsx` | DB management | `DatabaseSettingsTab` (QWidget) |

#### Dialogs & Modals

| React Component | Description | Qt6 Equivalent |
|----------------|-------------|----------------|
| `PhotoEditModal.tsx` | Photo editor | `PhotoEditorDialog` (QDialog) |
| `AIIdeasModal.tsx` | AI suggestions | `AIIdeasDialog` (QDialog) |
| `BookingEditModal.tsx` | Edit booking | `BookingDialog` (QDialog) |
| `PasswordModal.tsx` | Password prompt | `PasswordDialog` (QInputDialog) |
| `ReleaseNotesModal.tsx` | Changelog | `ReleaseNotesDialog` (QDialog) |
| `FileTransferDialog.tsx` | Upload progress | `FileTransferDialog` (QProgressDialog) |
| `ImportProgressModal.tsx` | Import progress | `ImportProgressDialog` (QProgressDialog) |

### Master App Services (38 Total)

#### Core Services

| React Service | Description | C++ Equivalent |
|--------------|-------------|----------------|
| `apiService.ts` | REST API client | `ApiClient` (QNetworkAccessManager) |
| `webSocketService.ts` | Real-time updates | `WebSocketClient` (QWebSocket) |
| `db.ts` | IndexedDB wrapper | `Database` (QSqlDatabase) |
| `pb.ts` | PocketBase adapter | `ApiClient` (custom REST) |
| `dataVersionManager.ts` | Data sync versioning | `DataVersionManager` (C++ class) |
| `tokenRefreshService.ts` | Auth token refresh | `TokenRefreshService` (QTimer) |
| `serviceWorkerService.ts` | Offline support | Not needed (native offline) |
| `sentryService.ts` | Error tracking | `ErrorReporter` (optional) |

#### API Services (in `services/api/`)

| React Service | Description | C++ Equivalent |
|--------------|-------------|----------------|
| `albumsApi.ts` | Album CRUD | `AlbumService::fetchAll/create/update/delete` |
| `photosApi.ts` | Photo CRUD | `PhotoService::fetchAll/create/update/delete` |
| `ordersApi.ts` | Order CRUD | `OrderService::fetchAll/create/update/delete` |
| `clientsApi.ts` | Client CRUD | `ClientService::fetchAll/create/update/delete` |
| `photographersApi.ts` | User CRUD | `PhotographerService::fetchAll/create/update/delete` |
| `bookingsApi.ts` | Booking CRUD | `BookingService::fetchAll/create/update/delete` |
| `productsApi.ts` | Product CRUD | `ProductService::fetchAll/create/update/delete` |
| `settingsApi.ts` | Settings CRUD | `SettingsService::get/set` |
| `kioskApi.ts` | Kiosk management | `KioskService::fetchAll/register/update` |
| `faceRecognitionApi.ts` | Face search | `FaceRecognitionService::search/index` |
| `syncApi.ts` | Sync operations | `SyncService::syncAlbum/syncPhotos` |
| `exportApi.ts` | Export operations | `ExportService::exportAlbum/exportOrder` |
| `printApi.ts` | Print operations | `PrintService::print/getPrinters` |
| `backupApi.ts` | Backup operations | `BackupService::backup/restore` |
| `cloudApi.ts` | Cloud sync | `CloudSyncService::sync/upload/download` |

#### Utility Services

| React Service | Description | C++ Equivalent |
|--------------|-------------|----------------|
| `geminiService.ts` | AI integration | `GeminiService` (QNetworkAccessManager) |
| `cloudApiService.ts` | Cloud API | `CloudApiClient` (QNetworkAccessManager) |

---

## Touch App React Analysis

### Application Structure

**React Entry Point**: `App.tsx` (TouchPortal)

- **Kiosk Mode**: Fullscreen, idle timeout, admin override
- **Cart Persistence**: localStorage for cart state
- **Room Filtering**: Filter photos by room number
- **Face Search**: RFID + Face recognition login

**C++ Equivalent**:

```cpp
class Application {
    AttractScreen* attractScreen;
    SelectionView* selectionView;
    CheckoutView* checkoutView;
    KioskContext* kioskContext;
    IdleTimer* idleTimer;
};
```

### Touch App Components (35 Total)

#### Core Screens

| React Component | Description | Qt6 Equivalent | Priority |
|----------------|-------------|----------------|----------|
| `touch/WelcomeScreen.tsx` | Attract screen, idle state | `AttractScreen` (QWidget fullscreen) | High |
| `touch/PhotoSelectionScreen.tsx` | Photo grid with cart | `SelectionView` (QScrollArea + VirtualGrid) | High |
| `touch/PhotoPreviewScreen.tsx` | Full-screen photo view | `PhotoPreviewScreen` (QLabel fullscreen) | High |
| `touch/OrderConfigurationScreen.tsx` | Checkout, payment | `CheckoutView` (QWidget) | High |
| `touch/ThankYouScreen.tsx` | Order confirmation | `ThankYouScreen` (QWidget) | High |
| `DeviceSetup.tsx` | Initial kiosk setup | `DeviceSetupDialog` (QDialog) | High |

#### Touch UI Components

| React Component | Description | Qt6 Equivalent |
|----------------|-------------|----------------|
| `touch/SelectionCartBar.tsx` | Cart summary bar | `CartBar` (QWidget) |
| `touch/FaceSearchModal.tsx` | Face search dialog | `FaceSearchDialog` (QDialog) |
| `touch/RoomNumberModal.tsx` | Room input | `RoomNumberDialog` (QDialog) |
| `touch/NumericKeypad.tsx` | Touch keypad | `NumericKeypad` (QWidget) |
| `touch/OnScreenKeyboard.tsx` | Touch keyboard | `OnScreenKeyboard` (QWidget) |
| `touch/ConnectionStatusIndicator.tsx` | Master connection status | `ConnectionIndicator` (QLabel) |
| `touch/PairingCodeModal.tsx` | Pairing dialog | `PairingDialog` (QDialog) |
| `touch/KioskSettingsModal.tsx` | Kiosk config | `KioskSettingsDialog` (QDialog) |
| `touch/PasswordModal.tsx` | Admin password | `PasswordDialog` (QInputDialog) |

#### Touch Settings

| React Component | Description | Qt6 Equivalent |
|----------------|-------------|----------------|
| `touch/settings/ConnectionSettings.tsx` | Master IP config | `ConnectionSettingsTab` (QWidget) |
| `touch/settings/IdentitySettings.tsx` | Kiosk ID | `IdentitySettingsTab` (QWidget) |
| `touch/settings/AccessSettings.tsx` | Security settings | `AccessSettingsTab` (QWidget) |
| `touch/settings/SecuritySettings.tsx` | PIN, timeout | `SecuritySettingsTab` (QWidget) |

#### Common Components (Shared with Master)

| React Component | Description | Qt6 Equivalent |
|----------------|-------------|----------------|
| `common/Button.tsx` | Touch-optimized button | `TouchButton` (QPushButton large) |
| `common/Card.tsx` | Container | `QFrame` |
| `common/Input.tsx` | Text input | `QLineEdit` |
| `common/Modal.tsx` | Dialog | `QDialog` |
| `common/Spinner.tsx` | Loading | `QProgressIndicator` |
| `common/VirtualGallery.tsx` | Optimized grid | `VirtualGallery` (QAbstractItemView) |
| `common/ErrorBoundary.tsx` | Error handling | C++ exceptions |
| `common/OfflineScreen.tsx` | Offline indicator | `OfflineScreen` (QWidget) |
| `common/SyncStatusIndicator.tsx` | Sync status | `SyncIndicator` (QLabel) |

### Touch App Services (18 Total)

| React Service | Description | C++ Equivalent |
|--------------|-------------|----------------|
| `apiService.ts` | Master API client | `MasterApiClient` (QNetworkAccessManager) |
| `syncService.ts` | Photo/album sync | `SyncService` (QtConcurrent) |
| `orderService.ts` | Order creation | `OrderService` |
| `faceRecognitionService.ts` | Face search | `FaceRecognitionService` |
| `rfidService.ts` | RFID reader | `RFIDService` (QSerialPort) |
| `webSocketService.ts` | Real-time updates | `WebSocketClient` (QWebSocket) |
| `offlineStorage.ts` | Local cache | `OfflineStorage` (QSqlDatabase) |
| `OfflineQueue.ts` | Order queue | `OfflineQueue` (QQueue + persistence) |
| `syncCheckpointService.ts` | Sync state | `SyncCheckpointService` |
| `db.ts` | IndexedDB | `Database` (QSqlDatabase) |
| `pb.ts` | API adapter | `ApiClient` |
| `cloudApiService.ts` | Cloud API | `CloudApiClient` |

---

## C++ Implementation Mapping

### Qt6 Component Equivalents

#### Layout Components

| React Pattern | Qt6 Equivalent |
|--------------|----------------|
| `<div className="flex">` | `QHBoxLayout` or `QVBoxLayout` |
| `<div className="grid">` | `QGridLayout` |
| `<div className="absolute">` | `QWidget` with manual positioning |
| Flexbox | `QBoxLayout` with stretch factors |
| CSS Grid | `QGridLayout` |

#### UI Widgets

| React Component | Qt6 Widget |
|----------------|------------|
| `<button>` | `QPushButton` |
| `<input type="text">` | `QLineEdit` |
| `<input type="number">` | `QSpinBox` or `QLineEdit` with validator |
| `<textarea>` | `QTextEdit` |
| `<select>` | `QComboBox` |
| `<checkbox>` | `QCheckBox` |
| `<radio>` | `QRadioButton` |
| `<img>` | `QLabel` with `QPixmap` |
| `<table>` | `QTableView` + `QAbstractTableModel` |
| `<ul>/<li>` | `QListView` + `QAbstractListModel` |

#### Advanced Components

| React Pattern | Qt6 Implementation |
|--------------|-------------------|
| Virtual scrolling | `QAbstractItemView` with custom delegate |
| Lazy loading | `QtConcurrent::run` + signals/slots |
| Modal dialogs | `QDialog::exec()` |
| Toast notifications | Custom `QWidget` with `QPropertyAnimation` |
| Infinite scroll | `QScrollArea` + `scrollbar->valueChanged` signal |
| Drag & drop | `QDrag` + `QMimeData` |
| Context menu | `QMenu` + `contextMenuEvent` |

### Service Architecture

#### React Service Pattern

```typescript
class AlbumService {
    async fetchAll(): Promise<Album[]> {
        const response = await fetch('/api/albums');
        return response.json();
    }
}
```

#### C++ Service Pattern

```cpp
class AlbumService : public QObject {
    Q_OBJECT
public:
    void fetchAll();
    
signals:
    void albumsFetched(QVector<Album> albums);
    void error(QString message);
    
private:
    QNetworkAccessManager* manager;
};
```

### State Management

#### React (useState, useEffect)

```typescript
const [albums, setAlbums] = useState<Album[]>([]);

useEffect(() => {
    loadAlbums();
}, []);
```

#### C++ (Signals/Slots)

```cpp
class AlbumsPage : public QWidget {
    Q_OBJECT
public:
    AlbumsPage() {
        connect(albumService, &AlbumService::albumsFetched,
                this, &AlbumsPage::onAlbumsFetched);
        albumService->fetchAll();
    }
    
private slots:
    void onAlbumsFetched(QVector<Album> albums) {
        this->albums = albums;
        renderGrid();
    }
    
private:
    QVector<Album> albums;
    AlbumService* albumService;
};
```

---

## Implementation Priorities

### Phase 1: Core Infrastructure (Weeks 1-2)

- [x] Application lifecycle
- [x] Database wrapper
- [x] Configuration management
- [ ] Model classes (Photo, Album, Order, Client)
- [ ] Service base classes
- [ ] Network layer (QNetworkAccessManager)

### Phase 2: Master App Backend (Weeks 3-4)

- [ ] AlbumService
- [ ] PhotoService
- [ ] OrderService
- [ ] ClientService
- [ ] SyncService
- [ ] FaceRecognitionService
- [ ] WebSocketServer
- [ ] ApiServer (REST endpoints)

### Phase 3: Master App UI (Weeks 5-6)

- [ ] LoginWindow
- [ ] MainWindow + Sidebar
- [ ] DashboardPage
- [ ] AlbumsPage + AlbumDetailView
- [ ] PhotoEditor
- [ ] OrdersPage
- [ ] SettingsPage (all tabs)

### Phase 4: Touch App Backend (Week 7)

- [ ] MasterApiClient
- [ ] SyncService (photo download)
- [ ] OrderService (order creation)
- [ ] FaceRecognitionService
- [ ] RFIDService
- [ ] HeartbeatService

### Phase 5: Touch App UI (Week 8)

- [ ] AttractScreen
- [ ] SelectionView
- [ ] PhotoPreviewScreen
- [ ] CheckoutView
- [ ] ThankYouScreen
- [ ] Kiosk Mode implementation

### Phase 6: Integration (Weeks 9-10)

- [ ] Master-Touch communication
- [ ] Order sync flow
- [ ] Photo sync flow
- [ ] Offline operation
- [ ] Performance testing

### Phase 7: Polish (Weeks 11-12)

- [ ] UI refinements
- [ ] Performance optimization
- [ ] Memory profiling
- [ ] Installer creation
- [ ] Documentation

---

## Key Differences: React vs C++

### Advantages of C++/Qt6

1. **Performance**: 10-100x faster for image processing
2. **Memory**: Lower footprint for large datasets
3. **Native**: OS-level kiosk mode, hardware access
4. **Deployment**: Single executable, no runtime dependencies
5. **Threading**: True multithreading without GIL

### Challenges

1. **Manual Memory Management**: Use smart pointers (`std::unique_ptr`, `std::shared_ptr`)
2. **No Virtual DOM**: Manual UI updates via signals/slots
3. **Async Patterns**: Use `QtConcurrent` and `QFuture` instead of Promises
4. **Styling**: Qt StyleSheets instead of CSS (similar syntax)
5. **Build Complexity**: CMake instead of npm/webpack

---

## Next Steps

1. **Review this mapping** with stakeholders
2. **Prioritize features** for MVP
3. **Start Phase 2**: Implement Model classes
4. **Create UI mockups** in Qt Designer
5. **Set up CI/CD** for automated builds
