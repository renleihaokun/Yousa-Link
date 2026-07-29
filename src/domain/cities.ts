import citiesData from '../data/cities.json';
import type { Tour } from './tours';

export type CityRecord = {
  name: string;
  pinyin: string;
  aliases: string[];
  region: string;
  lat: number;
  lng: number;
};

const cities = citiesData.cities as CityRecord[];
const cityLookup = new Map<string, CityRecord[]>();

export function normalizeLocationName(value = '') {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/city$/, '');
}

for (const city of cities) {
  for (const key of [city.pinyin, ...city.aliases]) {
    const normalized = normalizeLocationName(key);
    const entries = cityLookup.get(normalized) || [];
    entries.push(city);
    cityLookup.set(normalized, entries);
  }
}

export function findCity(cityName?: string, regionName?: string) {
  const candidates = cityLookup.get(normalizeLocationName(cityName)) || [];
  if (candidates.length <= 1) return candidates[0];

  const region = normalizeLocationName(regionName);
  if (!region) return undefined;
  return candidates.find((candidate) => normalizeLocationName(candidate.region) === region);
}

export function getTourCity(tour: Tour) {
  const tourId = normalizeLocationName(tour.id);
  return cities.find((city) => city.pinyin === tourId)
    || cities.find((city) => city.name === tour.to);
}

export function getDistanceKm(from: CityRecord, to: CityRecord) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const lat1 = radians(from.lat);
  const lat2 = radians(to.lat);
  const latDelta = radians(to.lat - from.lat);
  const lngDelta = radians(to.lng - from.lng);
  const haversine = Math.sin(latDelta / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(lngDelta / 2) ** 2;
  const centralAngle = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return Math.round(6371 * centralAngle);
}

export function isSameCity(first: CityRecord, second: CityRecord) {
  return first.pinyin === second.pinyin && first.region === second.region;
}
