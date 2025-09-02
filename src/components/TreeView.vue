<script setup lang="ts">
import type { BoardGameNodeData } from '@/lib/fetchAndProcessGraph'
import { ref } from 'vue'

export interface TreeItem {
  node: BoardGameNodeData
  children?: TreeItem[]
  linkWeight?: number
}

const props = defineProps<{
  tree: TreeItem
}>()

const emit = defineEmits<{
  (e: 'nodeSelected', node: BoardGameNodeData, event: MouseEvent): void
}>()

/**
 * Create a unique key for each node based on its ID and parent path
 */
function getNodeKey(nodeId: string | undefined, parentPath = ''): string {
  return `${parentPath}_${nodeId !== undefined ? nodeId.toString() : ''}`
}

const expandedNodes = ref<Set<string>>(new Set())

function selectNode(node: BoardGameNodeData, event: MouseEvent) {
  emit('nodeSelected', node, event)
}

function toggleExpand(nodeId: string | undefined, parentPath = '') {
  const nodeKey = getNodeKey(nodeId, parentPath)
  if (expandedNodes.value.has(nodeKey)) {
    expandedNodes.value.delete(nodeKey)
  } else {
    expandedNodes.value.add(nodeKey)
  }
}

function isExpanded(nodeId: string | undefined, parentPath = ''): boolean {
  const nodeKey = getNodeKey(nodeId, parentPath)
  return expandedNodes.value.has(nodeKey)
}
</script>

<template>
  <div class="tree-view">
    <ul>
      <!-- Root node only shown if it has no children or as a special case -->
      <li v-if="!tree.children || tree.children.length === 0">
        <div class="node-item">
          <a href="#" @click.prevent="selectNode(tree.node, $event)">{{ tree.node.label }}</a>
          <span v-if="tree.node.isExternal" title="External country">E</span>
        </div>
      </li>

      <!-- Otherwise, only show the children with toggle controls -->
      <template v-else>
        <li v-for="child in tree.children" :key="child.node.label">
          <div class="node-item">
            <span v-if="child.children && child.children.length" class="toggle" @click="toggleExpand(child.node.label, tree.node.label)">
              {{ isExpanded(child.node.label, tree.node.label) ? '▼' : '▶' }}
            </span>
            <span v-else class="toggle-placeholder"></span>
            <a href="#" @click.prevent="selectNode(child.node, $event)">{{ child.node.label }}</a>
            <span v-if="child.node.isExternal" title="External country">E</span>
          </div>
          <ul v-if="isExpanded(child.node.label, tree.node.label) && child.children && child.children.length > 0">
            <li v-for="grandChild in child.children" :key="grandChild.node.label">
              <div class="node-item">
                <span class="toggle-placeholder"></span>
                <a href="#" @click.prevent="selectNode(grandChild.node, $event)">{{ grandChild.node.label }}</a>
                <span v-if="grandChild.node.isExternal" title="External country">E</span>
              </div>
            </li>
          </ul>
        </li>
      </template>
    </ul>
  </div>
</template>

<style scoped>
.tree-view {
  margin-top: 8px;
}
.tree-view ul {
  list-style: none;
  padding: 0;
}
.tree-view ul ul {
  padding-left: 20px;
}
.node-item {
  padding: 4px 0;
}
.node-item a {
  text-decoration: none;
  color: inherit;
}
.node-item a:hover {
  text-decoration: underline;
}
.toggle {
  display: inline-block;
  width: 16px;
  cursor: pointer;
  user-select: none;
  font-size: 0.8em;
}
.toggle-placeholder {
  display: inline-block;
  width: 16px;
}
</style>
