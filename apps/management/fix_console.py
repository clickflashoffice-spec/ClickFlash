import re
from pathlib import Path

files = [
    'src/components/management/ManagementLayout.tsx',
    'src/components/photographers/WorkingTimeModal.tsx',
    'src/services/alertingService.ts',
    'src/services/apiService.ts',
    'src/services/faceRecognitionService.ts',
    'src/services/orchestrationService.ts',
    'src/services/pb.ts',
    'src/services/pbManagement.ts',
    'src/services/pricingSync.ts',
]

for fpath in files:
    p = Path(fpath)
    if not p.exists():
        print(f'MISSING: {fpath}')
        continue
    content = p.read_text(encoding='utf-8')
    original = content

    # Add logger import if not present
    has_logger_import = bool(re.search(r"import\s+\{?\s*logger\s*\}?\s+from\s+['\"](@/utils/logger|\.\./utils/logger|./utils/logger)['\"]", content))
    if not has_logger_import:
        # Insert after last import or at top
        lines = content.split('\n')
        last_import_idx = -1
        for i, line in enumerate(lines):
            if line.strip().startswith('import '):
                last_import_idx = i
        if last_import_idx >= 0:
            lines.insert(last_import_idx + 1, "import { logger } from '@/utils/logger';")
            content = '\n'.join(lines)
        else:
            content = "import { logger } from '@/utils/logger';\n" + content

    # Replace console.log and console.info with logger.info
    content = re.sub(r'console\.log\(', 'logger.info(', content)
    content = re.sub(r'console\.info\(', 'logger.info(', content)

    if content != original:
        p.write_text(content, encoding='utf-8')
        print(f'UPDATED: {fpath}')
    else:
        print(f'NO CHANGE: {fpath}')
