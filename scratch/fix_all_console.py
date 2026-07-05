import os
import re
from pathlib import Path

targets = [
    Path('apps/master/backend'),
    Path('apps/master/src'),
    Path('apps/touch/backend'),
    Path('apps/touch/src'),
]

for target_dir in targets:
    if not target_dir.exists():
        continue
    for p in target_dir.rglob('*.ts*'):
        if 'node_modules' in p.parts or 'dist' in p.parts:
            continue
            
        if p.name in ['logger.ts', 'consoleCleanup.ts', 'constants.ts', 'auditLogger.ts']:
            continue
            
        content = p.read_text(encoding='utf-8')
        original = content

        # Check if console is used
        if 'console.' not in content:
            continue

        # Add logger import if not present
        has_logger_import = bool(re.search(r"import\s+\{?\s*logger\s*\}?\s+from", content))
        if not has_logger_import:
            # Insert after last import or at top
            lines = content.split('\n')
            last_import_idx = -1
            for i, line in enumerate(lines):
                if line.strip().startswith('import '):
                    last_import_idx = i
            
            import_str = ""
            if 'src' in p.parts:
                import_str = "import { logger } from '@/utils/logger';"
            elif 'touch' in p.parts and 'backend' in p.parts:
                import_str = "import { logger } from '../shared/logger';"
            else:
                # Master backend
                import_str = "import { logger } from '../utils/logger';"

            if last_import_idx >= 0:
                lines.insert(last_import_idx + 1, import_str)
                content = '\n'.join(lines)
            else:
                content = import_str + "\n" + content

        # Replace console.log and console.info with logger.info
        content = re.sub(r'console\.log\(', 'logger.info(', content)
        content = re.sub(r'console\.info\(', 'logger.info(', content)
        content = re.sub(r'console\.warn\(', 'logger.warn(', content)
        content = re.sub(r'console\.error\(', 'logger.error(', content)
        content = re.sub(r'console\.debug\(', 'logger.debug(', content)

        if content != original:
            try:
                p.write_text(content, encoding='utf-8')
                print(f'UPDATED: {p}')
            except Exception as e:
                print(f'ERROR writing {p}: {e}')
