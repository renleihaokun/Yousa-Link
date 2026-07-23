# City data sources

`cities.json` is generated from these development-time sources:

- `province-city-china@8.5.8` for Chinese administrative names.
- `world-cities-json@1.0.1` for WGS84 city-center coordinates and English names.
  Its data is distributed under CC BY 4.0 and is sourced from the SimpleMaps
  World Cities Database.

Only the generated China city lookup is shipped to the browser. The original
worldwide dataset is not included in the production bundle.

