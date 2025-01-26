import maplibregl, { GeoJSONSource, LngLat, LngLatLike, Map, MapMouseEvent } from 'maplibre-gl';
import {getPlaceLabels,  addLabelToPlaces, editLabelInPlaces} from './labelsStorage';
import createMarkerEditor from './createDOMMarkerEditor';
import bus from '../bus';

export default function createLabelEditor(map : Map) {
  let places: GeoJSON.FeatureCollection<GeoJSON.Point,GeoJSON.GeoJsonProperties> | undefined;
  const placeLabelLayers = ['place-country-1'];

  getPlaceLabels().then(loadedPlaces => {
    if(!loadedPlaces) return;
    (map.getSource('place')as GeoJSONSource)?.setData(loadedPlaces)
    places = loadedPlaces;
  });

  return {
    getContextMenuItems,
    getPlaces: () => places
  }

  function getContextMenuItems(e:MapMouseEvent & object, borderOwnerId: string | number | undefined) {
    const labelFeature = map.queryRenderedFeatures(e.point, { layers: placeLabelLayers });
    const items = []
    if (labelFeature.length) {
      const label = labelFeature[0].properties;
      const coordinates = (labelFeature[0].geometry as GeoJSON.Point).coordinates;
      items.push({
        text: `Edit ${label.name}`,
        click: () => editLabel(new LngLat(coordinates[0],coordinates[1]), label)
      });
    } else {
      items.push({
        text: 'Add label',
        click: () => addLabel(e.lngLat, borderOwnerId)
      });
    }

    return items;
  }

  function addLabel(lngLat: LngLat, borderOwnerId:string | number | undefined) {
    const markerEditor = createMarkerEditor(map, save, null);

    const marker = new maplibregl.Popup({closeButton: false});
    marker.setDOMContent(markerEditor.element);
    marker.setLngLat(lngLat);
    marker.addTo(map);

    markerEditor.setMarker(marker);

    function save(value: string) {
      places = addLabelToPlaces(places, value, marker.getLngLat(), map.getZoom(), borderOwnerId);
      if(!places) return;
      (map.getSource('place') as GeoJSONSource)?.setData(places);
      bus.fire('unsaved-changes-detected', true);
    }
  }

  function editLabel(lngLat: LngLatLike, oldLabelProps: {[name: string]: any}) {
    const markerEditor = createMarkerEditor(map, save, oldLabelProps.name);

    const marker = new maplibregl.Popup({closeButton: false});
    marker.setDOMContent(markerEditor.element);
    marker.setLngLat(lngLat);
    marker.addTo(map);

    markerEditor.setMarker(marker);

    function save(value: string) {
      places = editLabelInPlaces(oldLabelProps.labelId, places, value, marker.getLngLat(), map.getZoom());
      if(!places) return;
      (map.getSource('place')as GeoJSONSource)?.setData(places);
      bus.fire('unsaved-changes-detected', true);
    }
  }
}