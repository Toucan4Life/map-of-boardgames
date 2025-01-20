import { ref } from 'vue';
import downloadGroupGraph from './downloadGroupGraph';
import { Link, Node } from 'ngraph.graph';

/**
 * This view model is used to show direct neighbors of a node. It can be extended
 * to pull second layer neighbors as well and then perform layout on them.
 */
export default class FocusViewModel {
  name: string;
  repos: any;
  lngLat: any;
  loading: any;
  constructor(repositoryName: string, groupId: string | number) {
    this.name = repositoryName;
    this.repos = ref([]);
    this.lngLat = ref(null);
    this.loading = ref(true);
    downloadGroupGraph(groupId).then(graph => {
      this.loading.value = false;
      let neighgbors: { name: any; lngLat: any; isExternal: boolean; id: any; linkWeight: any; }[] = [];
      this.lngLat.value = graph.getNode(repositoryName)?.data.l;
      graph.forEachLinkedNode(repositoryName, (node: Node, link: Link) => {
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