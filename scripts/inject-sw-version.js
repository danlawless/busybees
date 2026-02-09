/**
 * Stamps the git short hash into public/sw.js CACHE_NAME at build time.
 * Falls back to Date.now() if git is unavailable.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const swPath = path.join(__dirname, '..', 'public', 'sw.js');

let version;
try {
  version = execSync('git rev-parse --short HEAD').toString().trim();
} catch {
  version = Date.now().toString();
}

const content = fs.readFileSync(swPath, 'utf8');
const updated = content.replace(
  /const CACHE_NAME = '[^']*';/,
  `const CACHE_NAME = 'busybees-pos-${version}';`
);

fs.writeFileSync(swPath, updated, 'utf8');
console.log(`SW cache version: busybees-pos-${version}`);
