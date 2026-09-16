const server = 'https://Toucan4Life.github.io/graph-start/src/server/data'
const version = '/v3'
export default {
  vectorTilesTiles: `${server}${version}/points/{z}/{x}/{y}.pbf`,
  glyphsSource: `${server}/fonts/{fontstack}/{range}.pbf`,
  bordersSource: `${server}${version}/borders.geojson`,
  placesSource: `${server}${version}/places.geojson`,
  categorySource: `${server}${version}/bgg_Category.csv`,
  familiesSource: `${server}${version}/bgg_GameFamily.csv`,
  mechanicsSource: `${server}${version}/bgg_Mechanic.csv`,
  iconSource: `${server}${version}/icon`,
  namesEndpoint: `${server}${version}/names`,
  graphsEndpoint: `${server}${version}/graphs`,
  compressedGraphEndpoint: `${server}${version}/compressedGraphs`,
}
