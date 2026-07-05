const fs = require('fs');
const path = require('path');

const fixes = [
  {
    file: 'apps/master/backend/routes/collections.ts',
    replacements: [
      { search: "import { logger } from '../utils/logger';\n", replace: "" }
    ]
  },
  {
    file: 'apps/master/backend/schema_audit.ts',
    replacements: [
      { search: "from '../utils/logger'", replace: "from './utils/logger'" }
    ]
  },
  {
    file: 'apps/master/backend/scripts/repro_import.ts',
    replacements: [
      { search: 'logger.error("Simulation failed:", err, err.stack);', replace: 'logger.error("Simulation failed:", { err, stack: err.stack });' },
      { search: 'logger.error(`Simulation completed with errors:`, err, err.stack);', replace: 'logger.error(`Simulation completed with errors:`, { err, stack: err.stack });' }
    ]
  },
  {
    file: 'apps/master/backend/server.ts',
    replacements: [
      { search: 'import { Logger } from "../backend/utils/logger";', replace: '' },
      { search: 'logger.error("Unhandled Promise Rejection", reason, promise);', replace: 'logger.error("Unhandled Promise Rejection", { reason, promise });' }
    ]
  },
  {
    file: 'apps/master/backend/services/cloudSyncService.ts',
    replacements: [
      { search: "import { PipelineResult } from './photoProcessor';\n", replace: "" }
    ]
  },
  {
    file: 'apps/master/backend/services/manual-sync-test.ts',
    replacements: [
      { search: "import { logger } from '../utils/logger';\n", replace: "" },
      { search: "import { DatabaseManager } from '../database/db';\n", replace: "import { DatabaseManager } from '../database/db';\nimport { logger } from '../utils/logger';\n" }
    ]
  },
  {
    file: 'apps/master/backend/services/photoProcessor.ts',
    replacements: [
      { search: "import { logger } from '../utils/logger';\n", replace: "" }
    ]
  },
  {
    file: 'apps/master/backend/services/tunnelService.ts',
    replacements: [
      { search: "import { logger } from '../utils/logger';\n", replace: "" }
    ]
  },
  {
    file: 'apps/master/backend/services/verify-bridge.ts',
    replacements: [
      { search: "import { logger } from '../utils/logger';\n", replace: "" },
      { search: "import fetch from 'node-fetch';\n", replace: "import fetch from 'node-fetch';\nimport { logger } from '../utils/logger';\n" }
    ]
  },
  {
    file: 'apps/master/backend/services/verify_ingestion_consistency.ts',
    replacements: [
      { search: "import { logger } from '../utils/logger';\n", replace: "" }
    ]
  },
  {
    file: 'apps/master/backend/tests/e2e/photo-pipeline.test.ts',
    replacements: [
      { search: "from '../utils/logger'", replace: "from '../../utils/logger'" }
    ]
  },
  {
    file: 'apps/master/backend/tools/benchmarkVectorIndex.ts',
    replacements: [
      { search: "import { logger } from '../utils/logger';\n", replace: "" }
    ]
  },
  {
    file: 'apps/master/backend/utils/validation.ts',
    replacements: [
      { search: 'logger.info("VALIDATION FAILED", tableName, JSON.stringify(error.issues, null, 2));', replace: 'logger.info(`VALIDATION FAILED for ${tableName}`, { issues: error.issues });' }
    ]
  },
  {
    file: 'apps/master/src/components/AIIdeasModal.tsx',
    replacements: [
      { search: 'toast.error(err.message || "Failed to generate ideas");', replace: 'toast.error(err instanceof Error ? err.message : "Failed to generate ideas");' }
    ]
  },
  {
    file: 'apps/master/src/components/albums/editor2/hooks/__tests__/usePhotoData.test.ts',
    replacements: [
      { search: "import { logger } from '../../../../../utils/logger';\n", replace: "" }
    ]
  },
  {
    file: 'apps/master/src/components/albums/editor2/utils/PresetManager.ts',
    replacements: [
      { search: 'logger.error("Failed to apply preset:", error, preset.id);', replace: 'logger.error(`Failed to apply preset: ${preset.id}`, { error });' }
    ]
  },
  {
    file: 'apps/master/src/components/albums/ImportAlbumModal.tsx',
    replacements: [
      { search: 'logger.error(`Import processing error for ${file.name}:`, error, file);', replace: 'logger.error(`Import processing error for ${file.name}:`, { error, file });' }
    ]
  },
  {
    file: 'apps/master/src/components/modals/OrderEditModal.tsx',
    replacements: [
      { search: 'toast.error(err.message || "Failed to save manual discount");', replace: 'toast.error(err instanceof Error ? err.message : "Failed to save manual discount");' }
    ]
  },
  {
    file: 'apps/master/src/components/photographers/ObjectivesModal.tsx',
    replacements: [
      { search: 'toast.error(err.message || "Failed to save objective");', replace: 'toast.error(err instanceof Error ? err.message : "Failed to save objective");' }
    ]
  },
  {
    file: 'apps/master/src/utils/imageUtils.ts',
    replacements: [
      { search: 'logger.error("Face detection setup failed, cannot re-detect", err, err.stack);', replace: 'logger.error("Face detection setup failed, cannot re-detect", { err, stack: err.stack });' }
    ]
  }
];

fixes.forEach(({ file, replacements }) => {
  const filePath = path.join(__dirname, '..', file);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf-8');
  replacements.forEach(({ search, replace }) => {
    if (content.includes(search)) {
      content = content.replace(search, replace);
      console.log(`Replaced in ${file}`);
    } else {
      console.warn(`Search string not found in ${file}: ${search}`);
    }
  });
  fs.writeFileSync(filePath, content, 'utf-8');
});
