#!/usr/bin/env node
/**
 * Extracts foodData + foodDetails from gut-check's index.html
 * and writes a clean fodmap.json + fodmap.meta.json at repo root.
 *
 * Usage: node scripts/extract.js
 *
 * The script clones (or updates) the upstream repo into /tmp,
 * parses the two JS object literals, merges them into a flat array,
 * and writes the output files. No external dependencies.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const UPSTREAM = 'https://github.com/gut-check/gut-check.github.io.git';
const TMP_DIR = '/tmp/gut-check-upstream';
const REPO_ROOT = path.join(__dirname, '..');

function run(cmd, opts = {}) {
  return execSync(cmd, { stdio: 'pipe', encoding: 'utf8', ...opts }).trim();
}

// 1. Clone or update upstream
if (fs.existsSync(TMP_DIR)) {
  console.log('Updating upstream clone...');
  run(`git -C ${TMP_DIR} fetch --depth=1 origin`);
  run(`git -C ${TMP_DIR} reset --hard origin/main`);
} else {
  console.log('Cloning upstream...');
  run(`git clone --depth=1 ${UPSTREAM} ${TMP_DIR}`);
}

const upstreamSha = run(`git -C ${TMP_DIR} rev-parse HEAD`).slice(0, 7);
console.log(`Upstream SHA: ${upstreamSha}`);

// 2. Read index.html
const htmlPath = path.join(TMP_DIR, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

// 3. Extract the two JS object literals by matching balanced braces
function extractObject(source, declaration) {
  const startIdx = source.indexOf(declaration);
  if (startIdx === -1) throw new Error(`Could not find: ${declaration}`);
  const braceStart = source.indexOf('{', startIdx);
  let depth = 0;
  let inString = null;
  let escaped = false;
  for (let i = braceStart; i < source.length; i++) {
    const ch = source[i];
    if (escaped) { escaped = false; continue; }
    if (inString) {
      if (ch === '\\') { escaped = true; }
      else if (ch === inString) { inString = null; }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inString = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return source.slice(braceStart, i + 1);
    }
  }
  throw new Error(`Unbalanced braces for: ${declaration}`);
}

const foodDetailsSrc = extractObject(html, 'const foodDetails');
const foodDataSrc = extractObject(html, 'const foodData');

// 4. Eval them in an isolated function (source is trusted MIT code we just cloned)
const { foodData, foodDetails } = (new Function(`
  const foodDetails = ${foodDetailsSrc};
  const foodData = ${foodDataSrc};
  return { foodData, foodDetails };
`))();

// 5. Flatten into a single sorted array
const flat = [];
for (const [categoryKey, category] of Object.entries(foodData)) {
  for (const food of category.foods) {
    const details = foodDetails[food.name] || null;
    flat.push({
      name: food.name,
      category: categoryKey,
      category_title: category.title,
      category_icon: category.icon,
      emoji: food.emoji || null,
      level: food.level,
      serving: food.serving || null,
      portions: food.portions || null,
      fodmap_types: details?.fodmapTypes || null,
      reasons: details?.reasons || null,
      alternatives: details?.alternatives || null,
    });
  }
}

flat.sort((a, b) => {
  if (a.category !== b.category) return a.category.localeCompare(b.category);
  return a.name.localeCompare(b.name);
});

// 6. Compute stats
const byLevel = flat.reduce((acc, f) => { acc[f.level] = (acc[f.level] || 0) + 1; return acc; }, {});
const byCategory = flat.reduce((acc, f) => { acc[f.category] = (acc[f.category] || 0) + 1; return acc; }, {});

// 7. Write outputs
const jsonPath = path.join(REPO_ROOT, 'fodmap.json');
const metaPath = path.join(REPO_ROOT, 'fodmap.meta.json');

fs.writeFileSync(jsonPath, JSON.stringify(flat, null, 2) + '\n');
fs.writeFileSync(metaPath, JSON.stringify({
  last_sync_utc: new Date().toISOString(),
  source_repo: 'https://github.com/gut-check/gut-check.github.io',
  source_commit: upstreamSha,
  total_foods: flat.length,
  by_level: byLevel,
  by_category: byCategory,
}, null, 2) + '\n');

console.log(`\n✅ Extraction complete`);
console.log(`   Total foods: ${flat.length}`);
console.log(`   By level:`, byLevel);
console.log(`   Wrote ${jsonPath}`);
console.log(`   Wrote ${metaPath}`);
