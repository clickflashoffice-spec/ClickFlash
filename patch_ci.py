with open('.github/workflows/ci.yml', 'r') as f:
    ci = f.read()

old_cache = """      - name: Cache Turborepo
        uses: actions/cache@v4
        with:
          path: |
            .turbo
            node_modules/.cache/turbo
          key: ${{ runner.os }}-turbo-${{ github.sha }}
          restore-keys: |
            ${{ runner.os }}-turbo-"""

new_cache = """      - name: Setup Turborepo Remote Caching
        uses: dtinth/setup-github-actions-caching-for-turbo@v1"""

ci = ci.replace(old_cache, new_cache)

with open('.github/workflows/ci.yml', 'w', newline='\n') as f:
    f.write(ci)
print("Patched ci.yml")
