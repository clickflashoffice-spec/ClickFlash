/// @file HttpServer.h
/// @deprecated This Qt-based HTTP server is superseded by Drogon.
///   main.cpp already uses drogon::app().run() — this file exists only
///   as a reference for controllers that have not yet been ported.
///   It will be deleted in a future cleanup pass.
///
/// Migration status (2026-06):
///   ✅ SystemController  → include/http/SystemController.h (Drogon)
///   ✅ AuthController     → include/http/AuthController.h   (Drogon)
///   ✅ FilesController    → include/http/FilesController.h  (Drogon)
///   ⬜ CollectionsController (next)
///   ⬜ CullingController
///   ⬜ FacesController
///   ⬜ OrdersController
///   ⬜ PairingController
///   ⬜ RealtimeController
///   ⬜ SyncController
///   ⬜ IpcController

#pragma once
#pragma message("WARNING: http/HttpServer.h is DEPRECATED – use Drogon controllers")

// Original content intentionally removed.
// See git history for the Qt-based HttpServer implementation.
