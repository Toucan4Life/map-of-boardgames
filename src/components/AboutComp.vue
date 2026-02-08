<script setup lang="ts">
const emit = defineEmits<{ close: [] }>()

function close(): void {
  emit('close')
}
</script>
<template>
  <div>
    <div class="row">
      <h2>Map of Boardgames</h2>
      <!-- Icon copyright (c) 2013-2017 Cole Bemis: https://github.com/feathericons/feather/blob/master/LICENSE -->
      <a href="#" class="close-btn" @click.prevent="close">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="feather feather-x-circle"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
      </a>
    </div>
    <div class="container">
      <p>
        <!-- <img src="../../public/apple-touch-icon.png" alt="GitHub Map" class="map-image"> -->
        Each dot is a boardgame. Two dots within the same cluster are connected if multiple users frequently reviewed both games. The size of the dot
        indicates the number of reviews the game has received, the shape indicate the complexity and the color indicate the user's ratings. The name
        of the clusters were guessed one by one based on the properties of the game in the cluster. They could be non-representative.
      </p>
      <p>Only games with over 10 ratings were taken into account</p>
      <p>The map has <b>40590</b> games, clustered into <b>55</b> countries.</p>
      <p>The code for this project can be found <a href=" https://github.com/Toucan4Life/map-of-boardgames" class="normal">here</a></p>

      <div class="row-horizontal">
        <h2>Legend</h2>
        <p>The colors are related to the user ratings. Each color is associated with 10% of the boardgames:</p>
        <ul class="legend">
          <li><span style="background-color: #ff0000"></span> &lt;5.08</li>
          <li><span style="background-color: #f36300"></span> &lt;=5.57</li>
          <li><span style="background-color: #de9200"></span> &lt;=5.90</li>
          <li><span style="background-color: #c3b700"></span> &lt;=6.18</li>
          <li><span style="background-color: #a2d600"></span> &lt;=6.42</li>
          <li><span style="background-color: #87e539"></span> &lt;=6.66</li>
          <li><span style="background-color: #62f25e"></span> &lt;=6.92</li>
          <li><span style="background-color: #00ff83"></span> &lt;=7.20</li>
          <li><span style="background-color: #00f8d8"></span> &lt;=7.61</li>
          <li><span style="background-color: #00e9ff"></span> &gt;7.61</li>
        </ul>
      </div>

      <div class="row-horizontal">
        <p>The shape are related to the bgg complexity of the game:</p>

        <ul class="legend">
          <li><img src="../../public/circle.png" style="width: 40px; height: auto" alt="circle" class="map-image" /> &lt;=2</li>
          <li><img src="../../public/triangle.png" style="width: 40px; height: auto" alt="triangle" class="map-image" /> &lt;=3</li>
          <li><img src="../../public/diamond.png" style="width: 40px; height: auto" alt="diamond" class="map-image" /> &lt;=4</li>
          <li><img src="../../public/star.png" style="width: 40px; height: auto" alt="star" class="map-image" /> &gt;4</li>
        </ul>
      </div>

      <div class="row-horizontal">
        <p>
          The link color represent the strength of the relationship between 2 boardgames. Strong relationships will be orange, weaker ones will be
          purple
        </p>
      </div>

      <h2>Credits</h2>
      <p>A huge thanks to <b>Anvaka</b> which inspired me to do this project and did the tools that enabled me to come this far.</p>

      <p>
        <b>Toucan4Life / Onixou</b>
      </p>
    </div>
  </div>
</template>

<style scoped>
/* basic positioning */

.legend {
  list-style: none;
  margin-right: -10px;
}

.legend li {
  float: left;
  margin-right: 10px;
}

.legend span {
  border: 1px solid #ccc;
  float: left;
  width: 12px;
  height: 12px;
  margin: 2px;
}

.row-horizontal {
  flex-direction: column;
  display: flex;
  justify-content: space-between;
}
.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.row h2 {
  margin: 8px 8px 0 8px;
  flex: 1;
}

.map-image {
  width: 64px;
  float: left;
}

.close-btn {
  align-self: stretch;
  align-items: center;
  display: flex;
  padding: 0 8px;
}

.container {
  padding: 8px;
  flex: 1;
  overflow-y: auto;
}

h4 {
  margin: 0;
  font-weight: normal;
  text-align: right;
}

.byline {
  margin: 0 8px 8px;
  font-size: 12px;
}

.user-info {
  margin: 8px;
}

p {
  margin: 0 0 8px 0;
  line-height: 1.5em;
}

b {
  font-weight: bold;
}
</style>
