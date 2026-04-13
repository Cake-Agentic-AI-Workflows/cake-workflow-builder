// Graph utilities for workflow analysis

interface NodeLike {
  id: string;
}

interface EdgeLike {
  id: string;
  source: string;
  target: string;
}

/**
 * Find all loop (back) edges in the workflow graph using DFS.
 * A back edge is one that creates a cycle - it goes from a node back to
 * an ancestor in the DFS traversal tree.
 *
 * @param nodes - Array of nodes with at least an `id` property
 * @param edges - Array of edges with `id`, `source`, and `target` properties
 * @returns Set of edge IDs that are loop edges
 */
export function findLoopEdges<N extends NodeLike, E extends EdgeLike>(
  nodes: N[],
  edges: E[]
): Set<string> {
  const loopEdgeIds = new Set<string>();

  // Build adjacency list: nodeId -> [{target, edgeId}]
  const adjacency = new Map<string, { target: string; edgeId: string }[]>();
  nodes.forEach((n) => adjacency.set(n.id, []));
  edges.forEach((e) => {
    adjacency.get(e.source)?.push({ target: e.target, edgeId: e.id });
  });

  // DFS to find back edges
  const visited = new Set<string>();
  const inStack = new Set<string>(); // Nodes currently in the DFS path (ancestors)

  function dfs(nodeId: string) {
    visited.add(nodeId);
    inStack.add(nodeId);

    for (const { target, edgeId } of adjacency.get(nodeId) || []) {
      if (inStack.has(target)) {
        // Back edge: target is an ancestor in current DFS path = cycle = loop
        loopEdgeIds.add(edgeId);
      } else if (!visited.has(target)) {
        dfs(target);
      }
    }

    inStack.delete(nodeId);
  }

  // Start DFS from 'start' node
  if (adjacency.has('start')) {
    dfs('start');
  }

  return loopEdgeIds;
}
