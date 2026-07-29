import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import polygonClipping from 'polygon-clipping';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_PATH = path.join(ROOT, 'scripts', 'map-data', 'neighbors-natural-earth.source.geo.json');
const CHINA_PATH = path.join(ROOT, 'public', 'china.geo.json');
const OUTPUT_PATH = path.join(ROOT, 'public', 'neighbors.geo.json');
const MERGED_OUTPUT_PATH = path.join(ROOT, 'public', 'tour-map.geo.json');
const EXPECTED_FEATURE_COUNT = 21;
const AREA_EPSILON = 1e-12;

function fail(message) {
  throw new Error(message);
}

function toMultiPolygon(geometry, label) {
  if (!geometry || !Array.isArray(geometry.coordinates)) {
    fail(`${label}: missing geometry coordinates`);
  }

  if (geometry.type === 'Polygon') return [geometry.coordinates];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates;
  fail(`${label}: unsupported geometry type ${geometry.type}`);
}

function signedRingArea(ring) {
  let area = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    area += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return area / 2;
}

function multiPolygonArea(multiPolygon) {
  return multiPolygon.reduce((total, polygon) => {
    if (polygon.length === 0) return total;
    const outerArea = Math.abs(signedRingArea(polygon[0]));
    const holesArea = polygon.slice(1).reduce(
      (sum, ring) => sum + Math.abs(signedRingArea(ring)),
      0
    );
    return total + Math.max(0, outerArea - holesArea);
  }, 0);
}

function validateGeometry(geometry, label) {
  const multiPolygon = toMultiPolygon(geometry, label);
  if (multiPolygon.length === 0) fail(`${label}: empty geometry`);

  for (const [polygonIndex, polygon] of multiPolygon.entries()) {
    if (!Array.isArray(polygon) || polygon.length === 0) {
      fail(`${label}: polygon ${polygonIndex} has no rings`);
    }

    for (const [ringIndex, ring] of polygon.entries()) {
      if (!Array.isArray(ring) || ring.length < 4) {
        fail(`${label}: ring ${polygonIndex}.${ringIndex} is too short`);
      }
      for (const pair of ring) {
        if (
          !Array.isArray(pair) ||
          pair.length < 2 ||
          !Number.isFinite(pair[0]) ||
          !Number.isFinite(pair[1])
        ) {
          fail(`${label}: ring ${polygonIndex}.${ringIndex} has an invalid coordinate`);
        }
      }
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        fail(`${label}: ring ${polygonIndex}.${ringIndex} is not closed`);
      }
      if (Math.abs(signedRingArea(ring)) <= AREA_EPSILON) {
        fail(`${label}: ring ${polygonIndex}.${ringIndex} has zero area`);
      }
    }
  }

  if (multiPolygonArea(multiPolygon) <= AREA_EPSILON) {
    fail(`${label}: geometry has zero area`);
  }
  return multiPolygon;
}

function validateFeatureCollection(collection, label, expectedCount) {
  if (collection?.type !== 'FeatureCollection' || !Array.isArray(collection.features)) {
    fail(`${label}: expected a GeoJSON FeatureCollection`);
  }
  if (expectedCount !== undefined && collection.features.length !== expectedCount) {
    fail(`${label}: expected ${expectedCount} features, found ${collection.features.length}`);
  }

  const ids = new Set();
  for (const [index, feature] of collection.features.entries()) {
    const featureLabel = `${label} feature ${feature.id ?? index}`;
    if (feature?.type !== 'Feature') fail(`${featureLabel}: expected a Feature`);
    if (feature.id === undefined || ids.has(feature.id)) {
      fail(`${featureLabel}: missing or duplicate feature id`);
    }
    ids.add(feature.id);
    if (typeof feature.properties?.name !== 'string' || feature.properties.name.length === 0) {
      fail(`${featureLabel}: missing country name`);
    }
    validateGeometry(feature.geometry, featureLabel);
  }
}

function geometryFromMultiPolygon(multiPolygon) {
  if (multiPolygon.length === 1) {
    return { type: 'Polygon', coordinates: multiPolygon[0] };
  }
  return { type: 'MultiPolygon', coordinates: multiPolygon };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function generate() {
  const [source, china] = await Promise.all([
    readJson(SOURCE_PATH),
    readJson(CHINA_PATH)
  ]);

  validateFeatureCollection(source, 'neighbor source', EXPECTED_FEATURE_COUNT);
  if (china?.type !== 'FeatureCollection' || !Array.isArray(china.features)) {
    fail('china source: expected a GeoJSON FeatureCollection');
  }

  const chinaLandFeatures = china.features.filter(
    (feature) => typeof feature.properties?.adcode === 'number'
  );
  if (chinaLandFeatures.length === 0) fail('china source: no numeric adcode land features');

  const chinaLand = polygonClipping.union(
    ...chinaLandFeatures.map((feature) =>
      validateGeometry(feature.geometry, `china feature ${feature.properties.adcode}`)
    )
  );
  if (multiPolygonArea(chinaLand) <= AREA_EPSILON) fail('china source: union has zero area');

  const features = source.features.map((feature) => {
    const label = `${feature.properties.name} (${feature.id})`;
    const clipped = polygonClipping.difference(
      toMultiPolygon(feature.geometry, label),
      chinaLand
    );
    if (multiPolygonArea(clipped) <= AREA_EPSILON) {
      fail(`${label}: clipping removed the entire country`);
    }

    const overlap = polygonClipping.intersection(clipped, chinaLand);
    const overlapArea = multiPolygonArea(overlap);
    if (overlapArea > AREA_EPSILON) {
      fail(`${label}: still overlaps China by ${overlapArea} square degrees`);
    }

    const geometry = geometryFromMultiPolygon(clipped);
    validateGeometry(geometry, `${label} output`);
    return { ...feature, geometry };
  });

  const output = { type: 'FeatureCollection', features };
  validateFeatureCollection(output, 'generated neighbors', EXPECTED_FEATURE_COUNT);
  const merged = {
    type: 'FeatureCollection',
    features: [
      ...features.filter((feature) => feature.properties.name !== 'China'),
      ...china.features
    ]
  };
  return {
    neighbors: `${JSON.stringify(output)}\n`,
    merged: `${JSON.stringify(merged)}\n`
  };
}

async function checkGeneratedFile(filePath, expected, label) {
  let current;
  try {
    current = await readFile(filePath, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') fail(`${label} is missing; run pnpm generate:map`);
    throw error;
  }
  if (current !== expected) fail(`${label} is stale; run pnpm generate:map`);
}

async function main() {
  const mode = process.argv[2];
  if (mode !== '--write' && mode !== '--check') {
    fail('Usage: node scripts/generate-map-data.mjs --write|--check');
  }

  const generated = await generate();
  if (mode === '--write') {
    await Promise.all([
      writeFile(OUTPUT_PATH, generated.neighbors, 'utf8'),
      writeFile(MERGED_OUTPUT_PATH, generated.merged, 'utf8')
    ]);
    console.log(`Generated ${path.relative(ROOT, OUTPUT_PATH)} and ${path.relative(ROOT, MERGED_OUTPUT_PATH)}.`);
    return;
  }

  await Promise.all([
    checkGeneratedFile(OUTPUT_PATH, generated.neighbors, 'public/neighbors.geo.json'),
    checkGeneratedFile(MERGED_OUTPUT_PATH, generated.merged, 'public/tour-map.geo.json')
  ]);
  console.log('Map data check passed: generated layers are current and non-overlapping.');
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
