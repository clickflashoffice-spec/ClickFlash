import re
from pathlib import Path
from collections import defaultdict

LINT_FILE = '../../management-lint.txt'
SRC_DIR = Path('src')

def parse_lint():
    with open(LINT_FILE, 'r') as f:
        text = f.read()
    lines = text.split('\n')
    files = defaultdict(list)
    current_file = None
    prefix = 'C:\\Users\\alamo\\Desktop\\ClickFlash\\apps\\management\\src\\'
    for line in lines:
        if line.startswith(prefix):
            current_file = line[len(prefix):]
        elif current_file and 'warning' in line:
            match = re.match(r'\s+(\d+):(\d+)\s+warning\s+(.+?)\s{2,}(\S+)\s*$', line)
            if match:
                files[current_file].append((int(match.group(1)), int(match.group(2)), match.group(3).strip(), match.group(4)))
    return files

def extract_name(msg):
    # Extract quoted name from messages like "'X' is defined but never used"
    m = re.search(r"'([^']+)'", msg)
    return m.group(1) if m else None

def remove_named_import(content, name):
    """Remove `name` from named import statements."""
    # Pattern 1: single item import { name } from '...'
    p1 = rf"import\s*\{{\s*{re.escape(name)}\s*\}}\s*from\s*['\"][^'\"]+['\"];?\n?"
    content, n1 = re.subn(p1, '', content)
    if n1:
        return content
    # Pattern 2: import { name, other } or { other, name }
    # We'll do a simpler approach: find the import block containing name and remove it
    def repl(match):
        full = match.group(0)
        # remove the specific name (possibly with alias)
        # handle `name, `, `, name`, `name as alias, `, `, name as alias`
        new_full = re.sub(rf"(?:,\s*)?\b{re.escape(name)}\b(?:\s+as\s+\w+)?(?:\s*,)?", lambda m: ',' if m.group(0).startswith(',') and m.group(0).endswith(',') else '', full)
        # clean up empty braces and extra spaces
        new_full = re.sub(r'\{\s*,?\s*\}', '{}', new_full)
        new_full = re.sub(r'\{\s+', '{', new_full)
        new_full = re.sub(r'\s+\}', '}', new_full)
        new_full = re.sub(r',\s*\}', '}', new_full)
        # if braces are empty or only spaces, remove whole import
        if re.search(r'import\s*\{\s*\}', new_full):
            return ''
        return new_full
    # Match import statements with braces (multiline)
    content, n2 = re.subn(r"import\s*\{[^}]*\b" + re.escape(name) + r"\b[^}]*\}\s*from\s*['\"][^'\"]+['\"];?", repl, content, flags=re.DOTALL)
    return content

def remove_default_import(content, name):
    p = rf"import\s+{re.escape(name)}\s+from\s*['\"][^'\"]+['\"];?\n?"
    return re.sub(p, '', content)

def remove_namespace_import(content, name):
    p = rf"import\s+\*\s+as\s+{re.escape(name)}\s+from\s*['\"][^'\"]+['\"];?\n?"
    return re.sub(p, '', content)

def remove_from_react_import(content, name):
    """Remove from import React, { useState, ... } or import { useState, ... } from 'react'"""
    def repl_react(match):
        inner = match.group(1)
        new_inner = re.sub(rf"(?:,\s*)?\b{re.escape(name)}\b(?:\s*,)?", lambda m: ',' if m.group(0).startswith(',') and m.group(0).endswith(',') else '', inner)
        new_inner = re.sub(r'^\s*,', '', new_inner)
        new_inner = re.sub(r',\s*$', '', new_inner)
        new_inner = new_inner.strip()
        if not new_inner:
            return "import React from 'react';"
        return f"import React, {{ {new_inner} }} from 'react';"
    def repl_named(match):
        inner = match.group(1)
        new_inner = re.sub(rf"(?:,\s*)?\b{re.escape(name)}\b(?:\s*,)?", lambda m: ',' if m.group(0).startswith(',') and m.group(0).endswith(',') else '', inner)
        new_inner = re.sub(r'^\s*,', '', new_inner)
        new_inner = re.sub(r',\s*$', '', new_inner)
        new_inner = new_inner.strip()
        if not new_inner:
            return ''
        return f"import {{ {new_inner} }} from 'react';"
    content = re.sub(r"import\s+React,\s*\{\s*([^}]+)\s*\}\s*from\s*['\"]react['\"];?", repl_react, content, flags=re.DOTALL)
    content = re.sub(r"import\s*\{\s*([^}]+)\s*\}\s*from\s*['\"]react['\"];?", repl_named, content, flags=re.DOTALL)
    return content

