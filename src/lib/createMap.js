import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl from "maplibre-gl";
import bus from "./bus";
import config from "./config";
import { getCustomLayer } from "./gl/createLinesCollection.js";
import downloadGroupGraph from "./downloadGroupGraph.js";
import getComplimentaryColor from "./getComplimentaryColor";
import createLabelEditor from "./label-editor/createLabelEditor";
import { createRadialGradient } from './gl/createRadialGradient';

const primaryHighlightColor = "#bf2072";
const secondaryHighlightColor = "#e56aaa";
const original = {
  background: '#101010',

  circleColor: "#fff",
  circleStrokeColor: "#000",
  circleLabelsColor: "#FFF",
  circleLabelsHaloColor: "#111",
  circleLabelsHaloWidth: 0,

  placeLabelsColor: "#FFF",
  placeLabelsHaloColor: "#000",
  placeLabelsHaloWidth: 1,

  color: [
    { input: '#516ebc', output: '#516ebc' },
    { input: '#00529c', output: '#00529c' },
    { input: '#153477', output: '#153477' },
    { input: '#37009c', output: '#37009c' },
    { input: '#00789c', output: '#00789c' },
    { input: '#37549c', output: '#37549c' },
  ]
};

const explorer = {
  // background: "#0C2446",
  // circleColor: "#0C2446",
  // circleStrokeColor: "#000",
  // circleLabelsColor: "#fff",
  // circleLabelsHaloColor: "#0C2446",
  // circleLabelsHaloWidth: 1,

  // placeLabelsColor: "#222",
  // placeLabelsHaloColor: "#fff",
  // placeLabelsHaloWidth: 1,

  background: '#030E2E',

  circleColor: "#EAEDEF",
  circleStrokeColor: "#000",
  circleLabelsColor: "#FFF",
  circleLabelsHaloColor: "#111",
  circleLabelsHaloWidth: 0,

  placeLabelsColor: "#FFF",
  placeLabelsHaloColor: "#000",
  placeLabelsHaloWidth: 0.2,
  color: [
    { input: '#516ebc', output: '#013185' }, // '#AAD8E6'},
    { input: '#00529c', output: '#1373A9' }, // '#2B7499'},
    { input: '#153477', output: '#05447C' }, // '#56A9CE'},
    { input: '#37009c', output: '#013161' }, // '#2692C6'},
    { input: '#00789c', output: '#022D6D' }, // '#1CA0E3'},
    { input: '#37549c', output: '#00154D' }, // '#00396D'},
    { input: '#9c4b00', output: '#00154D' }, // '#00396D'}
  ]
}

const currentColorTheme = explorer;

const colorStyle = ["case"]
currentColorTheme.color.forEach((row) => {
  colorStyle.push(["==", ["get", "fill"], row.input], row.output);
})
colorStyle.push("#FF0000");

