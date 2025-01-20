import { Map, Popup } from "maplibre-gl";
export default function createDOMarkerEditor(map: Map, onSave: { (value: string): void }, defaultText: string | null) {
  const element = document.createElement('div');
  element.className = 'label-marker';
  element.innerHTML = `<form class="mini-label">
  <input type="text" placeholder="Label" />
  <div class='commands'>
    <a href='#' class="cancel" tabindex="3">Cancel</a>
    <a href='#' class="accept">Save</a>
  </div>
  </div>`;

  if (defaultText) {
    const input = element.querySelector('input');
    if (input) input.value = defaultText
  };

  let marker: Popup;
  let startX = 0;
  let startY = 0;
  let dx = 0, dy = 0;

  listenToEvents();

  return {
    element,
    setMarker: (newMarker: Popup) => { marker = newMarker; },
  }

  function submit(e: Event) {
    e.preventDefault();
    const input = element.querySelector('input');
    if (input) onSave(input.value);
    close();
  }

  function listenToEvents() {
    document.addEventListener('keydown', onKeyDown);
    element.querySelector('form')?.addEventListener('submit', submit);
    element.querySelector('.cancel')?.addEventListener('click', (e) => {
      e.preventDefault();
      close();
    });

    element.querySelector('.accept')?.addEventListener('click', (e) => {
      submit(e);
    });

    element.addEventListener('pointerdown', (e) => {
      startX = e.clientX; startY = e.clientY;
      let markerCoordinates = map.project(marker.getLngLat());
      dx = markerCoordinates.x - startX;
      dy = markerCoordinates.y - startY;
      window.addEventListener('pointermove', onPointerMove, true);
      window.addEventListener('pointerup', cleanUp, true);
    });
  }

  function onPointerMove(e : PointerEvent) {
    const newLngLat = map.unproject([e.clientX + dx, e.clientY + dy]);
    marker.setLngLat(newLngLat);
  }

  function cleanUp() {
    document.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('pointermove', onPointerMove, true);
    window.removeEventListener('pointerup', cleanUp, true);
  }

  function close() {
    marker.remove();
    cleanUp();
  }

  function onKeyDown(e : KeyboardEvent) {
    if (e.key === 'Escape') {
      close();
      e.preventDefault();
    }
  }
}