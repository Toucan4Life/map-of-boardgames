import maplibregl, { GeoJSONSource, LngLat, type LngLatLike, Map, MapMouseEvent } from 'maplibre-gl'
import { getPlaceLabels, addLabelToPlaces, editLabelInPlaces } from './labelsStorage'
import createMarkerEditor from './createDOMMarkerEditor'
import bus from '../bus'

export class LabelEditor {
  places: GeoJSON.FeatureCollection<GeoJSON.Point, GeoJSON.GeoJsonProperties> | undefined
  map: Map
  oldLabelProps: { [name: string]: string } | undefined
  placeLabelLayers = ['place-country-1']
  marker = new maplibregl.Popup({ closeButton: false })
  borderOwnerId: string | number | undefined
  constructor(map: maplibregl.Map) {
    this.map = map
    getPlaceLabels().then((loadedPlaces) => {
      if (!loadedPlaces) return
      ;(map.getSource('place') as GeoJSONSource)?.setData(loadedPlaces)
      this.places = loadedPlaces
    })
  }
  getContextMenuItems(e: MapMouseEvent & object, borderOwnerId: string | number | undefined): { text: string; click: () => void }[] {
    const labelFeature = this.map.queryRenderedFeatures(e.point, { layers: this.placeLabelLayers })
    const items = []
    if (labelFeature.length) {
      const label = labelFeature[0].properties
      const coordinates = (labelFeature[0].geometry as GeoJSON.Point).coordinates
      items.push({
        text: `Edit ${label.name}`,
        click: () => this.editLabel(new LngLat(coordinates[0], coordinates[1]), label),
      })
    } else {
      items.push({
        text: 'Add label',
        click: () => this.addLabel(e.lngLat, borderOwnerId),
      })
    }

    return items
  }

  addLabel(lngLat: LngLat, borderOwnerId: string | number | undefined): void {
    const markerEditor = createMarkerEditor(this.map, (value) => this.saveAdd(value), null)
    this.borderOwnerId = borderOwnerId
    this.marker.setDOMContent(markerEditor.element)
    this.marker.setLngLat(lngLat)
    this.marker.addTo(this.map)

    markerEditor.setMarker(this.marker)
  }
  saveAdd(value: string): void {
    this.places = addLabelToPlaces(this.places, value, this.marker.getLngLat(), this.map.getZoom(), this.borderOwnerId)
    if (!this.places) return
    ;(this.map.getSource('place') as GeoJSONSource)?.setData(this.places)
    bus.fire('unsaved-changes-detected', true)
  }

  editLabel(lngLat: LngLatLike, oldLabelProps: { [name: string]: string }): void {
    const markerEditor = createMarkerEditor(this.map, (value) => this.saveEdit(value), oldLabelProps.name)
    this.oldLabelProps = oldLabelProps
    this.marker.setDOMContent(markerEditor.element)
    this.marker.setLngLat(lngLat)
    this.marker.addTo(this.map)

    markerEditor.setMarker(this.marker)
  }

  saveEdit(value: string): void {
    if (!this.oldLabelProps) return
    this.places = editLabelInPlaces(this.oldLabelProps?.labelId, this.places, value, this.marker.getLngLat(), this.map.getZoom())
    if (!this.places) return
    ;(this.map.getSource('place') as GeoJSONSource)?.setData(this.places)
    bus.fire('unsaved-changes-detected', true)
  }
}
