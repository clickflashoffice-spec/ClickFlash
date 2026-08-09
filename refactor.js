const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'apps/master/src');
const componentsToRemove = ['Button', 'Card', 'Input', 'Modal', 'Skeleton', 'Spinner', 'Toast', 'ErrorBoundary', 'OfflineScreen'];
const namedSkeletons = ['AlbumCardSkeleton', 'OrderCardSkeleton', 'StatCardSkeleton', 'TableRowSkeleton', 'ListItemSkeleton', 'PhotoGridSkeleton'];

// Create AppSkeletons.tsx
const skeletonPath = path.join(srcDir, 'components/common/Skeleton.tsx');
if (fs.existsSync(skeletonPath)) {
    const oldSkeletonCode = fs.readFileSync(skeletonPath, 'utf8');
    let newAppSkeletonsCode = oldSkeletonCode
        .replace("import Card from './Card';", "import { Card } from '@clickflash/ui';\nimport { Skeleton } from '@clickflash/ui';")
        .replace(/<SkeletonBase/g, '<Skeleton')
        .replace(/<\/SkeletonBase>/g, '</Skeleton>')
        .replace(/const SkeletonBase[\s\S]*?;\n/g, '')
        .replace(/\/\*\*[\s\S]*?Generic skeleton for custom layouts[\s\S]*?export const Skeleton:[\s\S]*?export default Skeleton;/g, '');
    
    fs.writeFileSync(path.join(srcDir, 'components/common/AppSkeletons.tsx'), newAppSkeletonsCode);
    console.log('Created AppSkeletons.tsx');
}

function processFile(filePath) {
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return;
    if (filePath.includes('common\\Skeleton.tsx') || filePath.includes('common/Skeleton.tsx')) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let uiImports = new Set();
    
    // Replace imports from common base components
    const importRegex = /import\s+(?:(\w+)|\{\s*([\w\s,]+)\s*\})\s+from\s+['"]([^'"]+common\/([^'"]+))['"];?/g;
    
    content = content.replace(importRegex, (match, defaultImport, namedImports, importPath, componentName) => {
        let cleanName = componentName.replace(/\.tsx?$/, '');
        
        if (componentsToRemove.includes(cleanName)) {
            let stillLocal = [];
            
            if (defaultImport) {
                if (cleanName === 'Skeleton' && namedSkeletons.includes(defaultImport)) {
                    // This shouldn't happen usually for default import, but just in case
                } else {
                    uiImports.add(defaultImport);
                }
            }
            if (namedImports) {
                namedImports.split(',').forEach(i => {
                    let name = i.trim();
                    if (cleanName === 'Skeleton' && namedSkeletons.includes(name)) {
                        stillLocal.push(name);
                    } else {
                        uiImports.add(name);
                    }
                });
            }
            
            if (stillLocal.length > 0) {
                // Change import to AppSkeletons
                let newImportPath = importPath.replace('Skeleton', 'AppSkeletons');
                return `import { ${stillLocal.join(', ')} } from '${newImportPath}';`;
            }
            return ''; // Remove the old import
        }
        return match; // keep original if not in our list
    });
    
    // Add the UI imports if any were found
    if (uiImports.size > 0) {
        const importsArr = Array.from(uiImports).filter(i => i);
        const existingUIRegex = /import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]@clickflash\/ui['"];?/;
        if (existingUIRegex.test(content)) {
            content = content.replace(existingUIRegex, (match, existingImports) => {
                existingImports.split(',').forEach(i => uiImports.add(i.trim()));
                return `import { ${Array.from(uiImports).filter(i=>i).join(', ')} } from "@clickflash/ui";`;
            });
        } else {
            // insert at top
            content = `import { ${importsArr.join(', ')} } from "@clickflash/ui";\n` + content;
        }
    }
    
    // Standardize prop APIs for Button
    const buttonRegex = /<(Button|motion\.button)([^>]*?)(\s)loading(=\{[^}]*\}|\s|>)/g;
    content = content.replace(buttonRegex, '<$1$2$3isLoading$4');
    
    // Also change `loading` on Button without value (boolean shorthand)
    // The regex above covers ` loading ` and ` loading=` and ` loading>`.
    
    if (content !== originalContent) {
        // Clean up double empty lines
        content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
    }
}

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            results.push(file);
        }
    });
    return results;
}

const allFiles = walk(srcDir);
allFiles.forEach(processFile);

componentsToRemove.forEach(comp => {
    const p1 = path.join(srcDir, 'components/common', comp + '.tsx');
    const p2 = path.join(srcDir, 'components/common', comp + '.ts');
    if (fs.existsSync(p1)) {
        fs.unlinkSync(p1);
        console.log(`Deleted ${p1}`);
    }
    if (fs.existsSync(p2)) {
        fs.unlinkSync(p2);
        console.log(`Deleted ${p2}`);
    }
});
