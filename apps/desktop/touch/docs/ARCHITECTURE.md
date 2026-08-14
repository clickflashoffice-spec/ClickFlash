# Touch Application Architecture

**Note:** The analysis was interrupted before a full analysis could be completed.

The 'touch' application is a sophisticated three-process system built with Electron, React, and a standalone Node.js/Express backend.

1.  **Electron Main Process (`main.js`):** Acts as an orchestrator, launching the backend as a forked child process and creating a kiosk-style browser window for the UI. It handles native OS functions like printing.

2.  **Backend Process (`backend/server.ts`):** A standalone Express server running on port 8091. It manages all business logic, interacts with a local SQLite database, and runs background services like a file-system watcher (`WatcherService`) for automatic photo ingestion.

3.  **Renderer Process (`src/`):** A React SPA that provides the user interface. It communicates with the backend via standard HTTP API calls and with the main process via a secure preload script.

This decoupled architecture is robust and scalable. Key technologies include Electron, React, Vite, Express, `better-sqlite3` for the server-side database, and `dexie` (for client-side IndexedDB), and `@tanstack/react-query` for frontend state management.

## Relevant Locations

- **`touch/main.js`**: This is the central orchestrator of the Electron application. It launches the separate backend process, creates the renderer window, and handles all native OS-level interactions and IPC communication. Its logic defines the entire multi-process architecture.
- **`touch/backend/server.ts`**: This is the entry point for the standalone backend Node.js process. It sets up the Express server, initializes the SQLite database, starts background services (like the file watcher), and defines the application's unconventional manual API routing structure.
- **`touch/electron-builder.json`**: This build configuration file is key to understanding the production architecture. It explicitly defines how the backend code and its specific `node_modules` are copied into the final application package and unpacked from the ASAR archive, which is what allows `main.js` to fork it as a separate process.
- **`touch/package.json`**: Provides a complete overview of the project's technology stack, including the frontend framework (React), backend framework (Express), desktop framework (Electron), database driver (better-sqlite3), and other key libraries like `@tanstack/react-query` and `dexie`.
- **`touch/src/`**: This directory contains the entire React frontend application. A full analysis, which was not completed, would involve mapping out its components, routing, state management (using `@tanstack/react-query` and `dexie`), and how it interacts with the API defined in the backend.