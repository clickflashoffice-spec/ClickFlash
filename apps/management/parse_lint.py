import re
from collections import defaultdict

with open('../../management-lint.txt', 'r') as f:
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

# Categorize
cats = defaultdict(int)
for path, warns in files.items():
    for w in warns:
        cats[w[3]] += 1

print('Warning categories:')
for cat, count in sorted(cats.items(), key=lambda x: -x[1]):
    print(f'  {cat}: {count}')

print(f'\nTotal files: {len(files)}')
print(f'Total warnings: {sum(len(w) for w in files.values())}')

# List no-unused-vars by file
print('\nno-unused-vars by file:')
for path, warns in sorted(files.items()):
    unused = [w for w in warns if w[3] == '@typescript-eslint/no-unused-vars']
    if unused:
        print(f'\n{path}:')
        for w in unused:
            print(f'  {w[0]}:{w[1]} {w[2]}')
