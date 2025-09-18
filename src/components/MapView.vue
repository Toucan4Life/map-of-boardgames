<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import maplibregl, { GeoJSONSource, LngLat, Map as MapLibreMap, MapMouseEvent, type LngLatLike, type MapGeoJSONFeature } from 'maplibre-gl'
import { BoardGameMap, type SearchParameters } from '@/lib/createMap'
import type { SearchResult } from '@/lib/createFuzzySearcher'
import type { Repositories } from '@/lib/FocusViewModel'
import createMarkerEditor from '@/lib/label-editor/createDOMMarkerEditor'
import { getPlaceLabels, addLabelToPlaces, editLabelInPlaces } from '@/lib/label-editor/labelsStorage'
defineExpose({
  clearBorderHighlights,
  dispose,
  clearHighlights,
  makeVisible,
  getGroupIdAt,
  highlightNode,
  getPlacesGeoJSON,
})

const emit = defineEmits<{
  (e: 'focusOnRepo', nearestCityId: number, bggId: number, projects: string): void
  (
    e: 'showContextMenu',
    contextMenuItems:
      | {
          items: {
            text: string
            click: () => void
          }[]
          left: string
          top: string
        }
      | undefined,
  ): void
  (e: 'repoSelected', repoSelected: SearchResult): void
  (e: 'showLargestInGroup', bggId: number, array: Repositories[]): void
  (e: 'labelEditorLoaded', loadedPlaces: GeoJSON.FeatureCollection<GeoJSON.Point, GeoJSON.GeoJsonProperties>): void
  (e: 'unsaved-changes-detected', hasUnsavedChanges: boolean): void
}>()

function showDetails(nearestCity: MapGeoJSONFeature): void {
  const repo = nearestCity.properties.label
  if (!repo) return

  const [lat, lon] = (nearestCity.geometry as GeoJSON.Point).coordinates

  emit('repoSelected', {
    text: repo,
    lat,
    lon,
    id: nearestCity.properties.id,
    groupId: undefined,
    year: '0',
    selected: true,
    skipAnimation: false,
    html: null,
  })
}
function showLargestProjectsContextMenuItem(bg: MapGeoJSONFeature, map: MapLibreMap): { text: string; click: () => void } {
  return {
    text: 'Show largest projects',
    click: () => {
      if (!bg.id) return

      const seen = new Map<string, Repositories>()
      const largeRepositories = map
        .querySourceFeatures('points-source', {
          sourceLayer: 'points',
          filter: ['==', 'parent', bg.id],
        })
        .sort((a, b) => b.properties.size - a.properties.size)

      for (const repo of largeRepositories) {
        const label = repo.properties.label
        if (seen.has(label)) continue

        seen.set(label, {
          name: label,
          lngLat: (repo.geometry as GeoJSON.Point).coordinates.slice(0, 2) as [number, number],
          id: repo.properties.id,
          isExternal: repo.properties.isExternal,
          linkWeight: repo.properties.linkWeight,
        })

        if (seen.size >= 100) break
      }

      map.setFilter('border-highlight', ['==', ['id'], bg.id.toString()])
      map.setLayoutProperty('border-highlight', 'visibility', 'visible')
      emit('showLargestInGroup', parseInt(bg.id.toString()), Array.from(seen.values()))
    },
  }
}
function getPlacesGeoJSON() {
  return places
}
function getGroupIdAt(lat: number, lon: number) {
  return boardGameMap.getGroupIdAt(lat, lon)
}
function highlightNode(searchParameters: SearchParameters): void {
  boardGameMap.highlightNode(searchParameters)
}
function makeVisible(
  repository: string,
  location: {
    center: [number, number]
    zoom: number
  },
  disableAnimation?: boolean,
): void {
  boardGameMap.makeVisible(repository, location, disableAnimation)
}
function clearHighlights(): void {
  boardGameMap.clearHighlights()
}
function clearBorderHighlights(): void {
  boardGameMap.clearBorderHighlights()
}
function dispose(): void {
  boardGameMap.dispose()
}
const mapContainer = ref<HTMLDivElement | null>(null)
let map: MapLibreMap | null = null
let boardGameMap: BoardGameMap
let places: GeoJSON.FeatureCollection<GeoJSON.Point> | undefined

