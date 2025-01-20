
const hostName = window.location.hostname;
const isDev = false;
const server = isDev ? `http://${hostName}:3010/data` : 'https://Toucan4Life.github.io/graph-start/src/server/data';
const version = '/v1';

export default {
  serverUrl: '',
  // vectorTilesSource: 'http://192.168.86.79:8082/data/cities.json',
  vectorTilesTiles: `${server}${version}/points/{z}/{x}/{y}.pbf`,
  glyphsSource: `${server}/fonts/{fontstack}/{range}.pbf`,
  bordersSource: `${server}${version}/borders.geojson`,
  placesSource: `${server}${version}/places.geojson`,
  iconSource: `${server}${version}/icon`,
  namesEndpoint: `${server}${version}/names`,
  graphsEndpoint: `${server}${version}/graphs`,
};