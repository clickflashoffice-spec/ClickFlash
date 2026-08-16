# ClickFlash Autonomous Execution Architecture

ClickFlash is powered by a massive autonomous agent architecture designed to automatically construct, test, repair, and optimize the ClickFlash ecosystem (V8.0 Omni-Modal). This document serves as the master guide to the autonomous capabilities that power the ClickFlash platform.

## The `/goal` Command & 11-Step Pipeline

The `/goal` command acts as the trigger for the ClickFlash Autonomous Execution Pipeline V2.0. When triggered, the system executes an 11-step sequence without asking for permission, utilizing specialized agents in parallel:

1.  **Initialize MCP Server**: Starts the ClickFlash MCP Server in the background.
2.  **Competitive Intelligence Baseline**: Uses the Competitor Intel Agent to pull strategic battlecards against competitors (like Fotiqo, DEI).
3.  **Parallel Research Phase**: Deploys Deep Search and Business Planner agents to map files and establish architectural contracts.
4.  **Parallel Implementation Phase**: Deploys Backend, CEO/Frontend, and Mobile/Rust agents to implement the API, UI, and edge logic.
5.  **Parallel Verification Phase**: QA, Security, Creative, DevOps, and Auto-Loop agents test the code, ensure compliance, check UI design, audit dependencies, and fix TS errors iteratively.
6.  **UI/UX & Aesthetics Polish Phase**: UI/UX Improver agent refines visual hierarchy and adds glassmorphic aesthetics.
7.  **Architecture Gap Searcher**: Validates that all API routes are consumed exactly as typed.
8.  **App-by-App Deep Audit**: The App Auditor Agent scans every micro-app (master, touch, moneytrash, etc.) for leaks.
9.  **Business Impact Analysis**: The Revenue Strategist calculates yield improvements and suggests conversion optimizations.
10. **Final Production Gatekeeper & Synthesis**: Ensures 100% green tests and typechecks, while the Documentation Agent updates ROADMAP and task files.
11. **The Infinite 360° Improvement Loop**: An optional "never stop" mode where the orchestrator recursively resolves gaps until the codebase is 100% production ready.

## The Swarm: 14 Specialized Agent Roles

The monorepo-swarm-orchestrator defines 14 specific agent roles that can be parallelized:

1.  **Deep Search Agent (flash)**: Codebase reconnaissance, file mapping, and dependency analysis.
2.  **Business Planner Agent (pro)**: Architecture contracts, type definitions, and API design.
3.  **Backend Engineer Agent (pro)**: Fastify, Redis Streams, SQLite, Cloudflare Workers implementation.
4.  **CEO Frontend Agent (pro)**: React 19, Tailwind CSS, Vite frontend construction.
5.  **Mobile & Rust Agent (pro)**: Expo React Native, Rust Core, BLE/UWB, WebRTC edge logic.
6.  **Competitor Intel Agent (flash)**: Pulls strategic context before implementation.
7.  **QA & Test Agent (flash)**: Writes Vitest unit tests, runs typecheck, reports coverage.
8.  **Security Auditor Agent (flash)**: Runs security/compliance scans (GDPR, PCI DSS).
9.  **Creative / UX Agent (flash)**: Reviews UI against design systems for accessibility and responsiveness.
10. **DevOps / Infra Agent (flash)**: Evaluates build statuses, dependencies, and bundle sizes.
11. **Auto-Loop Agent (flash)**: Iteratively runs typecheck → fix loops until zero errors remain.
12. **Revenue Strategist Agent (pro)**: Analyzes business impact, suggests pricing, and runs yield simulations.
13. **Documentation Agent (flash)**: Auto-updates ROADMAP.md, walkthrough.md, changelogs, and API docs.
14. **Issue Hunter Agent (flash)**: Scans for TODOs, FIXMEs, dead code, type suppressions, and tech debt.

## The Infinite 360° Loop

The **Infinite 360° Loop** is the pinnacle of the autonomous engine. When a user requests continuous execution (e.g., "never stop" or "fix all gaps"):
- The **Loop Orchestrator Agent** triggers `start_infinite_loop`.
- The system recursively loops through Steps 2-10, continuously deploying Issue Hunter, App Auditor, Gap Searcher, and UI/UX agents.
- Each gap fixed triggers `report_gap_fixed`.
- At the end of every cycle, `check_loop_status` is called.
- The loop **never stops** until the status confirms: `"100% PRODUCTION READY! Zero gaps remain!"`

## MCP Tools Catalog (50+)

The ClickFlash MCP server provides over 50 tools to empower the swarm:

*   **Strategy & Orchestration**: `ceo_scan`, `ceo_deploy_swarm`, `ceo_status`, `swarm_plan_task`, `swarm_synthesize_results`, `start_infinite_loop`, `report_gap_fixed`, `check_loop_status`
*   **Competitive Intelligence**: `competitor_scan`, `competitor_moat_plan`
*   **Revenue & Yield**: `yield_simulator`, `revenue_dashboard`, `abandoned_cart_scan`
*   **Mobile & Edge**: `ble_beacon_status`, `edge_health_check`, `camera_fleet_status`
*   **AI Pipeline**: `culling_stats`, `vector_index_health`, `trigger_batch_enhance`, `face_match_accuracy`
*   **Business Analytics**: `park_heatmap`, `guest_journey_trace`, `daily_briefing`, `weekly_trend_report`
*   **WhatsApp CRM**: `whatsapp_send_magic_link`, `whatsapp_campaign_status`, `sales_swarm_deploy`, `lead_scoring`
*   **Photographer Operations**: `photographer_leaderboard`, `photographer_dispatch`, `shift_planner`
*   **Legal & Compliance**: `gdpr_audit`, `biometric_consent_check`, `pci_dss_scan`
*   **DevOps & Auto-Fix**: `auto_fix_loop`, `issue_scanner`, `build_status`, `dependency_audit`, `bundle_size_check`, `dead_code_scanner`, `changelog_generator`, `tech_debt_tracker`
*   **Customer Intelligence**: `customer_segmentation`, `nps_calculator`, `churn_predictor`
*   **Global Operations**: `multi_venue_overview`, `currency_converter`, `venue_comparison`
*   **Code Intelligence**: `api_endpoint_lister`, `env_validator`, `monorepo_health_score`, `error_log_analyzer`, `accessibility_audit`, `i18n_scanner`, `license_checker`, `performance_profiler`, `photo_pipeline_status`, `deployment_readiness`, `redis_monitor`, `migration_planner`
*   **Infrastructure**: `start_app`, `run_ecosystem_tests`, `query_local_db`, `fetch_app_logs`
*   **Architecture & Quality**: `audit_architecture`, `scan_security`, `suggest_refactor`, `discover_shared_assets`
*   **Production Readiness & UI/UX**: `audit_app_boundaries`, `search_architecture_gaps`, `ui_ux_accessibility_fixer`, `final_production_readiness`
*   **Planning**: `create_plan`, `update_task_status`, `append_walkthrough`

---
*Generated autonomously by the Documentation Agent.*
