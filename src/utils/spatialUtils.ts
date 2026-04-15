import { Node } from '@xyflow/react';
import { Direction } from '@/types/workflow';

interface NodeCenter {
  x: number;
  y: number;
}

function getNodeCenter(node: Node): NodeCenter {
  const width = node.measured?.width ?? 100;
  const height = node.measured?.height ?? 50;
  return {
    x: node.position.x + width / 2,
    y: node.position.y + height / 2,
  };
}

function getNodeBounds(node: Node) {
  const width = node.measured?.width ?? 100;
  const height = node.measured?.height ?? 50;
  return {
    left: node.position.x,
    right: node.position.x + width,
    top: node.position.y,
    bottom: node.position.y + height,
  };
}

function isInDirection(source: Node, target: Node, direction: Direction): boolean {
  const sourceBounds = getNodeBounds(source);
  const targetBounds = getNodeBounds(target);

  switch (direction) {
    case 'right':
      return targetBounds.left > sourceBounds.right;
    case 'left':
      return targetBounds.right < sourceBounds.left;
    case 'up':
      return targetBounds.bottom < sourceBounds.top;
    case 'down':
      return targetBounds.top > sourceBounds.bottom;
  }
}

function getDistance(a: NodeCenter, b: NodeCenter): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function findNearestNodeInDirection(
  sourceNode: Node,
  allNodes: Node[],
  direction: Direction
): Node | null {
  const sourceCenter = getNodeCenter(sourceNode);

  const candidates = allNodes.filter(
    (node) => node.id !== sourceNode.id && isInDirection(sourceNode, node, direction)
  );

  if (candidates.length === 0) {
    return null;
  }

  let nearest = candidates[0];
  let nearestDistance = getDistance(sourceCenter, getNodeCenter(nearest));

  for (let i = 1; i < candidates.length; i++) {
    const distance = getDistance(sourceCenter, getNodeCenter(candidates[i]));
    if (distance < nearestDistance) {
      nearest = candidates[i];
      nearestDistance = distance;
    }
  }

  return nearest;
}

export function getHandlesForDirection(direction: Direction): {
  sourceHandle: string;
  targetHandle: string;
} {
  switch (direction) {
    case 'up':
      return { sourceHandle: 'top', targetHandle: 'bottom' };
    case 'down':
      return { sourceHandle: 'bottom', targetHandle: 'top' };
    case 'left':
      return { sourceHandle: 'left', targetHandle: 'right' };
    case 'right':
      return { sourceHandle: 'right', targetHandle: 'left' };
  }
}

export function getSpawnPosition(
  sourceNode: Node,
  direction: Direction,
  offset: number = 150
): { x: number; y: number } {
  const width = sourceNode.measured?.width ?? 100;
  const height = sourceNode.measured?.height ?? 50;

  switch (direction) {
    case 'up':
      return { x: sourceNode.position.x, y: sourceNode.position.y - offset - height };
    case 'down':
      return { x: sourceNode.position.x, y: sourceNode.position.y + height + offset };
    case 'left':
      return { x: sourceNode.position.x - offset - width, y: sourceNode.position.y };
    case 'right':
      return { x: sourceNode.position.x + width + offset, y: sourceNode.position.y };
  }
}