def fix_unused_var(content, name, line_no, msg):
    lines = content.split('\n')
    if line_no < 1 or line_no > len(lines):
        return content
    line = lines[line_no - 1]

    # Check if it's an import (look back up to 12 lines for multi-line imports)
    if 'import ' in line or any('import ' in l for l in lines[max(0, line_no-12):line_no+1]):
        # Determine import type
        if re.search(rf"import\s+\*\s+as\s+{re.escape(name)}\b", content):
            content = remove_namespace_import(content, name)
        elif re.search(rf"import\s+{re.escape(name)}\b\s+from", content):
            content = remove_default_import(content, name)
        elif re.search(rf"import\s+React.*\b{re.escape(name)}\b", content):
            content = remove_from_react_import(content, name)
        else:
            content = remove_named_import(content, name)
        return content

    # Check if it's a function arg (message says Allowed unused args)
    if 'Allowed unused args' in msg:
        # Prefix the parameter name with _
        # Simple case: name followed by : or , or ) or = on the same line
        pattern = r"(?<=[\(\{\s,])" + re.escape(name) + r"\b(?=\s*[:=,)])"
        new_line = re.sub(pattern, f'_{name}', line)
        if new_line != line:
            lines[line_no - 1] = new_line
            return '\n'.join(lines)
        # Multi-line destructured arg: look for `name,` or `name:` patterns
        for i in range(max(0, line_no - 5), min(len(lines), line_no + 3)):
            new_l = re.sub(rf"(?<=[\{{\s,]){re.escape(name)}\b(?=\s*[:,\}}])", f'_{name}', lines[i])
            if new_l != lines[i]:
                lines[i] = new_l
                return '\n'.join(lines)

    # Check if it's a catch clause variable
    if re.search(rf"catch\s*\(\s*{re.escape(name)}\b", line):
        lines[line_no - 1] = re.sub(rf"catch\s*\(\s*{re.escape(name)}\s*\)", 'catch', line)
        return '\n'.join(lines)

    # Assigned but never used: rename to _name in declaration
    if 'is assigned a value but never used' in msg:
        # const { name } = ...  -> const { name: _name } = ...
        new_line = re.sub(rf"const\s+\{{\s*{re.escape(name)}\s*\}}", f'const {{ {name}: _{name} }}', line)
        if new_line != line:
            lines[line_no - 1] = new_line
            return '\n'.join(lines)
        # const [name, ...] = ... -> const [_name, ...] = ...
        new_line = re.sub(rf"const\s+\[\s*{re.escape(name)}\b", f'const [_{name}', line)
        if new_line != line:
            lines[line_no - 1] = new_line
            return '\n'.join(lines)
        # const name = ... -> const _name = ...
        new_line = re.sub(rf"\bconst\s+{re.escape(name)}\b", f'const _{name}', line)
        if new_line != line:
            lines[line_no - 1] = new_line
            return '\n'.join(lines)
        # let name = ... -> let _name = ...
        new_line = re.sub(rf"\blet\s+{re.escape(name)}\b", f'let _{name}', line)
        if new_line != line:
            lines[line_no - 1] = new_line
            return '\n'.join(lines)

    return content

def main():
    files = parse_lint()
    changed = []
    for path, warns in files.items():
        fpath = SRC_DIR / path
        if not fpath.exists():
            continue
        content = fpath.read_text(encoding='utf-8')
        original = content
        for line_no, col, msg, rule in warns:
            if rule != '@typescript-eslint/no-unused-vars':
                continue
            name = extract_name(msg)
            if not name:
                continue
            content = fix_unused_var(content, name, line_no, msg)
        if content != original:
            fpath.write_text(content, encoding='utf-8')
            changed.append(path)
    print(f'Changed {len(changed)} files:')
    for p in changed:
        print(f'  {p}')

if __name__ == '__main__':
    main()
