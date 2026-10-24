import { describe, expect, it } from 'vitest';
import { publications, getPublication } from './data';
import { toBibtex, toBibtexFile } from './bibtex';

describe('bibtex', () => {
  it('produces an entry for every publication', () => {
    for (const p of publications) expect(toBibtex(p)).toMatch(/^@\w+\{[a-z]+\d*[a-z0-9]*,\n/);
  });
  it('uses the right entry types', () => {
    expect(toBibtex(getPublication('bowman-1999-thesis')!)).toMatch(/^@phdthesis/);
    expect(toBibtex(getPublication('legacy-paper-port')!)).toMatch(/^@mastersthesis/);
    expect(toBibtex(getPublication('legacy-paper-raycasting')!)).toMatch(/^@techreport/);
    expect(toBibtex(getPublication('seed-argelaguet-2013')!)).toMatch(/^@article/);
  });
  it('escapes special characters and keeps keys unique', () => {
    const file = toBibtexFile(publications);
    const keys = [...file.matchAll(/^@\w+\{([^,]+),/gm)].map((m) => m[1]);
    expect(new Set(keys).size).toBe(publications.length);
    expect(file).not.toMatch(/[^\\]& /);
  });
});