let oldLabelProps: Record<string, string> | undefined
let marker = new maplibregl.Popup({ closeButton: false })
let borderOwnerId: string | number | undefined
onMounted(() => {
  if (!mapContainer.value) return
  boardGameMap = new BoardGameMap(mapContainer.value)
  map = boardGameMap.map

  map.on('load', () => {
    boardGameMap
      .LoadMap()
      .then(() => {
        if (map) {
          ;(map.getSource('place') as GeoJSONSource).getData().then((d) => {
            const t = getPlaceLabelss(d as GeoJSON.FeatureCollection<GeoJSON.Point>)
            const loadedPlaces = t?.merged
            if (t?.isChanged) {
              emit('unsaved-changes-detected', t.isChanged)
            }
            if (!loadedPlaces) return
            emit('labelEditorLoaded', loadedPlaces)
            if (map) {
              ;(map.getSource('place') as GeoJSONSource).setData(loadedPlaces)
            }
          })
        }
        console.log('Map loaded')
      })
      .catch((e: unknown) => {
        console.error('Error loading map:', e)
      })
  })
  map.on('contextmenu', (e) => {
    const bg = boardGameMap.getBackgroundNearPoint(e.point)[0]
    let ctxMenuItems = map ? [showLargestProjectsContextMenuItem(bg, map)] : []
    ctxMenuItems = ctxMenuItems.concat(getContextMenuItems(e, bg.id))
    const nearestCity = boardGameMap.findNearestCity(e.point)
    if (nearestCity?.properties.label) {
      const name: string = nearestCity.properties.label
      ctxMenuItems.push({
        text: 'List connections of ' + name,
        click: () => {
          showDetails(nearestCity)
          boardGameMap.drawBackgroundEdges(e.point, name)
          emit('focusOnRepo', nearestCity.properties.id, parseInt(bg.id?.toString() ?? '0'), name)
        },
      })
    }

    const contextMenuItems = {
      items: ctxMenuItems,
      left: e.point.x.toString() + 'px',
      top: e.point.y.toString() + 'px',
    }

    emit('showContextMenu', contextMenuItems)
  })

  map.on('click', (e) => {
    emit('showContextMenu', undefined)
    const nearestCity = boardGameMap.findNearestCity(e.point)
    const repo = nearestCity?.properties.label
    if (!nearestCity || !repo) return

    showDetails(nearestCity)
    boardGameMap.drawBackgroundEdges(e.point, repo)
  })
})

onBeforeUnmount(() => {
  map?.remove()
})
function getContextMenuItems(e: MapMouseEvent & object, borderOwnerId: string | number | undefined): { text: string; click: () => void }[] {
  if (!map) return []
  const labelFeature = map.queryRenderedFeatures(e.point, { layers: ['place-country-1'] })
  const items = []
  if (labelFeature.length) {
    const label = labelFeature[0].properties
    const coordinates = (labelFeature[0].geometry as GeoJSON.Point).coordinates
    items.push({
      text: `Edit ${label.name as string}`,
      click: () => {
        editLabel(new LngLat(coordinates[0], coordinates[1]), label)
      },
    })
  } else {
    items.push({
      text: 'Add label',
      click: () => {
        addLabel(e.lngLat, borderOwnerId)
      },
    })
  }

  return items
}
function saveAdd(value: string): void {
  if (!map) return
  places = addLabelToPlaces(places, value, marker.getLngLat(), map.getZoom(), borderOwnerId)
  if (!places) return
  ;(map.getSource('place') as GeoJSONSource).setData(places)
  emit('unsaved-changes-detected', true)
}
function saveEdit(value: string): void {
  console.log('Saving edit', value, oldLabelProps)
  if (!map) return
  if (!oldLabelProps) return
  places = editLabelInPlaces(oldLabelProps.labelId, places, value, marker.getLngLat(), map.getZoom())
  if (!places) return
  ;(map.getSource('place') as GeoJSONSource).setData(places)
  emit('unsaved-changes-detected', true)
}
function getPlaceLabelss(d: GeoJSON.FeatureCollection<GeoJSON.Point>): {
  isChanged: boolean
  merged: GeoJSON.FeatureCollection<GeoJSON.Point>
} {
  let t = getPlaceLabels(d)
  places = t.merged
  return t
}
function addLabel(lngLat: LngLat, borerOwnerId: string | number | undefined): void {
  if (!map) return
  const markerEditor = createMarkerEditor(
    map,
    (value: string) => {
      saveAdd(value)
    },
    null,
  )
  borderOwnerId = borerOwnerId
  marker.setDOMContent(markerEditor.element)
  marker.setLngLat(lngLat)
  marker.addTo(map)

  markerEditor.setMarker(marker)
}
function editLabel(lngLat: LngLatLike, oLabelProps: Record<string, string>): void {
  if (!map) return
  const markerEditor = createMarkerEditor(
    map,
    (value: string) => {
      saveEdit(value)
    },
    oLabelProps.name,
  )
  oldLabelProps = oLabelProps
  marker.setDOMContent(markerEditor.element)
  marker.setLngLat(lngLat)
  marker.addTo(map)

  markerEditor.setMarker(marker)
}
</script>

<template>
  <div class="relative w-full h-full">
    <!-- Map -->
    <div ref="mapContainer" class="w-full h-full"></div>
    <div class="subgraph-viewer"></div>
  </div>
</template>

<style scoped>
/* Ensure map fills container */
.w-full {
  width: 100%;
}
.h-full {
  height: 100%;
}
</style>
