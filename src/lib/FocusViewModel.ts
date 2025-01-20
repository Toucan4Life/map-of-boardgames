// @ts-nocheck

import { ref } from 'vue';
import downloadGroupGraph from './downloadGroupGraph';

/**
 * This view model is used to show direct neighbors of a node. It can be extended
 * to pull second layer neighbors as well and then perform layout on them.
 */
export default class FocusViewModel {
  constructor(repositoryName, groupId) {
    this.name = repositoryName;
    this.repos = ref([]);
    this.lngLat = ref(null);
    this.loading = ref(true);
    downloadGroupGraph(groupId).then(graph => {
      this.loading.value = false;
      let neighgbors = [];
      this.lngLat.value = graph.getNode(repositoryName)?.data.l;
      graph.forEachLinkedNode(repositoryName, (node, link) => {
        neighgbors.push({
          name: node.id,
          lngLat: node.data.l,
          isExternal: !!(link.data?.e),
          id: node.data.id,
          linkWeight: link.data.weight
        });
      });
      
      neighgbors.sort((a, b) => {
       return b.linkWeight-a.linkWeight
      });

      this.repos.value = neighgbors;
    });
  }
}