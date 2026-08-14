# Windows & Firewall Mastery Guide

Follow these steps to ensure your PCs can talk to each other over a physical Ethernet cable with ZERO internet.

## 1. The "Easy Way" (Recommended)

We have provided an automated launcher to handle Administrator permissions for you.

1. Right-click **`RUN_FIREWALL_SETUP.bat`** and select **"Run as administrator"**.
2. If you just double-click it, it will attempt to ask for permission automatically.
3. This will open ports **8090**, **8091**, and **5353** across the local network.

---

## 2. The Manual Way (UI Steps)

If you prefer to do it manually or the script is blocked:

### Step A: Open Firewall Settings

1. Click the Start menu and type **"Windows Defender Firewall"**.
2. Click on **"Advanced Settings"** on the left sidebar.
3. Click on **"Inbound Rules"** in the top-left corner.

### Step B: Create a Port Rule

1. Click **"New Rule..."** on the right sidebar.
2. Select **"Port"** and click Next.
3. Select **"TCP"** and enter: `8090, 8091`. Click Next.
4. Select **"Allow the connection"**. Click Next.
5. Ensure **Domain**, **Private**, and **Public** are all checked. Click Next.
6. Name it: `Antigravity OS - TCP Ports`. Click Finish.

### Step C: Repeat for UDP (Discovery)

1. Click **"New Rule..."** again.
2. Select **"Port"** and click Next.
3. Select **"UDP"** and enter: `8090, 8091, 5353`. Click Next.
4. Select **"Allow the connection"**. Click Next.
5. Ensure all profiles are checked. Click Next.
6. Name it: `Antigravity OS - UDP Ports`. Click Finish.

---

## 3. Network Profile Fix (CRITICAL)

Windows treats "Public" networks more strictly. For Ethernet-to-Ethernet:

1. Go to **Settings > Network & Internet > Ethernet**.
2. Click on your connection.
3. Change "Network profile" from **Public** to **Private**.
4. *Do this on BOTH the Master and Touch PCs.*

---

## 4. Testing the Connection

Open a Command Prompt (CMD) and try to "ping" the other PC:

```cmd
ping [OTHER_PC_IP_ADDRESS]
```

If you get **"Reply from..."**, your firewall is successfully configured. If you get **"Request timed out"**, double-check Section 3 (Network Profile).
