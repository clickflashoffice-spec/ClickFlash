const fs = require('fs');
const path = require('path');

const DIR = 'apps/website/src';

const replacements = [
  { regex: /\bbg-white\b/g, replacement: 'bg-[#0B111F]' },
  { regex: /\btext-slate-900\b/g, replacement: 'text-white' },
  { regex: /\btext-slate-800\b/g, replacement: 'text-white/90' },
  { regex: /\btext-slate-600\b/g, replacement: 'text-white/70' },
  { regex: /\btext-slate-500\b/g, replacement: 'text-white/60' },
  { regex: /\bbg-slate-50\b/g, replacement: 'bg-white/5' },
  { regex: /\bbg-slate-100\b/g, replacement: 'bg-white/10' },
  { regex: /\bbg-slate-200\b/g, replacement: 'bg-white/20' },
  { regex: /\bborder-slate-100\b/g, replacement: 'border-white/10' },
  { regex: /\bborder-slate-200\b/g, replacement: 'border-white/20' },
  { regex: /\bborder-slate-300\b/g, replacement: 'border-white/30' },
  // specific replacements for cases like `bg-white/90` (which shouldn't be matched by \bbg-white\b but if it is we might mess it up.
  // Wait, \bbg-white\b matches `bg-white` but not `bg-white/90`? Actually it matches `bg-white` and the `/90` remains.
  // So `bg-white/90` becomes `bg-[#0B111F]/90` which is valid in tailwind v3!
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
  
  // Custom manual replacements for Hero hover text
  // we did this manually, but just in case
  
  replacements.forEach(({ regex, replacement }) => {
    content = content.replace(regex, replacement);
  });
  
  if (original !== content) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
