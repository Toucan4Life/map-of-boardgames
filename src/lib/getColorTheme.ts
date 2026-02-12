const explorer = {
  background: '#0d1117', // Dark neutral gray (GitHub dark theme)

  circleColor: '#EAEDEF',
  circleStrokeColor: '#000',
  circleLabelsColor: '#FFF',
  circleLabelsHaloColor: '#111',
  circleLabelsHaloWidth: 0,

  placeLabelsColor: '#FFF',
  placeLabelsHaloColor: '#000',
  placeLabelsHaloWidth: 0.2,
  color: [
    // Four distinct muted colors for regions (four color theorem)
    { input: '#516ebc', output: '#3D4E6F' }, // Muted blue-slate
    { input: '#00529c', output: '#3D5E5E' }, // Muted teal
    { input: '#153477', output: '#5E4A45' }, // Muted brown-red
    { input: '#37009c', output: '#4E5C42' }, // Muted olive-green
  ],
}

export default function getColorTheme() {
  return explorer
}
