const fs = require('fs');
const path = require('path');

const DIR = 'apps/moneytrash/src/components';

const replacements = [
  { regex: /\bbg-slate-900\b/g, replacement: 'bg-[#0B111F]' },
  { regex: /\bbg-slate-800\b/g, replacement: 'bg-[#131C31]' },
  { regex: /\bdark:bg-slate-800\b/g, replacement: 'bg-[#131C31]' },
  { regex: /\bborder-slate-800\b/g, replacement: 'border-white/10' },
  { regex: /\bdark:border-slate-800\b/g, replacement: 'border-white/10' },
  { regex: /\bdark:border-slate-700\b/g, replacement: 'border-white/20' },
  { regex: /\bborder-slate-700\b/g, replacement: 'border-white/20' },
  { regex: /\bbg-slate-700\b/g, replacement: 'bg-white/5' },
  { regex: /\bdark:bg-slate-700\b/g, replacement: 'bg-white/5' },
  { regex: /\bhover:bg-slate-700\b/g, replacement: 'hover:bg-white/10' },
  { regex: /\bdark:hover:bg-slate-700\b/g, replacement: 'hover:bg-white/10' },
  { regex: /\btext-slate-100\b/g, replacement: 'text-white' },
  { regex: /\btext-slate-200\b/g, replacement: 'text-white/90' },
  { regex: /\bdark:text-slate-200\b/g, replacement: 'text-white/90' },
  { regex: /\btext-slate-300\b/g, replacement: 'text-white/70' },
  { regex: /\bdark:text-slate-300\b/g, replacement: 'text-white/70' },
  { regex: /\btext-slate-400\b/g, replacement: 'text-white/60' },
  { regex: /\bdark:text-slate-400\b/g, replacement: 'text-white/60' },
  { regex: /\btext-slate-500\b/g, replacement: 'text-white/50' },
  { regex: /\bdark:text-slate-500\b/g, replacement: 'text-white/50' },
];

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk(DIR);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  replacements.forEach(({ regex, replacement }) => {
    content = content.replace(regex, replacement);
  });
  
  if (original !== content) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
