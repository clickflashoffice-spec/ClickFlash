# Star Master Photography OS - System Architecture

## Overview

The **Star Master Photography OS** consists of two distinct, decoupled applications that interact to form a complete photography workflow system.

1. **Master App (Management & Server)**
    * **Role:** Central command center, order processing, photo management, and sync hub.
    * **Ports:** `8090` (Primary), `8091` (Secondary/API).
    * **Tech Stack:** Node.js Backend (SQLite), React Frontend.

2. **Touch App (Kiosk Client)**
    * **Role:** Customer-facing kiosk for viewing photos and placing orders.
    * **Port:** `8092` (Unified Single-Port Mode).
    * **Tech Stack:** Node.js Backend (Local Proxy/Cache), React Frontend.
    * **Connectivity:** Connects to Master via HTTP/Socket.IO.

---

## Deployment Options

The system is designed to support three flexible operational modes depending on infrastructure availability:

### Option 1: Fully Offline (Local Network)

* **Infrastructure:** Ethernet cables / Local LAN. No Internet required.
* **Workflow:**
  * **Master** runs locally on a server/PC.
  * **Touch** units connect via local IP (e.g., `192.168.x.x:8090`).
  * **Data:** All data (photos, orders, stats) stays on the local network.
  * **Sync:** Real-time Socket.IO and HTTP syncing over LAN.

### Option 2: Hybrid (Offline + Cloud Sync)

* **Infrastructure:** Local LAN for Kiosks + Internet Gateway for Master.
* **Workflow:**
  * **Operations:** Kiosks (Touch) communicate offline with the Local Master for high-speed photo viewing (no latency).
  * **Management:** The Master App syncs selected data (sales, low-res proofs) to a Cloud Dashboard.
  * **Flexibility:** Can mix offline wired Kiosks with "roaming" online Kiosks (e.g., iPads on 4G) connecting to the Master via public URL.

### Option 3: Fully Online (Cloud Hosted)

* **Infrastructure:** Cloud Servers (AWS/DigitalOcean/Hetzner).
* **Workflow:**
  * **Master** is hosted on a public domain (e.g., `admin.starmaster.cloud`).
  * **Touch** units are purely web clients accessing the Cloud Master.
  * **Data:** Centralized database in the cloud.
  * **Requirement:** Stable internet connection for all devices.

---

## Technical Notes for Developers

* **Port Discipline:**
  * **Master:** Must listen on `8090` and `8091` to accept connections from Touch.
  * **Touch:** Hardcoded to listen on `8092` (Production). It proxies requests to Master based on the selected mode.
* **CORS:** The Touch backend (`server.js`) explicitly allows origins from Master ports (`8090`, `8091`) to facilitate local syncing.
* **Database:** Each app has its own local SQLite db (`master.db`, `touch.db`). Sync logic handles data consistency.
