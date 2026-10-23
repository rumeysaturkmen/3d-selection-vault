# 3D Selection Vault

An open catalogue of techniques for selecting objects in virtual and mixed reality.

**Site:** https://rumeysaturkmen.github.io/3d-selection-vault/

Each technique is coded against a shared set of attributes and linked to the papers that introduce and evaluate it. The goal is a 3D similarity graph: describe a new technique and see which existing ones are closest, and so which to compare against in a paper.

## Repository layout

| Path | What it holds |
| --- | --- |
| `data/techniques/` | One JSON file per technique |
| `data/publications/` | One JSON file per paper |
| `schema/attributes.json` | The attribute scheme: attributes, allowed values, weights. Read by both the validator and the site |
| `schema/*.schema.json` | JSON Schemas for technique and publication files |
| `scripts/validate-data.mjs` | Checks all data against the schemas and cross-references |
| `src/` | The website (React + TypeScript, built with Vite) |
| `.github/workflows/deploy.yml` | Validates, tests, builds and deploys to GitHub Pages on every push to `main` |

## Run it locally

Needs Node.js 22 or newer and pnpm (`corepack enable` sets up pnpm).

```sh
pnpm install
pnpm dev        # local site at http://localhost:5173
pnpm check      # validate data, run tests, build (same as CI)
```

## Add or edit a technique

1. Add `data/techniques/<id>.json`, where `<id>` is lowercase with hyphens (e.g. `bubble-cursor`). Copy an existing file as a starting point.
2. Add each paper it cites to `data/publications/<id>.json` if it isn't there already.
3. Fill `attributes` with values from `schema/attributes.json`. Use `[]` for anything not yet known.
4. Set `review.status` to `draft`. A maintainer changes it to `reviewed` after checking the paper.
5. Run `pnpm validate`, then open a pull request.

Not comfortable editing JSON? [Open an issue](../../issues/new/choose) with the technique's name and paper instead.

## Status

The 45 selection techniques here were imported from the earlier 3D Interaction Vault. They are marked `migrated` until each one is checked against its paper. The attribute scheme is version 1.0 (see the About page).

## Licence

Code and catalogue data are MIT licensed (see [LICENSE](LICENSE)). Linked papers, figures and videos belong to their authors and publishers.