export default function createMap() {
  const map = new maplibregl.Map(getDefaultStyle());
  map.dragRotate.disable();
  map.touchZoomRotate.disableRotation();
  const fastLinesLayer = getCustomLayer();
  let backgroundEdgesFetch;
  let labelEditor;
  // collection of labels.

  map.on("load", () => {
    map.loadImage(config.iconSource + '/circle.png', (error, image) => {
      if (error) throw error;
      map.addImage('circle-icon', image, { 'sdf': true });
    })
    map.loadImage(config.iconSource + '/diamond.png', (error, image) => {
      if (error) throw error;
      map.addImage('diamond-icon', image, { 'sdf': true });
    })
    map.loadImage(config.iconSource + '/triangle.png', (error, image) => {
      if (error) throw error;
      map.addImage('triangle-icon', image, { 'sdf': true });
    })
    map.loadImage(config.iconSource + '/star.png', (error, image) => {
      if (error) throw error;
      map.addImage('star-icon', image, { 'sdf': true });
    })
    map.addLayer(fastLinesLayer, "circle-layer");
    // map.addLayer(createRadialGradient(), "polygon-layer");
    labelEditor = createLabelEditor(map);
  });

  map.on("contextmenu", (e) => {
    bus.fire("show-tooltip");

    let bg = getBackgroundNearPoint(e.point);
    if (!bg) return;

    const contextMenuItems = {
      items: labelEditor.getContextMenuItems(e, bg.id),
      left: e.point.x + "px",
      top: e.point.y + "px"
    };

    contextMenuItems.items.push(showLargestProjectsContextMenuItem(bg));

    const nearestCity = findNearestCity(e.point);
    if (nearestCity) {
      let name = nearestCity.properties.label;
      let parts = name.split('/')
      const displayName = parts[parts.length - 1] || name;

      contextMenuItems.items.push({
        text: "List connections of " + displayName,
        click: () => {
          showDetails(nearestCity);
          drawBackgroundEdges(e.point, name);
          bus.fire('focus-on-repo', name, bg.id);
        }
      });
    }

    bus.fire("show-context-menu", contextMenuItems);
  });

  map.on("mousemove", (e) => {
    // let hoveredFeature = findNearestCity(e.point);
    // if (hoveredFeature) {
    //   const bgFeature = getBackgroundNearPoint(e.point);
    //   bus.fire("show-tooltip", { 
    //     text: hoveredFeature.properties.label, 
    //     left: e.point.x + "px",
    //     top: e.point.y + "px",
    //     background: bgFeature?.properties?.fill || "rgba(0,0,0,0.5)",
    //   });
    // } else {
    //   bus.fire("show-tooltip");
    // }
  });

  map.on("click", (e) => {
    // console.log("Clicked")
    bus.fire("show-context-menu");
    const nearestCity = findNearestCity(e.point);
    // console.log("Nearest city :" + JSON.stringify(nearestCity))
    if (!nearestCity) return;
    const repo = nearestCity.properties.label
    if (!repo) return;
    showDetails(nearestCity);

    const includeExternal = e.originalEvent.altKey;
    drawBackgroundEdges(e.point, repo, !includeExternal);
  });
  const bordersCollection = fetch(config.bordersSource).then((res) => res.json());

  return {
    map,
    dispose() {
      map.remove();
      // TODO: Remove custom layer?
    },
    makeVisible,
    clearHighlights,
    clearBorderHighlights,
    getPlacesGeoJSON,
    getGroupIdAt,
    highlightNode
  }

  function highlightNode(searchParameters) {
    let highlightedNodes = {
      type: "FeatureCollection",
      features: []
    };

    const selectedFilters = ["all",
      [">=", ["to-number", ["get", 'complexity']], searchParameters.minWeight],
      ["<=", ["to-number", ["get", 'complexity']], searchParameters.maxWeight],
      [">=", ["to-number", ["get", 'ratings']], searchParameters.minRating],
      ["<=", ["to-number", ["get", 'ratings']], searchParameters.maxRating],
      [">=", ["to-number", ["get", 'min_time']], searchParameters.minPlaytime],
      ["<=", ["to-number", ["get", 'max_time']], searchParameters.maxPlaytime]
    ];
    if (searchParameters.playerChoice == 0) {
      selectedFilters.push([">=", ["to-number", ["get", 'min_players']], searchParameters.minPlayers])
      selectedFilters.push(["<=", ["to-number", ["get", 'max_players']], searchParameters.maxPlayers])
    } else if(searchParameters.playerChoice == 1) {
      selectedFilters.push([">=", ["to-number", ["get", 'min_players_rec']], searchParameters.minPlayers])
      selectedFilters.push(["<=", ["to-number", ["get", 'max_players_rec']], searchParameters.maxPlayers])
    }
    else{
      selectedFilters.push([">=", ["to-number", ["get", 'min_players_best']], searchParameters.minPlayers])
      selectedFilters.push(["<=", ["to-number", ["get", 'max_players_best']], searchParameters.maxPlayers])
    }
    // console.log(JSON.stringify(selectedFilters))
    map.querySourceFeatures("points-source", {
      sourceLayer: "points",
      filter: selectedFilters
    }).forEach(repo => {
      highlightedNodes.features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: repo.geometry.coordinates },
        properties: { color: primaryHighlightColor, name: repo.properties.label, background: "#ff0000", textSize: 1.2 }
      });
    });
    // console.log("nodes : " + JSON.stringify(highlightedNodes))
    map.getSource("selected-nodes").setData(highlightedNodes);
    map.redraw();
  }

  function getGroupIdAt(lat, lon) {
    // find first group that contains the point.
    return bordersCollection.then((collection) => {
      const feature = collection.features.find((f) => {
        return polygonContainsPoint(f.geometry.coordinates[0], lat, lon);
      });
      if (!feature) return;
      const id = feature.id;
      return id;
    });

    // const res = map.querySourceFeatures('borders-source').find((f) => {
    //   return polygonContainsPoint(f.geometry.coordinates[0], lat, lon);
    // });
    // return res?.id;
  }

  function showDetails(nearestCity) {
    const repo = nearestCity.properties.label
    // console.log("showing details for :" + repo)
    if (!repo) return;
    const [lat, lon] = nearestCity.geometry.coordinates
    //console.log(nearestCity)
    bus.fire("show-tooltip");
    bus.fire("repo-selected", { text: repo, lat, lon, id: nearestCity.properties.id });
  }

  function showLargestProjectsContextMenuItem(bg) {
    return {
      text: "Show largest projects",
      click: () => {
        let seen = new Map();
        let largeRepositories = map.querySourceFeatures("points-source", {
          sourceLayer: "points",
          filter: ["==", "parent", bg.id]
        }).sort((a, b) => {
          return b.properties.size - a.properties.size;
        })
        // console.log(bg.id)
        // console.log(largeRepositories)
        for (let repo of largeRepositories) {
          let v = {
            name: repo.properties.label,
            lngLat: repo.geometry.coordinates,
            id: repo.properties.id
          }
          if (seen.has(repo.properties.label)) continue;
          seen.set(repo.properties.label, v);
          if (seen.size >= 100) break;
        }

        map.setFilter("border-highlight", ["==", ["id"], bg.id]);
        map.setLayoutProperty("border-highlight", "visibility", "visible");

        // todo: fire a view model here instead of the list.
        bus.fire("show-largest-in-group", bg.id, Array.from(seen.values()));
      }
    }
  }

  function getPlacesGeoJSON() {
    return labelEditor.getPlaces();
  }

  function clearBorderHighlights() {
    map.setLayoutProperty("border-highlight", "visibility", "none");
  }

  function clearHighlights() {
    fastLinesLayer.clear();
    map.getSource("selected-nodes").setData({
      type: "FeatureCollection",
      features: []
    });
    map.redraw();
  }

  function makeVisible(repository, location, disableAnimation = false) {
    if (disableAnimation) {
      map.jumpTo(location);
    } else {
      map.flyTo(location)
    }
    map.once("moveend", () => {
      drawBackgroundEdges(location.center, repository);
    });
  }

  function getBackgroundNearPoint(point) {
    const borderFeature = map.queryRenderedFeatures(point, { layers: ["polygon-layer"] });
    return borderFeature[0];
  }

  function drawBackgroundEdges(point, repo, ignoreExternal = true) {
    // console.log("In drawBackgroundEdges")
    const bgFeature = getBackgroundNearPoint(point);
    // console.log("bgFeature :" + JSON.stringify(bgFeature))
    if (!bgFeature) return;
    const groupId = bgFeature.id;
    //console.log("groupId :" + JSON.stringify(groupId))
    if (groupId === undefined) return;

    const fillColor = getPolygonFillColor(bgFeature.properties);
    let complimentaryColor = getComplimentaryColor(fillColor);
    fastLinesLayer.clear();
    backgroundEdgesFetch?.cancel();
    let isCancelled = false;
    let highlightedNodes = {
      type: "FeatureCollection",
      features: []
    };

    backgroundEdgesFetch = downloadGroupGraph(groupId).then(groupGraph => {
      if (isCancelled) return;
      let firstLevelLinks = [];
      let primaryNodePosition;
      let renderedNodesAdjustment = new Map();
      map.querySourceFeatures("points-source", {
        sourceLayer: "points",
        filter: ["==", "parent", groupId]
      }).forEach(repo => {
        const lngLat = repo.geometry.coordinates;
        renderedNodesAdjustment.set(repo.properties.label, {
          lngLat
        });
      });
      //  console.log('Repo : '+ JSON.stringify(repo))
      //  console.log('Point : '+ JSON.stringify(point))

      groupGraph.forEachLink(link => {
        if (link.data?.e && ignoreExternal) return; // external;
        // console.log(link)
        const fromGeo = renderedNodesAdjustment.get(link.fromId)?.lngLat || groupGraph.getNode(link.fromId).data.l;
        const toGeo = renderedNodesAdjustment.get(link.toId)?.lngLat || groupGraph.getNode(link.toId).data.l;

        const from = maplibregl.MercatorCoordinate.fromLngLat(fromGeo);
        const to = maplibregl.MercatorCoordinate.fromLngLat(toGeo);
        const isFirstLevel = repo === link.fromId || repo === link.toId;
        const line = {
          from: [from.x, from.y],
          to: [to.x, to.y],
          color: isFirstLevel ? 0xffffffFF : complimentaryColor
        }
        // delay first level links to be drawn last, so that they are on the top
        if (isFirstLevel) {
          firstLevelLinks.push(line);

          if (!primaryNodePosition) {
            primaryNodePosition = repo === link.fromId ? fromGeo : toGeo;
            highlightedNodes.features.push({
              type: "Feature",
              geometry: { type: "Point", coordinates: primaryNodePosition },
              properties: { color: primaryHighlightColor, name: repo, background: fillColor, textSize: 1.2 }
            });
          }
          let otherName = repo === link.fromId ? link.toId : link.fromId;
          // pick the other one too:
          highlightedNodes.features.push({
            type: "Feature",
            geometry: { type: "Point", coordinates: repo === link.fromId ? toGeo : fromGeo },
            properties: { color: secondaryHighlightColor, name: otherName, background: fillColor, textSize: 0.8 }
          });
        } else fastLinesLayer.addLine(line);
      });
      firstLevelLinks.forEach(line => {
        fastLinesLayer.addLine(line)
      });
      // console.log("Node to highlight : " + JSON.stringify(highlightedNodes))
      map.getSource("selected-nodes").setData(highlightedNodes);
      map.redraw();
    });
    backgroundEdgesFetch.cancel = () => { isCancelled = true };
  }

  function findNearestCity(point) {
    let width = 16;
    let height = 16;
    const features = map.queryRenderedFeatures([
      [point.x - width / 2, point.y - height / 2],
      [point.x + width / 2, point.y + height / 2]
    ], { layers: ["circle-layer"] });
    if (!features.length) return;
    let distance = Infinity;
    let nearestCity = null;
    features.forEach(feature => {
      let geometry = feature.geometry.coordinates;
      let dx = geometry[0] - point.x;
      let dy = geometry[1] - point.y;
      let d = dx * dx + dy * dy;
      if (d < distance) {
        distance = d;
        nearestCity = feature;
      }
    });
    return nearestCity;
  }
}

