import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'src');

const IGNORE_PATH_FRAGMENTS = [
  `${path.sep}landing${path.sep}`,
  `${path.sep}storage${path.sep}migration.ts`,
  `${path.sep}storage${path.sep}schema.ts`,
];

const CHECK_PATTERNS = [
  { name: 'seedDemoData usage', regex: /seedDemoData/g },
  { name: 'mock signature placeholder', regex: /mock-signature/g },
  { name: 'placeholder public key', regex: /placeholder-public-key/g },
  { name: 'simulated verification output', regex: /simulated\s+verification/gi },
  { name: 'hardcoded MOCK object', regex: /\bMOCK\b/g },
];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }

    if (!/\.(ts|tsx|js|jsx)$/.test(entry.name)) continue;
    files.push(fullPath);
  }

  return files;
}

function shouldIgnore(filePath) {
  return IGNORE_PATH_FRAGMENTS.some((fragment) => filePath.includes(fragment));
}

const violations = [];
const files = walk(SRC_DIR).filter((filePath) => !shouldIgnore(filePath));

for (const filePath of files) {
  const content = fs.readFileSync(filePath, 'utf8');

  for (const pattern of CHECK_PATTERNS) {
    const matches = [...content.matchAll(pattern.regex)];
    for (const match of matches) {
      const index = match.index ?? 0;
      const before = content.slice(0, index);
      const line = before.split('\n').length;

      violations.push({
        file: path.relative(ROOT, filePath),
        line,
        pattern: pattern.name,
        text: match[0],
      });
    }
  }
}

if (violations.length > 0) {
  console.error('No-mock enforcement failed. Found blocked patterns:\n');
  for (const violation of violations) {
    console.error(`- ${violation.file}:${violation.line} [${violation.pattern}] -> ${violation.text}`);
  }
  process.exit(1);
}

console.log('No-mock enforcement passed.');
