<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import maplibregl, { GeoJSONSource, LngLat, Map as MapLibreMap, MapMouseEvent, type LngLatLike, type MapGeoJSONFeature } from 'maplibre-gl'
import { BoardGameMap, type SearchParameters } from '@/lib/createMap'
import type { SearchResult } from '@/lib/createFuzzySearcher'
import type { Repositories } from '@/lib/FocusViewModel'
import { getPlaceLabels, editLabel } from '@/lib/label-editor/labelsStorage'
import downloadGroupGraph from '@/lib/downloadGroupGraph'
import PopUp from './PopUp.vue'
import GraphLoadingIndicator from './GraphLoadingIndicator.vue'

defineExpose({
  clearBorderHighlights,
  dispose,
  clearHighlights,
  makeVisible,
  getGroupIdAt,
  highlightNode,
  getPlacesGeoJSON,
})

const showEditor = ref(false)
const editorPosition = ref<[number, number]>([0, 0])
const editorDefault = ref<string | null>(null)
const isLoadingGraph = ref(false)
const loadingStatus = ref<'downloading' | 'decompressing' | 'parsing' | 'serializing' | 'reconstructing'>('downloading')
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

const mapContainer = ref<HTMLDivElement | null>(null)
let map: MapLibreMap
let boardGameMap: BoardGameMap
let places: GeoJSON.FeatureCollection<GeoJSON.Point>
let oldLabelProps: string | undefined

function getPlacesGeoJSON() {
  return places
}
function getGroupIdAt(lat: number, lon: number) {
  return boardGameMap.getGroupIdAt(lat, lon)
}
function highlightNode(searchParameters: SearchParameters): Promise<SearchResult[]> {
  return boardGameMap.highlightNode(searchParameters)
}
async function fetchAndDrawGroupGraph(groupId: number, label: string, feat: MapGeoJSONFeature) {
  try {
    isLoadingGraph.value = true
    loadingStatus.value = 'downloading'

    const graph = await downloadGroupGraph(groupId, undefined, (status) => {
      loadingStatus.value = status
    })

    boardGameMap.drawBackgroundEdges(label, feat, graph)
  } catch (ex) {
    console.error(`Error: Failed to load graph for group ${groupId}`, ex)
  } finally {
    isLoadingGraph.value = false
  }
}
function makeVisible(repository: string, location: { center: [number, number]; zoom: number }, disableAnimation?: boolean): void {
  const moveMethod = disableAnimation ? 'jumpTo' : 'flyTo'
  boardGameMap.map[moveMethod](location)
  boardGameMap.map.once('moveend', async () => {
    const feat = boardGameMap.getBackgroundNearPoint(location.center)
    if (!feat.id) return
    await fetchAndDrawGroupGraph(+feat.id, repository, feat)
  })
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

onMounted(() => {
  if (!mapContainer.value) return
  boardGameMap = new BoardGameMap(mapContainer.value)
  map = boardGameMap.map

  map.on('load', async () => {
    try {
      await boardGameMap.LoadMap()
      const placeSource = map.getSource('place') as GeoJSONSource
      places = (await placeSource.getData()) as GeoJSON.FeatureCollection<GeoJSON.Point>

      const localPlaces = JSON.parse(localStorage.getItem('places') ?? '[]')
      const labelsResult = getPlaceLabels(places.features, localPlaces)
      places.features = labelsResult.merged
      if (labelsResult.isChanged) emit('unsaved-changes-detected', true)

      emit('labelEditorLoaded', places)
      placeSource.setData(places)
    } catch (error) {
      console.error('Error loading map:', error)
    }
  })

  map.on('contextmenu', (e) => {
    const bg = boardGameMap.getBackgroundNearPoint(e.point)
    if (bg.id == null) return
    const groupId = +bg.id

    const items: { text: string; click: () => void }[] = [
      {
        text: 'Show largest projects',
        click: () => {
          const seen = boardGameMap.getLargestRepositories(groupId)
          map.setFilter('border-highlight', ['==', ['id'], groupId])
          map.setLayoutProperty('border-highlight', 'visibility', 'visible')
          emit('showLargestInGroup', groupId, Array.from(seen.values()))
        },
      },
    ]

    const labelFeature = map.queryRenderedFeatures(e.point, { layers: ['place-country-1'] })[0]
    items.push({
      text: 'Set label',
      click: () => setLabel(e.lngLat, labelFeature?.properties),
    })

    const nearestCity = boardGameMap.findNearestCity(e.point)
    const cityLabel = nearestCity?.properties.label
    if (nearestCity && cityLabel) {
      items.push({
        text: `List connections of ${cityLabel}`,
        click: () => {
          focusMapOnRepo(nearestCity, e.point, cityLabel)
          emit('focusOnRepo', nearestCity.properties.id, groupId, cityLabel)
        },
      })
    }

    emit('showContextMenu', {
      items,
      left: `${e.point.x}px`,
      top: `${e.point.y}px`,
    })
  })

  map.on('click', (e) => {
    emit('showContextMenu', undefined)
    const nearestCity = boardGameMap.findNearestCity(e.point)
    const repo = nearestCity?.properties.label
    if (!nearestCity || !repo) return
    focusMapOnRepo(nearestCity, e.point, repo)
  })
})

onBeforeUnmount(() => map?.remove())

async function focusMapOnRepo(nearestCity: maplibregl.MapGeoJSONFeature, point: maplibregl.Point & Object, name: string) {
  const repo = nearestCity.properties.label
  if (!repo) return
  const [lon, lat] = (nearestCity.geometry as GeoJSON.Point).coordinates
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

  const bgFeature = boardGameMap.getBackgroundNearPoint(point)
  if (bgFeature.id == undefined) return
  await fetchAndDrawGroupGraph(+bgFeature.id, name, bgFeature)
}

function setLabel(lngLat: LngLat, props?: Record<string, string>): void {
  editorPosition.value = [lngLat.lng, lngLat.lat]
  editorDefault.value = props?.name ?? null
  oldLabelProps = props?.labelId
  showEditor.value = true
}

function handleSave(value: string, lnglat: LngLat) {
  places.features = editLabel(value, lnglat, places.features, oldLabelProps, map.getZoom())
  localStorage.setItem('places', JSON.stringify(places.features))
  ;(map.getSource('place') as GeoJSONSource).setData(places)
  emit('unsaved-changes-detected', true)
  showEditor.value = false
  oldLabelProps = undefined
}
</script>

<template>
  <div class="relative w-full h-full">
    <GraphLoadingIndicator v-if="isLoadingGraph" :status="loadingStatus" />
    <PopUp
      v-if="showEditor && map"
      :map="map"
      :lngLat="editorPosition"
      :defaultText="editorDefault"
      :onSave="handleSave"
      @closed="showEditor = false"
    />
    <div ref="mapContainer" class="w-full h-full"></div>
    <div class="subgraph-viewer"></div>
  </div>
</template>

<style scoped>
.w-full {
  width: 100%;
}
.h-full {
  height: 100%;
}
</style>
