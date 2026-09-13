# Interview Rubric: Field Deployment & Systems Engineer (🔴 P0)

> **Role Focus:** Master OS edge appliances, physical hardware integration (Nikon DSLR, DNP thermal printers), local network topology (mDNS, Bonjour), offline-first reliability under resort conditions.

---

## 1. Evaluation Dimensions (Score 1 to 5)

| Dimension | Weight | Poor (1–2) | Target (3–4) | Exceptional (5) |
|:---|:---|:---|:---|:---|
| **Win32 & Systems Internals** | 25% | Superficial CLI knowledge; cannot explain Windows services vs Session 1, spooler crashes, or process trees. | Proficient with PowerShell, Win32 volume detection, service managers, WPD camera devices, and GDI printing. | Deep knowledge of Win32 message pumps (`WM_DEVICECHANGE`), DPAPI, driver inf files, and power event handling (`PBT_APMPOWERSTATUSCHANGE`). |
| **Physical Hardware & Peripherals** | 30% | Only familiar with consumer plug-and-play USB; panics when a camera drops tethering. | Hands-on experience with PTP/IP, DSLR tethering scripts, thermal dye-sub print spoolers (DNP DS620/RX1HS), and USB hub topologies. | Pinpoints voltage drops, USB bus reset sequences, thermal duty-cycle throttling, and ribbon jam edge cases immediately. |
| **Networking & Air-Gapped Topologies** | 25% | Requires static public IPs or cloud relays; cannot diagnose mDNS or LAN subnet conflicts. | Configures local zero-conf networking (Avahi/Bonjour), static DHCP reservations, and firewall traversal with ease. | Masters broadcast storms, multi-VLAN bridging between guest Wi-Fi and POS/Master subnets, and offline TLS/LAN certificate pinning. |
| **Field Tenacity & Autonomy** | 20% | Relies on step-by-step guidance; easily frustrated by unreliable physical conditions. | Calm under pressure; methodical triage; documents reproduction steps cleanly for the engineering team. | Thrives in high-stress pilot environments; proactively builds diagnostic tools and failover scripts. |

---

## 2. Practical Technical Assessment (Paid Take-Home / Live Simulation)

### Scenario: The "Resort Blackout & Spooler Jam"
- **Context:** A luxury resort in Bali experiences a momentary brownout. The ClickFlash Master appliance stays up on UPS, but:
  1. The Nikon Z5 USB tether drops and gphoto2/WPD fails to re-enumerate.
  2. The DNP DS620 dye-sub printer drops connection and leaves a partially spooled print job hung in the Windows spooler.
  3. The touch kiosks report "Master Offline" because mDNS discovery failed to re-announce after the LAN switch rebooted.
- **Candidate Task:**
  1. Write a PowerShell or Node.js diagnostic script to detect and cleanly reset hung USB devices and restart the print spooler without dropping uncommitted photos in the ingestion pipeline.
  2. Explain how they would verify that no corrupt partial image files are left in the ingest folder.
  3. Propose a watchdog architecture for the Master OS to autonomously recover from this state in $<10$ seconds without human operator intervention.

---

## 3. Decision Matrix
- **Hire (Score $\ge 4.0/5$):** Demonstrates real-world edge hardware grit; scripts defensively; understands physical field constraints.
- **No Hire (Score $< 3.5/5$):** Treats edge nodes like standard cloud servers; lacks physical peripheral debugging intuition.
