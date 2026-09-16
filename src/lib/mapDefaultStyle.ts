import type { MapOptions } from 'maplibre-gl'
import config from './config'
import getColorTheme from './getColorTheme'
import { emptyFeatureCollection } from './mapStyleExpressions'

const currentColorTheme = getColorTheme()

/**
 * The main map's declarative MapLibre style: sources (borders/points/places/selected-nodes/
 * graph-edges) and layers (background, polygon fill, border highlight, point labels, place
 * labels). The `circle-layer` and `graph-edges` layers are added dynamically after icons load
 * (see `BoardGameMap.LoadMap`), so they aren't part of this initial style.
 */
export function getDefaultMapStyle(containerValue: HTMLDivElement): MapOptions {
  return {
    hash: true,
    container: containerValue,
    center: [0, 0],
    zoom: 2,
    style: {
      version: 8,
      glyphs: config.glyphsSource,
      sources: {
        'borders-source': { type: 'geojson', data: config.bordersSource },
        'points-source': {
          type: 'vector',
          tiles: [config.vectorTilesTiles],
          minzoom: 0,
          maxzoom: 6,
          bounds: [-154.781, -147.422, 154.781, 147.422],
        },
        place: { type: 'geojson', data: config.placesSource },
        'selected-nodes': { type: 'geojson', data: emptyFeatureCollection() },
        'graph-edges-source': { type: 'geojson', data: emptyFeatureCollection() },
      },
      layers: [
        {
          id: 'background',
          type: 'background',
          paint: {
            'background-color': currentColorTheme.background,
          },
        },
        {
          id: 'polygon-layer',
          type: 'fill',
          source: 'borders-source',
          filter: ['==', '$type', 'Polygon'],
          paint: {
            'fill-color': [
              'match',
              ['get', 'fill'],
              '#516ebc',
              '#27313A',
              '#00529c',
              '#2C3A33',
              '#153477',
              '#352C36',
              '#37009c',
              '#2F2F34',
              ['get', 'fill'],
            ],
          },
        },
        {
          id: 'border-highlight',
          type: 'line',
          source: 'borders-source',
          layout: {
            visibility: 'none',
          },
          paint: {
            'line-color': '#FFF',
            'line-width': 4,
          },
        },
        // Circle layer will be added dynamically after icons are loaded
        {
          id: 'label-layer',
          type: 'symbol',
          source: 'points-source',
          'source-layer': 'points',
          filter: ['>=', ['zoom'], 6],
          layout: {
            'text-allow-overlap': false,
            'text-ignore-placement': false,
            'text-font': ['Roboto Condensed Regular'],
            'text-field': ['get', 'label'],
            'text-anchor': 'top',
            'text-max-width': 10,
            'symbol-sort-key': ['-', 0, ['to-number', ['get', 'size']]],
            'symbol-spacing': 500,
            'text-offset': [0, 0.5],
            'text-size': [
              'interpolate',
              ['linear'],
              ['zoom'],
              6,
              ['*', ['-', ['log10', ['+', ['to-number', ['get', 'size']], 1]], 0.301], 5],
              10,
              ['+', ['*', ['-', ['log10', ['+', ['to-number', ['get', 'size']], 1]], 0.301], 1.5], 20],
            ],
          },
          paint: {
            'text-color': currentColorTheme.circleLabelsColor,
            'text-halo-color': currentColorTheme.circleLabelsHaloColor,
            'text-halo-width': currentColorTheme.circleLabelsHaloWidth,
          },
        },
        {
          id: 'selected-nodes-labels-layer',
          type: 'symbol',
          source: 'selected-nodes',
          layout: {
            'text-allow-overlap': true,
            'text-ignore-placement': false,
            'text-font': ['Roboto Condensed Regular'],
            'text-field': ['get', 'name'],
            'text-anchor': 'top',
            'text-max-width': 10,
            'symbol-sort-key': ['-', 0, ['to-number', ['get', 'textSize']]],
            'symbol-spacing': 500,
            'text-offset': [0, 0.5],
            'text-size': ['interpolate', ['linear'], ['zoom'], 2, 15, 10, 30],
          },
          paint: {
            'text-color': '#fff',
            'text-halo-color': ['get', 'color'],
            'text-halo-width': 2,
          },
        },
        {
          id: 'place-country-1',
          maxzoom: 10,
          type: 'symbol',
          source: 'place',
          layout: {
            'text-font': ['Roboto Condensed Bold'],
            'text-size': [
              'interpolate',
              ['cubic-bezier', 0.2, 0, 0.7, 1],
              ['zoom'],
              1,
              ['step', ['get', 'symbolzoom'], 15, 4, 13, 5, 12],
              9,
              ['step', ['get', 'symbolzoom'], 22, 4, 19, 5, 17],
            ],
            'symbol-sort-key': ['get', 'symbolzoom'],
            'text-field': '{name}',
            'text-max-width': 6,
            'text-line-height': 1.1,
            'text-letter-spacing': 0,
          },
          paint: {
            'text-color': currentColorTheme.placeLabelsColor,
            'text-halo-color': currentColorTheme.placeLabelsHaloColor,
            'text-halo-width': currentColorTheme.placeLabelsHaloWidth,
          },
          filter: ['<=', ['get', 'symbolzoom'], ['+', ['zoom'], 4]],
        },
      ],
    },
  }
}
