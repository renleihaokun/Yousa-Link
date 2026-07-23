import { writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pinyin } from 'pinyin-pro';

const require = createRequire(import.meta.url);
const { cities: worldCities } = require('world-cities-json');
const administrativeCities = require('province-city-china/dist/city.json');
const administrativeAreas = require('province-city-china/dist/area.json');
const provinces = require('province-city-china/dist/province.json');

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = resolve(projectRoot, 'src/data/cities.json');

const normalize = (value = '') => value
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

const toPinyin = (value) => normalize(pinyin(value, { toneType: 'none', type: 'array' }).join(''));

const trimAdministrativeSuffix = (name) => name
  .replace(/特别行政区$/, '')
  .replace(/维吾尔自治区$/, '')
  .replace(/壮族自治区$/, '')
  .replace(/回族自治区$/, '')
  .replace(/自治区$/, '')
  .replace(/自治州$/, '')
  .replace(/地区$/, '')
  .replace(/盟$/, '')
  .replace(/[省市]$/, '');

const manualNames = {
  hongkong: '香港',
  macau: '澳门',
  taipei: '台北',
  newtaipei: '新北',
  taoyuan: '桃园',
  taichung: '台中',
  tainan: '台南',
  kaohsiung: '高雄',
  keelung: '基隆',
  hsinchu: '新竹',
  chiayi: '嘉义',
  urumqi: '乌鲁木齐',
  hohhot: '呼和浩特',
  harbin: '哈尔滨',
  lhasa: '拉萨',
  kashgar: '喀什',
  hotan: '和田',
  korla: '库尔勒',
  turpan: '吐鲁番',
  altay: '阿勒泰',
  xishuangbanna: '西双版纳',
  dali: '大理',
  yanbian: '延边'
};

const manualAliases = {
  hongkong: ['xianggang'],
  macau: ['macao', 'aomen'],
  taipei: ['taibei'],
  newtaipei: ['xinbei'],
  taoyuan: ['taoyuan'],
  taichung: ['taizhong'],
  tainan: ['tainan'],
  kaohsiung: ['gaoxiong'],
  keelung: ['jilong'],
  hsinchu: ['xinzhu'],
  chiayi: ['jiayi'],
  urumqi: ['wulumuqi'],
  hohhot: ['huhehaote'],
  harbin: ['haerbin'],
  lhasa: ['lasa'],
  kashgar: ['kashi'],
  hotan: ['hetian'],
  korla: ['kuerle'],
  turpan: ['tulufan'],
  altay: ['aletai']
};

const chineseNames = new Map();

function registerChineseName(name) {
  const shortName = trimAdministrativeSuffix(name);
  if (!shortName) return;
  const key = toPinyin(shortName);
  if (!key || chineseNames.has(key)) return;
  chineseNames.set(key, shortName);
}

administrativeCities.forEach(({ name }) => registerChineseName(name));
administrativeAreas
  .filter(({ name }) => name.endsWith('市'))
  .forEach(({ name }) => registerChineseName(name));
provinces
  .filter(({ name }) => /市|特别行政区$/.test(name))
  .forEach(({ name }) => registerChineseName(name));

Object.entries(manualNames).forEach(([key, name]) => chineseNames.set(key, name));

const deduped = new Map();

for (const city of worldCities) {
  if (city.iso2 !== 'CN') continue;

  const cityKey = normalize(city.city_ascii || city.city);
  const name = chineseNames.get(cityKey);
  if (!cityKey || !name) continue;

  const region = normalize(city.admin_name);
  const aliases = new Set(manualAliases[cityKey] || []);
  const standardPinyin = toPinyin(name);
  if (standardPinyin && standardPinyin !== cityKey) aliases.add(standardPinyin);

  const record = {
    name,
    pinyin: cityKey,
    aliases: [...aliases].filter((alias) => alias !== cityKey).sort(),
    region,
    lat: Number(city.lat),
    lng: Number(city.lng)
  };

  const key = `${cityKey}:${region}`;
  const population = Number(city.population) || 0;
  const existing = deduped.get(key);
  if (!existing || population > existing.population) {
    deduped.set(key, { record, population });
  }
}

const cities = [...deduped.values()]
  .map(({ record }) => record)
  .sort((a, b) => a.pinyin.localeCompare(b.pinyin) || a.region.localeCompare(b.region));

await writeFile(outputPath, `${JSON.stringify({ cities }, null, 2)}\n`, 'utf8');
console.log(`Generated ${cities.length} city records at ${outputPath}`);

