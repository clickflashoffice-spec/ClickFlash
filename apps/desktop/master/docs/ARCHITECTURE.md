# Master Application Architecture

The 'master' application is a robust, three-tiered Electron desktop application designed as a self-contained local network hub.

**1. Electron Host (Supervisor - `main.js`):**
- Manages the application's lifecycle and creates a locked-down Kiosk Mode window.
- **Key Architectural Choice:** It spawns the backend server in an isolated child process using `child_process.fork()`. This enhances stability by separating the UI and server, preventing a backend crash from affecting the frontend.
- In production, it serves the static frontend build. In development, it loads from the Vite dev server.
- Securely exposes native OS functions (printing) to the frontend via a `preload.js` script and IPC channels.

**2. Backend (Node.js Child Process - `backend/`):**
- A TypeScript-based Express.js server.
- Persists data in a local SQLite database (`better-sqlite3`), managed within a `pb_data` directory that is correctly placed in the user's writable `AppData` folder in production.
- Provides a comprehensive REST API and a WebSocket server for real-time client communication.
- **Key Feature:** Uses a `bonjour-service` to broadcast its presence on the local network via mDNS, allowing 'touch' clients to discover and connect to it automatically without manual IP configuration.
- Runs background services, including a folder monitor to automatically ingest new photos.

**3. Frontend (Renderer Process - `src/`):**
- A modern Single-Page Application built with React, TypeScript, and Vite.
- **State Management:** Uses `@tanstack/react-query` as the primary tool for managing all server state (data fetching, caching, and mutations), with React Context for minor global UI state.
- **UI & Routing:** Styled with Tailwind CSS and uses React Router for navigation.
- Communicates with the backend via HTTP requests (managed by React Query) and WebSockets.

This architecture is well-suited for its purpose, creating a stable, feature-rich, and easy-to-set-up central server for a local network of client devices.

## Relevant Locations

- **`master/package.json`**: This file is the blueprint of the project. It defines the core technologies (React, Express, Electron, Vite), libraries for every major function (data fetching, database, styling, testing), and the scripts used to build, run, and deploy the application.
- **`master/main.js`**: This is the heart of the Electron application. Its most critical architectural decision is running the backend in an isolated child process (`fork`). It also manages the Kiosk-style window, serves the frontend in production, and securely handles Inter-Process Communication (IPC) from the renderer.
- **`master/backend/server.ts`**: This is the entry point for the entire backend. It sets up the Express server, initializes all key services (database, logging), starts background tasks (folder monitoring), and, crucially, advertises the server on the local network using Bonjour for auto-discovery by clients.
- **`master/src/main.tsx`**: This is the entry point for the frontend React application. It establishes the core client-side architecture by setting up the providers for server state management (`@tanstack/react-query`), routing (`react-router-dom`), and other global contexts.
- **`master/preload.js`**: This script is the secure bridge between the frontend (renderer) and the Electron host (main process). It demonstrates the correct, secure pattern for exposing specific native functionalities (like printing) to the web application without compromising security.
- **`electron-builder.json`**: Defines the configuration for packaging the application into a distributable installer. It specifies which files to include, where to place extra resources like the compiled backend, and sets metadata for the final executable.