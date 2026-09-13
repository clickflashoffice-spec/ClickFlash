import re

with open('apps/desktop/master/backend/services/cloudSyncService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace empty catch blocks with logging and queueing fallback where possible, 
# or at least a logger.error to not silently swallow.
# We'll just replace `catch (e) {}` and `catch (err) {}` with a logger line.

content = re.sub(r'catch\s*\((.*?)\)\s*\{\s*\}', r'catch (\1) { this.logger.error(`[CloudSync] Unhandled error: ${\1}`); }', content)

with open('apps/desktop/master/backend/services/cloudSyncService.ts', 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched catch blocks")
