/**
 * GeometryCore — Deterministic Euclidean Arithmetic & Analytical Operations
 * R2-06: Construction DAG & Lineage
 * 
 * Pure mathematical functions for Euclidean geometry: intersections,
 * parallel/perpendicular lines, distances, and angle bisectors.
 */

import { Point } from '../../types/geometry';

export interface LineEquation {
  // Line in standard form: A*x + B*y + C = 0 with normalized normal (A^2 + B^2 = 1)
  readonly a: number;
  readonly b: number;
  readonly c: number;
}

export class GeometryCore {
  /**
   * Euclidean distance between two points.
   */
  static distance(p1: Point, p2: Point): number {
    return Math.hypot(p2.x - p1.x, p2.y - p1.y);
  }

  /**
   * Midpoint between two points.
   */
  static midpoint(p1: Point, p2: Point, id: string = 'mid'): Point {
    return {
      id,
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2
    };
  }

  /**
   * Converts two points to normalized line equation Ax + By + C = 0.
   */
  static lineFromPoints(p1: Point, p2: Point): LineEquation {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-12) {
      throw new Error("Cannot define a line from two coincident points.");
    }
    const a = -dy / len;
    const b = dx / len;
    const c = -(a * p1.x + b * p1.y);
    return { a, b, c };
  }

  /**
   * Computes intersection of two lines. Returns null if lines are parallel.
   */
  static lineIntersection(l1: LineEquation, l2: LineEquation, id: string = 'inter'): Point | null {
    const det = l1.a * l2.b - l1.b * l2.a;
    if (Math.abs(det) < 1e-11) {
      return null; // Parallel or coincident
    }
    const x = (l1.b * l2.c - l2.b * l1.c) / det;
    const y = (l2.a * l1.c - l1.a * l2.c) / det;
    return { id, x, y };
  }

  /**
   * Intersection of two line segments (p1-p2 and q1-q2).
   */
  static segmentIntersection(p1: Point, p2: Point, q1: Point, q2: Point, id: string = 'P'): Point | null {
    const l1 = GeometryCore.lineFromPoints(p1, p2);
    const l2 = GeometryCore.lineFromPoints(q1, q2);
    const pt = GeometryCore.lineIntersection(l1, l2, id);
    if (!pt) return null;

    // Check if point lies within segment bounding boxes
    const eps = 1e-6;
    const onSeg1 =
      pt.x >= Math.min(p1.x, p2.x) - eps &&
      pt.x <= Math.max(p1.x, p2.x) + eps &&
      pt.y >= Math.min(p1.y, p2.y) - eps &&
      pt.y <= Math.max(p1.y, p2.y) + eps;

    const onSeg2 =
      pt.x >= Math.min(q1.x, q2.x) - eps &&
      pt.x <= Math.max(q1.x, q2.x) + eps &&
      pt.y >= Math.min(q1.y, q2.y) - eps &&
      pt.y <= Math.max(q1.y, q2.y) + eps;

    return onSeg1 && onSeg2 ? pt : null;
  }

  /**
   * Line passing through target point parallel to reference segment.
   */
  static parallelLine(p1: Point, p2: Point, through: Point): LineEquation {
    const refLine = GeometryCore.lineFromPoints(p1, p2);
    const c = -(refLine.a * through.x + refLine.b * through.y);
    return { a: refLine.a, b: refLine.b, c };
  }

  /**
   * Line passing through target point perpendicular to reference segment.
   */
  static perpendicularLine(p1: Point, p2: Point, through: Point): LineEquation {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-12) {
      throw new Error("Reference segment points are coincident.");
    }
    // Normal to perpendicular line is along direction of reference segment
    const a = dx / len;
    const b = dy / len;
    const c = -(a * through.x + b * through.y);
    return { a, b, c };
  }

  /**
   * Angle bisector ray passing through vertex V between arms V->P1 and V->P2.
   */
  static angleBisector(p1: Point, vertex: Point, p2: Point): { angleRad: number; dirX: number; dirY: number } {
    const a1 = Math.atan2(p1.y - vertex.y, p1.x - vertex.x);
    const a2 = Math.atan2(p2.y - vertex.y, p2.x - vertex.x);
    let diff = a2 - a1;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;

    const bisectorAngle = a1 + diff / 2;
    return {
      angleRad: bisectorAngle,
      dirX: Math.cos(bisectorAngle),
      dirY: Math.sin(bisectorAngle)
    };
  }

  /**
   * Computes signed area of any polygon using the Shoelace formula.
   * Positive for CCW, negative for CW.
   */
  static calculateSignedArea(vertices: readonly Point[]): number {
    let shoelaceSum = 0;
    for (let i = 0; i < vertices.length; i++) {
      const current = vertices[i];
      const next = vertices[(i + 1) % vertices.length];
      shoelaceSum += current.x * next.y - next.x * current.y;
    }
    return 0.5 * shoelaceSum;
  }

  /**
   * Computes area of a circle with a given radius: S = π * R²
   */
  static calculateCircleArea(radius: number): number {
    if (radius < 0) {
      throw new Error("Circle radius cannot be negative.");
    }
    return Math.PI * radius * radius;
  }

  /**
   * Computes fill ratio: objectArea / referenceArea
   */
  static calculateFillRatio(objectArea: number, referenceArea: number): number {
    if (referenceArea <= 0) {
      throw new Error("Reference area must be strictly positive to compute ratio.");
    }
    return objectArea / referenceArea;
  }
}
