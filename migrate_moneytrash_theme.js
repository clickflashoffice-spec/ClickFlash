const fs = require('fs');
const path = require('path');

const DIR = 'apps/moneytrash/src';

const replacements = [
  { regex: /\bbg-zinc-950\b/g, replacement: 'bg-[#0B111F]' },
  { regex: /\bbg-zinc-900\b/g, replacement: 'bg-[#131C31]' },
  { regex: /\bborder-zinc-800\b/g, replacement: 'border-white/10' },
  { regex: /\bborder-zinc-700\b/g, replacement: 'border-white/20' },
  { regex: /\btext-zinc-600\b/g, replacement: 'text-slate-500' },
  { regex: /\btext-zinc-500\b/g, replacement: 'text-slate-400' },
  { regex: /\btext-zinc-400\b/g, replacement: 'text-slate-300' },
  { regex: /\btext-zinc-300\b/g, replacement: 'text-slate-200' },
  { regex: /\bbg-zinc-800\b/g, replacement: 'bg-white/5' },
  { regex: /\bhover:bg-zinc-700\b/g, replacement: 'hover:bg-white/10' },
  { regex: /\bbg-yellow-500\b/g, replacement: 'bg-[#06B6D4]' },
  { regex: /\bhover:bg-yellow-400\b/g, replacement: 'hover:bg-[#06B6D4]/80' },
  { regex: /\btext-yellow-500\b/g, replacement: 'text-[#06B6D4]' },
  { regex: /\btext-yellow-400\b/g, replacement: 'text-[#06B6D4]/80' },
  { regex: /\border-yellow-500\b/g, replacement: 'border-[#06B6D4]' },
  { regex: /\bbg-green-500\b/g, replacement: 'bg-[#8B5CF6]' },
  { regex: /\btext-green-500\b/g, replacement: 'text-[#8B5CF6]' },
  { regex: /\bborder-green-500\b/g, replacement: 'border-[#8B5CF6]' },
  { regex: /\baccent-yellow-500\b/g, replacement: 'accent-[#06B6D4]' },
  { regex: /\bfocus:ring-yellow-500\b/g, replacement: 'focus:ring-[#06B6D4]' },
  { regex: /\bshadow-yellow-500\b/g, replacement: 'shadow-[#06B6D4]' },
  { regex: /\bshadow-green-500\b/g, replacement: 'shadow-[#8B5CF6]' },
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
