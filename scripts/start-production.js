import { logger } from '@/utils/logger';

#!/usr/bin/env node
// ClickFlash production entrypoint placeholder
// This monorepo is normally deployed via per-app Docker images / Cloudflare Pages / Electron builders.
// The root Dockerfile copies built artifacts and lands here as a safe fallback.

logger.info('[ClickFlash] Production start placeholder reached.');
logger.info('[ClickFlash] No single root service is started by this image by design.');
logger.info('[ClickFlash] Exiting with code 0.');
process.exit(0);
