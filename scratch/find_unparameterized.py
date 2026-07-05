import os
from pathlib import Path
import re

targets = [
    Path('apps/master/backend'),
    Path('apps/touch/backend'),
]

pattern = re.compile(r"dbManager\.(?:run|get|all|prepare)\s*\(\s*`[^`]*\$\{.*?\}[^`]*`", re.DOTALL)

for target in targets:
    if not target.exists():
        continue
    for p in target.rglob('*.ts'):
        if 'node_modules' in p.parts or 'dist' in p.parts:
            continue
        content = p.read_text(encoding='utf-8')
        matches = pattern.finditer(content)
        for m in matches:
            print(f"FOUND in {p}:\n{m.group(0)}\n")