function getDefaultStyle() {
  return {
    hash: true,
    container: "map",
    center: [0, 0],
    zoom: 2,
    style: {
      version: 8,
      glyphs: config.glyphsSource,
      sources: {
        "borders-source": { type: "geojson", data: config.bordersSource, },
        "points-source": {
          type: "vector",
          tiles: [config.vectorTilesTiles],
          minzoom: 0,
          maxzoom: 2,
          center: [-9.843750, 4.213679, 2],
          bounds: [-54.781000, -47.422000, 54.781000, 47.422000]
        },
        "place": { // this one loaded asynchronously, and merged with local storage data
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: []
          }
        },
        "selected-nodes": {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: []
          }
        }
      },
      layers: [
        {
          "id": "background",
          "type": "background",
          "paint": {
            "background-color": currentColorTheme.background
          }
        },
        {
          "id": "polygon-layer",
          "type": "fill",
          "source": "borders-source",
          "filter": ["==", "$type", "Polygon"],
          "paint": {
            "fill-color": ["get", "fill"]
          }
        },
        {
          "id": "border-highlight",
          "type": "line",
          "source": "borders-source",
          "layout": {
            "visibility": "none"
          },
          "paint": {
            "line-color": "#FFF",
            "line-width": 4,
          }
        },
        // {
        //   "id": "circle-layer",
        //   "type": "circle",
        //   "source": "points-source",
        //   "source-layer": "points",
        //   "filter": ["==", "$type", "Point"],
        //   "paint": {
        //     "circle-color": [
        //       "case",
        //       [">=", ["to-number", ["get", 'complexity']], 4],
        //       "#9a0202",
        //       [">=", ["to-number", ["get", 'complexity']], 3],
        //       "#ffe612",
        //       [">=", ["to-number", ["get", 'complexity']], 2],
        //       "#28ff12",
        //       "#12ffe2"
        //     ],
        //     "circle-opacity": [
        //       "interpolate",
        //       ["linear"],
        //       ["zoom"],
        //       5, 0.1,
        //       15, 0.9
        //     ],
        //     "circle-stroke-color": currentColorTheme.circleStrokeColor,
        //     "circle-stroke-width": 1,
        //     "circle-stroke-opacity": [
        //       "interpolate",
        //       ["linear"],
        //       ["zoom"],
        //       8, 0.0,
        //       15, 0.9
        //     ],
        //     "circle-radius": [
        //       "interpolate",
        //       ["linear"],
        //       ["zoom"],
        //       5, ["*", ["get", "size"], .1],
        //       23, ["*", ["get", "size"], 1.5],
        //     ]
        //   }
        // },
        {
          "id": "circle-layer",
          "type": "symbol",
          "source": "points-source",
          "source-layer": "points",
          "filter": ["==", "$type", "Point"],
          "icon-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            5, 0.1,
            15, 0.9
          ],
          'layout': {
            'icon-image': [
              "case",
              [">=", ["to-number", ["get", 'complexity']], 4],
              "star-icon",
              [">=", ["to-number", ["get", 'complexity']], 3],
              "diamond-icon",
              [">=", ["to-number", ["get", 'complexity']], 2],
              "triangle-icon",
              "circle-icon"
            ],
            'icon-size':
              [
                "interpolate",
                ["linear"],
                ["zoom"],
                5, ["+",["*", ["to-number",["get", "size"]], .0000025],0.20],
                23, ["+",["*", ["to-number",["get", "size"]], 0.000037],0.20],
              ],
          },
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          "paint": {
            // "icon-color": [
            //   "case",
            //   [">=", ["to-number", ["get", 'ratings']], 7.77],
            //   "#00ff00",
            //   [">=", ["to-number", ["get", 'ratings']], 7.46],
            //   "#0fff00",
            //   [">=", ["to-number", ["get", 'ratings']], 7.2],
            //   "#4bff00",
            //   [">=", ["to-number", ["get", 'ratings']], 7.03],
            //   "#87ff00",
            //   [">=", ["to-number", ["get", 'ratings']], 6.9],
            //   "#c3ff00",
            //   [">=", ["to-number", ["get", 'ratings']], 6.76],
            //   "#ffff00",
            //   [">=", ["to-number", ["get", 'ratings']], 6.6],
            //   "#fff000",
            //   [">=", ["to-number", ["get", 'ratings']], 6.4],
            //   "#ffb400",
            //   [">=", ["to-number", ["get", 'ratings']], 6.1],
            //   "#ff7800",
            //   "#ff3c00"
            // ],
            "icon-color": [
              "case",
              [">=", ["to-number", ["get", 'ratings']], 7.77],
              "#00e9ff",
              [">=", ["to-number", ["get", 'ratings']], 7.46],
              "#00f8d8",
              [">=", ["to-number", ["get", 'ratings']], 7.2],
              "#00ff83",
              [">=", ["to-number", ["get", 'ratings']], 7.03],
              "#62f25e",
              [">=", ["to-number", ["get", 'ratings']], 6.9],
              "#87e539",
              [">=", ["to-number", ["get", 'ratings']], 6.76],
              "#a2d600",
              [">=", ["to-number", ["get", 'ratings']], 6.6],
              "#c3b700",
              [">=", ["to-number", ["get", 'ratings']], 6.4],
              "#de9200",
              [">=", ["to-number", ["get", 'ratings']], 6.1],
              "#f36300",
              "#ff0000"
            ],
            // "icon-opacity": [
            //   "interpolate",
            //   ["linear"],
            //   ["zoom"],
            //   5, 0.1,
            //   15, 0.9
            // ]
          }
        },
        {
          "id": "label-layer",
          "type": "symbol",
          "source": "points-source",
          "source-layer": "points",
          "filter": [">=", ["zoom"], 8],
          "layout": {
            "text-allow-overlap": true,
            "text-ignore-placement": true,
            "text-font": ["Roboto Condensed Regular"],
            "text-field": ["get", "label"],
            "text-anchor": "top",
            "text-max-width": 10,
            "symbol-sort-key": ["-", 0, ["get", "size"]],
            "symbol-spacing": 500,
            "text-offset": [0, 0.5],
            "text-size": [
              "interpolate",
              ["linear"],
              ["zoom"],
              6, ["/", ["get", "size"], 20],
              20, ["+", ["get", "size"], 20]
            ],
          },
          "paint": {
            "text-color": currentColorTheme.circleLabelsColor,
            "text-halo-color": currentColorTheme.circleLabelsHaloColor,
            "text-halo-width": currentColorTheme.circleLabelsHaloWidth,
          },
        },
        {
          "id": "selected-nodes-layer",
          "type": "circle",
          "source": "selected-nodes",
          "paint": {
            "circle-color": ["get", "color"],
          }
        },
        {
          "id": "selected-nodes-labels-layer",
          "type": "symbol",
          "source": "selected-nodes",
          "layout": {
            "text-font": ["Roboto Condensed Regular"],
            "text-field": ["get", "name"],
            "text-anchor": "top",
            "text-max-width": 10,
            "symbol-sort-key": ["-", 0, ["get", "textSize"]],
            "symbol-spacing": 500,
            "text-offset": [0, 0.5],
            "text-size": [
              "interpolate",
              ["linear"],
              ["zoom"],
              8, ["/", ["get", "size"], 4],
              10, ["+", ["get", "size"], 8]
            ],
          },
          "paint": {
            "text-color": "#fff",
            "text-halo-color": ["get", "color"],
            "text-halo-width": 2,
          },
        },
        // TODO: move labels stuff to label editor?
        {
          "id": "place-country-1",
          // minzoom: 1, 
          "maxzoom": 10,
          "type": "symbol",
          "source": "place",
          "layout": {
            "text-font": ["Roboto Condensed Bold"],
            "text-size": [
              "interpolate",
              ["cubic-bezier", 0.2, 0, 0.7, 1],
              ["zoom"],
              1, [
                "step",
                ["get", "symbolzoom"], 15,
                4, 13,
                5, 12
              ],
              9, [
                "step",
                ["get", "symbolzoom"], 22,
                4, 19,
                5, 17
              ]
            ],
            "symbol-sort-key": ["get", "symbolzoom"],
            "text-field": "{name}",
            "text-max-width": 6,
            "text-line-height": 1.1,
            "text-letter-spacing": 0,
          },
          "paint": {
            "text-color": currentColorTheme.placeLabelsColor,
            "text-halo-color": currentColorTheme.placeLabelsHaloColor,
            "text-halo-width": currentColorTheme.placeLabelsHaloWidth,
          },
          "filter": [
            "<=",
            ["get", "symbolzoom"],
            ["+", ["zoom"], 4]
          ],
        },
      ]
    },
  };
}

function getPolygonFillColor(polygonProperties) {
  for (const color of currentColorTheme.color) {
    if (color.input === polygonProperties.fill) {
      return color.output;
    }
  }
  return polygonProperties.fill;
}
function polygonContainsPoint(ring, pX, pY) {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const p1 = ring[i];
    const p2 = ring[j];
    if (((p1[1] > pY) !== (p2[1] > pY)) && (pX < (p2[0] - p1[0]) * (pY - p1[1]) / (p2[1] - p1[1]) + p1[0])) {
      c = !c;
    }
  }
  return c;
}
