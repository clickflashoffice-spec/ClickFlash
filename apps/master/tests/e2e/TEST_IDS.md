# Required data-testid Attributes

To make E2E tests work, add these `data-testid` attributes to components:

## Authentication

| Component | Attribute | Element |
|-----------|-----------|---------|
| LoginPage | `data-testid="username-input"` | Username input |
| LoginPage | `data-testid="password-input"` | Password input |
| LoginPage | `data-testid="login-button"` | Login button |
| LoginPage | `data-testid="error-message"` | Error message container |

## Layout

| Component | Attribute | Element |
|-----------|-----------|---------|
| AppLayout | `data-testid="dashboard"` | Main dashboard container |
| AppLayout | `data-testid="user-menu"` | User dropdown menu |
| AppLayout | `data-testid="logout-button"` | Logout button |

## Albums

| Component | Attribute | Element |
|-----------|-----------|---------|
| AlbumsPage | `data-testid="albums-page"` | Page container |
| AlbumsPage | `data-testid="album-list"` | Album grid/list |
| AlbumsPage | `data-testid="create-album-button"` | Create button |
| AlbumItem | `data-testid="album-item"` | Album card/row |
| AlbumDetail | `data-testid="album-detail"` | Detail page container |
| AlbumDetail | `data-testid="delete-album-button"` | Delete button |
| AlbumModal | `data-testid="album-title-input"` | Title input |
| AlbumModal | `data-testid="album-date-input"` | Date input |
| AlbumModal | `data-testid="save-album-button"` | Save button |
| ConfirmationModal | `data-testid="confirm-delete-button"` | Confirm button |

## Photo Editing

| Component | Attribute | Element |
|-----------|-----------|---------|
| PhotoViewer | `data-testid="photo-viewer"` | Viewer container |
| PhotoViewer | `data-testid="active-photo-index"` | Index display |
| Filmstrip | `data-testid="filmstrip"` | Filmstrip container |
| Filmstrip | `data-testid="filmstrip-photo"` | Thumbnail item |
| Filmstrip | `data-testid="selected-count"` | Selection counter |
| EditorToolbar | `data-testid="exposure-slider"` | Exposure slider |
| EditorToolbar | `data-testid="contrast-slider"` | Contrast slider |
| EditorToolbar | `data-testid="crop-button"` | Crop toggle |
| CropOverlay | `data-testid="crop-overlay"` | Crop UI |
| CropOverlay | `data-testid="apply-crop-button"` | Apply crop |
| EditorSidebar | `data-testid="save-status"` | Save status text |

## Settings

| Component | Attribute | Element |
|-----------|-----------|---------|
| SettingsPage | `data-testid="settings-page"` | Page container |
| SettingsPage | `data-testid="tab-users"` | Users tab |
| SettingsPage | `data-testid="tab-network"` | Network tab |
| SettingsPage | `data-testid="tab-backup"` | Backup tab |
| UserManagement | `data-testid="user-management"` | Users panel |
| NetworkSettings | `data-testid="network-settings"` | Network panel |
| BackupSettings | `data-testid="backup-settings"` | Backup panel |
| AppearanceSettings | `data-testid="appearance-tab"` | Appearance tab |
| AppearanceSettings | `data-testid="dark-mode-toggle"` | Dark mode switch |
| GeneralSettings | `data-testid="app-name-input"` | App name input |
| SettingsPage | `data-testid="save-settings-button"` | Save button |
| SettingsPage | `data-testid="save-success"` | Success message |

## Offline/Sync

| Component | Attribute | Element |
|-----------|-----------|---------|
| NetworkStatus | `data-testid="offline-indicator"` | Offline banner |
| CloudStatus | `data-testid="sync-indicator"` | Sync status |

## Adding Test IDs

Example:

```tsx
// Before
<button onClick={handleLogin}>Login</button>

// After
<button data-testid="login-button" onClick={handleLogin}>
    Login
</button>
```
