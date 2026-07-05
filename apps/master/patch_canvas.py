import os
import re

files_to_patch = [
    r"C:\Users\alamo\Desktop\ClickFlash\apps\master\src\workers\imageProcessor.worker.ts",
    r"C:\Users\alamo\Desktop\ClickFlash\apps\master\src\services\localFaceService.ts",
    r"C:\Users\alamo\Desktop\ClickFlash\apps\master\src\services\smartCullingService.ts",
    r"C:\Users\alamo\Desktop\ClickFlash\apps\master\src\components\common\FileTransferDialog.tsx"
]

for file_path in files_to_patch:
    if not os.path.exists(file_path):
        continue
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Replace .getContext('2d') or .getContext("2d") with .getContext('2d', { willReadFrequently: true })
    # Be careful not to replace if it already has willReadFrequently
    content = re.sub(
        r'\.getContext\(([\'"])2d\1\)',
        r".getContext('2d', { willReadFrequently: true })",
        content
    )

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    
    print(f"Patched {file_path}")
