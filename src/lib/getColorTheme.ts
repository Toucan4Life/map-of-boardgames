const explorer = {
  background: '#030E2E',

  circleColor: '#EAEDEF',
  circleStrokeColor: '#000',
  circleLabelsColor: '#FFF',
  circleLabelsHaloColor: '#111',
  circleLabelsHaloWidth: 0,

  placeLabelsColor: '#FFF',
  placeLabelsHaloColor: '#000',
  placeLabelsHaloWidth: 0.2,
  color: [
    { input: '#516ebc', output: '#013185' }, // '#AAD8E6'},
    { input: '#00529c', output: '#1373A9' }, // '#2B7499'},
    { input: '#153477', output: '#05447C' }, // '#56A9CE'},
    { input: '#37009c', output: '#013161' }, // '#2692C6'},
    { input: '#00789c', output: '#022D6D' }, // '#1CA0E3'},
    { input: '#37549c', output: '#00154D' }, // '#00396D'},
    { input: '#9c4b00', output: '#00154D' }, // '#00396D'}
  ],
}

export default function getColorTheme() {
  return explorer
}
