# Map data provenance and generation

`neighbors-natural-earth.source.geo.json` contains the 21-country source used
to generate the public neighboring-country layer. It is generation input only
and must never be copied to `public/` or rendered directly.

## Provenance

- Git commit `758d453` introduced the former `public/world.geo.json`.
- Git commit `1ac9f19` selected 21 features from that file into
  `public/neighbors.geo.json`.
- The structure and coordinates match the widely distributed
  `johan/world.geo.json` / Natural Earth country data, but the repository does
  not record the original download URL or license notice. This is an inferred
  provenance, not a verified chain of custody.
- `public/china.geo.json` is a separate province-level, DataV-style dataset.
  Its numeric `adcode` features are the project's sole clipping boundary.
  The `100000_JD` maritime boundary feature is intentionally excluded from the
  land-area mask.

## Required workflow

Run `pnpm generate:map` after either source changes. The generator subtracts
the China land mask from every neighboring country and writes
`public/neighbors.geo.json`. `pnpm check:map` verifies that the generated file
is current, structurally valid, and has no positive-area overlap with China.
The production build runs this check automatically.

This process prevents conflicting neighboring-country polygons from covering
the China layer. It does not constitute official map review or provide a map
review number.
