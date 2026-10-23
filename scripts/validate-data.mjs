// Checks every file in data/ against the schemas and the attribute scheme,
// and checks that all cross-references point at files that exist.
// Run with: pnpm validate
import { readFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import Ajv from 'ajv';

const root = new URL('..', import.meta.url).pathname;
const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const load = (dir) =>
  readdirSync(join(root, dir))
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => ({ file: `${dir}/${f}`, data: read(`${dir}/${f}`) }));

const ajv = new Ajv({ allErrors: true, strict: false });
const checkTechnique = ajv.compile(read('schema/technique.schema.json'));
const checkPublication = ajv.compile(read('schema/publication.schema.json'));
const scheme = read('schema/attributes.json').attributes;

const techniques = load('data/techniques');
const publications = load('data/publications');
const techIds = new Set(techniques.map((t) => t.data.id));
const pubIds = new Set(publications.map((p) => p.data.id));

const errors = [];
const warnings = [];
const err = (file, msg) => errors.push(`${file}: ${msg}`);

for (const { file, data } of publications) {
  if (!checkPublication(data))
    for (const e of checkPublication.errors) err(file, `${e.instancePath || '/'} ${e.message}`);
  if (data.id !== basename(file, '.json')) err(file, `id "${data.id}" does not match the file name`);
}

const names = new Map();
for (const { file, data } of techniques) {
  if (!checkTechnique(data)) {
    for (const e of checkTechnique.errors) err(file, `${e.instancePath || '/'} ${e.message}`);
    continue;
  }
  if (data.id !== basename(file, '.json')) err(file, `id "${data.id}" does not match the file name`);

  const key = data.name.toLowerCase();
  if (names.has(key)) err(file, `same name as ${names.get(key)}`);
  names.set(key, file);

  for (const attr of scheme) {
    const values = data.attributes[attr.id];
    if (values === undefined) {
      err(file, `attributes.${attr.id} is missing (use [] if unknown)`);
      continue;
    }
    const allowed = new Set(attr.values.map((v) => v.id));
    for (const v of values)
      if (!allowed.has(v)) err(file, `attributes.${attr.id}: "${v}" is not one of ${[...allowed].join(', ')}`);
    if (!attr.multiple && values.length > 1) err(file, `attributes.${attr.id} takes one value only`);
    // Target distance does not apply to desktop (screen-cursor) techniques.
    const notApplicable = attr.id === 'targetDistance' && data.attributes.toolOrigin?.includes('screen');
    if (data.review.status === 'reviewed' && values.length === 0 && !notApplicable)
      err(file, `attributes.${attr.id} is empty but the technique is marked reviewed`);
  }
  for (const k of data.review.uncertain ?? [])
    if (!scheme.some((a) => a.id === k)) err(file, `review.uncertain: "${k}" is not an attribute`);
  if (data.review.status === 'reviewed' && (data.review.uncertain ?? []).length)
    err(file, 'review.uncertain must be empty once the technique is marked reviewed');
  for (const k of Object.keys(data.attributes))
    if (!scheme.some((a) => a.id === k)) err(file, `attributes.${k} is not in schema/attributes.json`);

  for (const p of data.publications)
    if (!pubIds.has(p.publication)) err(file, `publication "${p.publication}" does not exist`);
  for (const r of data.relationships ?? []) {
    if (!techIds.has(r.technique)) err(file, `related technique "${r.technique}" does not exist`);
    if (r.technique === data.id) err(file, 'technique is related to itself');
    if (r.source && !pubIds.has(r.source)) err(file, `relationship source "${r.source}" does not exist`);
  }
  if (data.year == null) warnings.push(`${file}: no year`);
}

const cited = new Set(techniques.flatMap((t) => (t.data.publications ?? []).map((p) => p.publication)));
for (const { file, data } of publications)
  if (!cited.has(data.id)) warnings.push(`${file}: not linked from any technique`);

const reviewed = techniques.filter((t) => t.data.review?.status === 'reviewed').length;
console.log(
  `${techniques.length} techniques (${reviewed} reviewed), ${publications.length} publications, ${warnings.length} warnings`,
);
for (const w of warnings) console.log(`  warning  ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`  error    ${e}`);
  console.error(`\n${errors.length} error(s). Fix them before merging.`);
  process.exit(1);
}
console.log('Data is valid.');
