const fs = require('fs');

const fixFile = (path, search, replace) => {
    try {
        let content = fs.readFileSync(path, 'utf8');
        if (content.includes(search)) {
            content = content.replace(search, replace);
            fs.writeFileSync(path, content);
            console.log(`Fixed: ${path}`);
        } else {
            console.log(`Search string not found in: ${path}`);
            // Fallback: if it's truncated, just append closing braces
            if (content.endsWith('/') || content.trim().endsWith('organizations_u')) {
                fs.appendFileSync(path, '\n} } } } }');
                console.log(`Appended closing braces to: ${path}`);
            }
        }
    } catch (e) {
        console.error(`Error fixing ${path}: ${e.message}`);
    }
};

fixFile(
    'e:/ClickFlash/.agent/tools/OpenMemory/packages/openmemory-js/node_modules/@octokit/openapi-types/types.d.ts',
    '            /',
    '            }\n          };\n        }\n'
);

fixFile(
    'e:/ClickFlash/.agent/tools/OpenMemory/packages/openmemory-js/node_modules/@octokit/plugin-paginate-rest/node_modules/@octokit/openapi-types/types.d.ts',
    '          organizations_u',
    '          organizations_url?: string;\n        } | null;\n      };\n    };\n  };\n}\n'
);
