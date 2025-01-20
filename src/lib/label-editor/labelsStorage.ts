import config from '../config'
import generateShortRandomId from '../generateShortRandomId';
import bus from '../bus';
import { LngLat } from 'maplibre-gl';

let originalPlaces: { features: any[]; };
let indexedPlaces = new Map();
interface Place {
  type: string;
  geometry: {
    type: string;
    coordinates: number[];
  };
  properties: {
    symbolzoom: number;
    name: string;
    labelId: string;
  };
};
export async function getPlaceLabels() {
  let r = await fetch(config.placesSource, { mode: 'cors' })
  originalPlaces = await r.json();
  originalPlaces.features.forEach(f => {
    indexedPlaces.set(f.properties.labelId, f);
  });

  const mergedLabels = mergePlacesWithLocalStorage(originalPlaces);
  if (mergedLabels == undefined) return
  const hasChanges = checkOriginalPlacesForChanges(mergedLabels);
  if (hasChanges) bus.fire('unsaved-changes-detected', hasChanges);
  return mergedLabels;
}

function savePlaceLabels(places: { type: string; features: Array<Place>; } | undefined) {
  localStorage.setItem('places', JSON.stringify(places));
}

export function addLabelToPlaces(places: { type: string; features: Array<Place>; } | undefined, value: string, lngLat: LngLat, mapZoomLevel: number, borderOwnerId: string | number | undefined) {
  let labelId = generateShortRandomId();
  while (indexedPlaces.has(labelId)) labelId = generateShortRandomId();

  const label = {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [lngLat.lng, lngLat.lat].map(x => Math.round(x * 1000) / 1000) },
    properties: { symbolzoom: Math.ceil(mapZoomLevel), name: value, labelId }
  };
  if (borderOwnerId !== undefined) {
    label.properties.ownerId = borderOwnerId;
  }
  if (places) places.features.push(label);

  indexedPlaces.set(labelId, label);
  savePlaceLabels(places);
  return places;
}

export function editLabelInPlaces(labelId: any, places: { type: string; features: Array<Place>; } | undefined, value: any, lngLat: LngLat, mapZoomLevel: number) {
  if (!places) return
  if (!value) {
    places.features = places.features.filter(f => f.properties.labelId !== labelId);
    indexedPlaces.delete(labelId);
  } else {
    const labelToModify = places.features.find(f => f.properties.labelId === labelId);
    if (!labelToModify) return
    labelToModify.properties.name = value;
    labelToModify.properties.symbolzoom = Math.ceil(mapZoomLevel)
    labelToModify.geometry.coordinates = [lngLat.lng, lngLat.lat].map(x => Math.round(x * 1000) / 1000);
    indexedPlaces.set(labelId, labelToModify);
  }

  savePlaceLabels(places);
  return places;
}

function mergePlacesWithLocalStorage() {
  let savedPlaces = { type: "FeatureCollection", features: [] }
  
  const places = localStorage.getItem('places');
  if (places) savedPlaces = JSON.parse(places)

  let mergeIndex = new Map();
  for (const savedPlace of savedPlaces.features) {
    const placeKey = savedPlace.properties.labelId;
    const place = mergeIndex.get(placeKey);
    if (place) {
      // local override:
      mergeIndex.set(placeKey, Object.assign({}, place, savedPlace));
    } else {
      // local only:
      mergeIndex.set(placeKey, savedPlace);
    }
  }

  indexedPlaces.forEach((place, placeKey) => {
    if (!mergeIndex.has(placeKey)) {
      // remote only:
      mergeIndex.set(placeKey, place);
    }
  });


  return {
    type: "FeatureCollection",
    features: Array.from(mergeIndex.values())
  };
}

function checkOriginalPlacesForChanges(mergedPlaces: { type: string; features: Array<Place>; } | undefined) {
  if (!originalPlaces) return false;
  if (!mergedPlaces) return false;

  for (const resolvedPlace of mergedPlaces.features) {
    const placeKey = resolvedPlace.properties.labelId;
    const place = indexedPlaces.get(placeKey);
    if (!place) return true;
    if (place.properties.name !== resolvedPlace.properties.name) return true;
    if (place.properties.symbolzoom !== resolvedPlace.properties.symbolzoom) return true;
    if (place.geometry.coordinates[0] !== resolvedPlace.geometry.coordinates[0]) return true;
    if (place.geometry.coordinates[1] !== resolvedPlace.geometry.coordinates[1]) return true;
  }

  return false;
}