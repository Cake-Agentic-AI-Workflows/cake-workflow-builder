import { describe, it, expect } from 'vitest';
import { findNearestNodeInDirection, getHandlesForDirection } from './spatialUtils';
import { Node } from '@xyflow/react';

describe('findNearestNodeInDirection', () => {
  const sourceNode: Node = {
    id: 'source',
    position: { x: 100, y: 100 },
    measured: { width: 100, height: 50 },
    data: {},
  };

  const nodeToRight: Node = {
    id: 'right-node',
    position: { x: 300, y: 100 },
    measured: { width: 100, height: 50 },
    data: {},
  };

  const nodeToLeft: Node = {
    id: 'left-node',
    position: { x: -100, y: 100 },
    measured: { width: 100, height: 50 },
    data: {},
  };

  const nodeAbove: Node = {
    id: 'above-node',
    position: { x: 100, y: -50 },
    measured: { width: 100, height: 50 },
    data: {},
  };

  const nodeBelow: Node = {
    id: 'below-node',
    position: { x: 100, y: 250 },
    measured: { width: 100, height: 50 },
    data: {},
  };

  it('finds node to the right', () => {
    const nodes = [sourceNode, nodeToRight, nodeToLeft];
    const result = findNearestNodeInDirection(sourceNode, nodes, 'right');
    expect(result?.id).toBe('right-node');
  });

  it('finds node to the left', () => {
    const nodes = [sourceNode, nodeToRight, nodeToLeft];
    const result = findNearestNodeInDirection(sourceNode, nodes, 'left');
    expect(result?.id).toBe('left-node');
  });

  it('finds node above', () => {
    const nodes = [sourceNode, nodeAbove, nodeBelow];
    const result = findNearestNodeInDirection(sourceNode, nodes, 'up');
    expect(result?.id).toBe('above-node');
  });

  it('finds node below', () => {
    const nodes = [sourceNode, nodeAbove, nodeBelow];
    const result = findNearestNodeInDirection(sourceNode, nodes, 'down');
    expect(result?.id).toBe('below-node');
  });

  it('returns null when no node in direction', () => {
    const nodes = [sourceNode, nodeToRight];
    const result = findNearestNodeInDirection(sourceNode, nodes, 'left');
    expect(result).toBeNull();
  });

  it('excludes source node from results', () => {
    const nodes = [sourceNode];
    const result = findNearestNodeInDirection(sourceNode, nodes, 'right');
    expect(result).toBeNull();
  });

  it('picks closest when multiple nodes in direction', () => {
    const closerNode: Node = {
      id: 'closer',
      position: { x: 220, y: 100 },
      measured: { width: 100, height: 50 },
      data: {},
    };
    const nodes = [sourceNode, nodeToRight, closerNode];
    const result = findNearestNodeInDirection(sourceNode, nodes, 'right');
    expect(result?.id).toBe('closer');
  });
});

describe('getHandlesForDirection', () => {
  it('returns correct handles for up direction', () => {
    const result = getHandlesForDirection('up');
    expect(result).toEqual({ sourceHandle: 'top', targetHandle: 'bottom' });
  });

  it('returns correct handles for down direction', () => {
    const result = getHandlesForDirection('down');
    expect(result).toEqual({ sourceHandle: 'bottom', targetHandle: 'top' });
  });

  it('returns correct handles for left direction', () => {
    const result = getHandlesForDirection('left');
    expect(result).toEqual({ sourceHandle: 'left', targetHandle: 'right' });
  });

  it('returns correct handles for right direction', () => {
    const result = getHandlesForDirection('right');
    expect(result).toEqual({ sourceHandle: 'right', targetHandle: 'left' });
  });
});
