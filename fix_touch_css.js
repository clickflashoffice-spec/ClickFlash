const fs = require('fs');
const filePath = 'e:/ClickFlash/apps/touch/src/index.css';
console.log('Reading file:', filePath);
let content = fs.readFileSync(filePath, 'utf8');

const originalContent = content;

// Use greedy regex to catch any variation with spaces/underscores/etc.
content = content.replace(/shadow-\[.*?31,\s*38,\s*135,\s*0\.07\].*?\]/g, 'shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]');
content = content.replace(/shadow-\[.*?0,\s*0,\s*0,\s*0\.3\].*?\]/g, 'shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]');

if (content === originalContent) {
    console.log('No changes made. Greedy patterns did not match.');
    // Try even simpler: replace line 27 directly if we can identify it
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('shadow-') && lines[i].includes('rgba(31,')) {
            console.log('Found line via simple search at index:', i);
            lines[i] = lines[i].replace(/shadow-\[.*?\]/g, (match) => match.replace(/\s+/g, '_'));
            // Remove the underscores that aren't needed but keep the one needed by Tailwind JIT inside rgba if we follow that pattern
            // Actually, Tailwind JIT inside brackets usually works best with NO spaces or underscores for commas.
            lines[i] = lines[i].replace(/shadow-\[.*?\]/g, (match) => match.replace(/[\s_]+/g, '').replace(/shadow-\[/, 'shadow-[').replace(/\]$/, ']'));
            // Wait, simpler: replace line 27 with hardcoded known good fix
            lines[i] = '        @apply bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)];';
            console.log('Replaced line with hardcoded fix');
        }
    }
    content = lines.join('\n');
}

fs.writeFileSync(filePath, content);
console.log('Update attempt finished.');
