import os
import re

def patch_file(filepath, onclick_pattern, action):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # We'll just look for `<div key={photo.id} className="relative group cursor-pointer ..."`
    # and add role="button" tabIndex={0}
    content = re.sub(
        r'<div key=\{photo\.id\} (className="relative group cursor-pointer[^"]*") onClick=\{\(\) => ([^\}]+)\}>',
        r'<div key={photo.id} \1 role="button" tabIndex={0} onClick={() => \2} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); \2; } }}>',
        content
    )
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

patch_file('apps/gallery/src/components/customer/StorePage.tsx', None, None)
patch_file('apps/gallery/src/components/customer/ProductSelectionModal.tsx', None, None)
print("Patched a11y")
