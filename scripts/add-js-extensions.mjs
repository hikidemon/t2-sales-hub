/**
 * Adds explicit `.js` extensions to the relative imports of a package.
 *
 * The package is consumed both by a bundler (Vite, `moduleResolution:
 * bundler`) and by a Node ESM app (`moduleResolution: NodeNext`), and
 * NodeNext requires the extension. Bundlers resolve `./x.js` to
 * `./x.ts` as well, so one form works for both.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      walk(path, out);
    } else if (path.endsWith('.ts') && !path.endsWith('.test.ts')) {
      out.push(path);
    }
  }
  return out;
}

const root = process.argv[2];
if (!root) {
  console.error('usage: node add-js-extensions.mjs <package-src-dir>');
  process.exit(1);
}

for (const file of walk(root)) {
  const before = readFileSync(file, 'utf8');
  let after = before;

  after = after.replace(/from '(\.[^']*)'/g, (match, specifier) => {
    if (specifier.endsWith('.js') || specifier.endsWith('.json')) return match;
    return `from '${specifier}.js'`;
  });

  after = after.replace(/import\('(\.[^']*)'\)/g, (match, specifier) => {
    if (specifier.endsWith('.js') || specifier.endsWith('.json')) return match;
    return `import('${specifier}.js')`;
  });

  if (after !== before) {
    writeFileSync(file, after);
    console.log('updated', file.replace(root, 'src'));
  }
}
