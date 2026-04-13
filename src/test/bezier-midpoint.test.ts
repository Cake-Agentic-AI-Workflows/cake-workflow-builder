import { describe, it, expect } from 'vitest';

/**
 * Calculates the actual midpoint of a quadratic bezier curve at t=0.5
 *
 * A quadratic bezier curve is defined by:
 * B(t) = (1-t)²·P0 + 2(1-t)t·P1 + t²·P2
 *
 * At t=0.5:
 * B(0.5) = 0.25·P0 + 0.5·P1 + 0.25·P2
 */
export function getQuadraticBezierMidpoint(
  sourceX: number,
  sourceY: number,
  controlX: number,
  controlY: number,
  targetX: number,
  targetY: number
): { x: number; y: number } {
  return {
    x: 0.25 * sourceX + 0.5 * controlX + 0.25 * targetX,
    y: 0.25 * sourceY + 0.5 * controlY + 0.25 * targetY,
  };
}

describe('Bezier Curve Midpoint Calculation', () => {
  it('should return control point when control is at geometric midpoint (straight line)', () => {
    // When the control point is at the geometric midpoint, the curve is a straight line
    // and the bezier midpoint equals the control point
    const sourceX = 0, sourceY = 0;
    const targetX = 100, targetY = 100;
    const controlX = 50, controlY = 50; // Geometric midpoint

    const midpoint = getQuadraticBezierMidpoint(
      sourceX, sourceY,
      controlX, controlY,
      targetX, targetY
    );

    // For straight line: 0.25*0 + 0.5*50 + 0.25*100 = 0 + 25 + 25 = 50
    expect(midpoint.x).toBe(50);
    expect(midpoint.y).toBe(50);
  });

  it('should return point closer to source/target than control point when curve is bent', () => {
    // When the control point is offset, the curve midpoint is NOT at the control point
    const sourceX = 0, sourceY = 0;
    const targetX = 100, targetY = 0;
    const controlX = 50, controlY = 100; // Control point pulled up

    const midpoint = getQuadraticBezierMidpoint(
      sourceX, sourceY,
      controlX, controlY,
      targetX, targetY
    );

    // x: 0.25*0 + 0.5*50 + 0.25*100 = 0 + 25 + 25 = 50
    expect(midpoint.x).toBe(50);
    // y: 0.25*0 + 0.5*100 + 0.25*0 = 0 + 50 + 0 = 50
    // The curve midpoint is at y=50, NOT y=100 (the control point)
    expect(midpoint.y).toBe(50);

    // This is the key insight: the control point is at y=100,
    // but the curve midpoint is at y=50 (half the distance)
    expect(midpoint.y).not.toBe(controlY);
  });

  it('should calculate correct midpoint for real-world edge scenario', () => {
    // Simulating an edge from (100, 100) to (300, 300) with offset
    const sourceX = 100, sourceY = 100;
    const targetX = 300, targetY = 300;

    // Geometric midpoint
    const geoMidX = (sourceX + targetX) / 2; // 200
    const geoMidY = (sourceY + targetY) / 2; // 200

    // User drags the control point 50px up and right
    const offsetX = 50;
    const offsetY = -50;
    const controlX = geoMidX + offsetX; // 250
    const controlY = geoMidY + offsetY; // 150

    const midpoint = getQuadraticBezierMidpoint(
      sourceX, sourceY,
      controlX, controlY,
      targetX, targetY
    );

    // The actual curve midpoint:
    // x: 0.25*100 + 0.5*250 + 0.25*300 = 25 + 125 + 75 = 225
    // y: 0.25*100 + 0.5*150 + 0.25*300 = 25 + 75 + 75 = 175
    expect(midpoint.x).toBe(225);
    expect(midpoint.y).toBe(175);

    // NOT at the control point (250, 150)
    expect(midpoint.x).not.toBe(controlX);
    expect(midpoint.y).not.toBe(controlY);
  });

  it('should demonstrate the bug: dot at control point vs actual curve midpoint', () => {
    // This test demonstrates the current bug where the dot is placed at
    // the control point instead of the actual curve midpoint

    const sourceX = 0, sourceY = 0;
    const targetX = 200, targetY = 0;

    // User drags to offset the curve by 100px
    const offsetY = 100;
    const geoMidX = (sourceX + targetX) / 2; // 100
    const geoMidY = (sourceY + targetY) / 2; // 0

    const controlX = geoMidX; // 100
    const controlY = geoMidY + offsetY; // 100 (where dot is currently placed - BUG)

    const actualMidpoint = getQuadraticBezierMidpoint(
      sourceX, sourceY,
      controlX, controlY,
      targetX, targetY
    );

    // The actual curve midpoint is at y=50, not y=100
    // y: 0.25*0 + 0.5*100 + 0.25*0 = 50
    expect(actualMidpoint.y).toBe(50);

    // The bug: dot is placed at controlY (100), but should be at 50
    // This means when user drags 100px, the dot moves 100px but the curve
    // only moves 50px at its midpoint - hence "dot moves faster than curve"
    expect(actualMidpoint.y).toBe(controlY / 2); // Curve midpoint is half the control offset
  });
});
