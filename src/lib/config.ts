const server = 'https://Toucan4Life.github.io/graph-start/src/server/data' //'http://localhost:3010/data'
const version = '/v3'
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
  extendedGraphEndpoint: `${server}${version}/extendedGraphs`,
  compressedGraphEndpoint: `${server}${version}/compressedGraphs`,
}
