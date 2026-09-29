/**
 * CQNS-001: Cyclic Chord Engine (Analytical Layer — Package 01: Zebra)
 *
 * Implements Chord–Arc Parametric Indexing on cyclic quadrilaterals:
 * - REFERENCE_CIRCLE_VALID
 * - VERTEX_ORDER_VALID
 * - ORIENTATION_VALID
 * - ARC_CLOSURE_VALID
 *
 * Consumes pure formulas and mathematical constants from geometryFoundation.
 * Single Source of Truth for cyclic chord calculations.
 *
 * STRICTLY NON-AUTHORITATIVE: Pure arithmetic and normalization support helper.
 * Zero state mutations, zero RelationGraph writes, zero epistemic status assignment.
 */

import {
  calculateChordLength,
  RADIUS_TO_APOTHEM_RATIO,
  SQUARE_TO_CIRCLE_AREA_RATIO,
} from '../constants/geometryFoundation';
import { Point } from '../types/geometry';
import { GeometryCore } from './geometryCore';
import { VerificationLayer } from './verificationLayer';

export type ZebraNormalizationStatus = 'VALID' | 'NORMALIZATION_UNAVAILABLE' | 'DEGENERATE';
export type ZebraOrientation = 'CW' | 'CCW';

export interface ArcInterval {
  fromVertexId: string;
  toVertexId: string;
  subtendedAngleRad: number;
  chordLength: number;
}

export interface ZebraNormalizedResult {
  status: ZebraNormalizationStatus;
  reason?: string;
  referenceCircle?: {
    center: Point;
    radius: number;
  };
  vertexOrder?: Point[];
  orientation?: ZebraOrientation;
  normalizedAngles?: { vertexId: string; angleRad: number }[];
  arcIntervals?: ArcInterval[];
  totalArcAngleRad?: number;
}

export interface InscribedSquareMetrics {
  radius: number;
  side: number;
  apothem: number;
  squareArea: number;
  circleArea: number;
  areaRatio: number;
  radiusToApothemRatio: number;
}

export interface ReferenceCircleInput {
  center: Point;
  radius: number;
}

export class CyclicChordEngine {
  public static readonly DEFAULT_DIST_EPSILON = VerificationLayer.EPSILON_DIST; // 1.0 px
  public static readonly DEFAULT_ANGLE_EPSILON = 1e-4; // radians (~0.0057 deg)
  public static readonly CLOSURE_EPSILON = 1e-5; // radians (~0.00057 deg)

  // =========================================================================
  // FOUNDATION DELEGATIONS (Package 00 Single Source of Truth)
  // =========================================================================

  /**
   * Calculate chord length from central subtended angle theta (in radians) and radius R.
   * Exclusively delegates to single source of truth in geometryFoundation.
   */
  static chordFromAngle(thetaRad: number, radius: number): number {
    return calculateChordLength(thetaRad, radius);
  }

  /**
   * Calculate analytical chord length between two points along circle perimeter.
   * Computes subtended central angle and delegates to calculateChordLength.
   */
  static chordBetweenPoints(p1: Point, p2: Point, center: Point, radius: number): number {
    const angle1 = GeometryCore.normalizedPolarAngle(p1, center);
    const angle2 = GeometryCore.normalizedPolarAngle(p2, center);

    let dTheta = Math.abs(angle2 - angle1);
    if (dTheta > Math.PI) {
      dTheta = 2 * Math.PI - dTheta;
    }

    return calculateChordLength(dTheta, radius);
  }

  /**
   * Calculate geometric invariants for square inscribed in circle of given radius.
   * Uses scale-independent foundation constants RADIUS_TO_APOTHEM_RATIO and SQUARE_TO_CIRCLE_AREA_RATIO.
   */
  static inscribedSquareMetrics(radius: number): InscribedSquareMetrics {
    if (!Number.isFinite(radius) || radius <= 0) {
      throw new RangeError(
        `inscribedSquareMetrics: radius must be a finite positive number, received ${radius}`
      );
    }

    const side = calculateChordLength(Math.PI / 2, radius);
    const apothem = radius / RADIUS_TO_APOTHEM_RATIO;
    const squareArea = side * side;
    const circleArea = Math.PI * radius * radius;
    const areaRatio = squareArea / circleArea;

    return {
      radius,
      side,
      apothem,
      squareArea,
      circleArea,
      areaRatio,
      radiusToApothemRatio: RADIUS_TO_APOTHEM_RATIO,
    };
  }

  // =========================================================================
  // PACKAGE 01 (ZEBRA): PARAMETRIC CHORD-ARC NORMALIZATION & VALIDATION
  // =========================================================================

  /**
   * 1. REFERENCE_CIRCLE_VALID
   * Validates:
   * - Circle exists, radius is finite and strictly positive.
   * - Center has finite coordinates.
   * - Exactly 4 vertices provided.
   * - Every vertex lies on the circle within epsilon tolerance: |dist(P, O) - R| <= epsilon.
   *
   * Note: NEVER synthesizes or invents an artificial reference circle.
   */
  static isReferenceCircleValid(
    circle: ReferenceCircleInput | null | undefined,
    vertices: Point[],
    epsilon: number = CyclicChordEngine.DEFAULT_DIST_EPSILON
  ): { valid: boolean; reason?: string } {
    if (!circle) {
      return { valid: false, reason: 'REFERENCE_CIRCLE_MISSING: Reference circle was not provided' };
    }

    if (!Number.isFinite(circle.radius) || circle.radius <= 0) {
      return {
        valid: false,
        reason: `REFERENCE_CIRCLE_INVALID_RADIUS: Circle radius must be positive finite, got ${circle.radius}`,
      };
    }

    if (
      !circle.center ||
      !Number.isFinite(circle.center.x) ||
      !Number.isFinite(circle.center.y)
    ) {
      return { valid: false, reason: 'REFERENCE_CIRCLE_INVALID_CENTER: Circle center coordinates are invalid' };
    }

    if (!vertices || vertices.length !== 4) {
      return {
        valid: false,
        reason: `REFERENCE_CIRCLE_VERTEX_COUNT: Expected exactly 4 vertices for cyclic quadrilateral, got ${vertices ? vertices.length : 0}`,
      };
    }

    for (let i = 0; i < vertices.length; i++) {
      const pt = vertices[i];
      if (!pt || !Number.isFinite(pt.x) || !Number.isFinite(pt.y)) {
        return {
          valid: false,
          reason: `REFERENCE_CIRCLE_INVALID_VERTEX: Vertex at index ${i} has invalid coordinates`,
        };
      }
      const deviation = GeometryCore.radialDeviation(pt, circle.center, circle.radius);
      if (deviation > epsilon) {
        return {
          valid: false,
          reason: `REFERENCE_CIRCLE_CONCYCLICITY_FAILED: Vertex ${pt.id || i} deviates by ${deviation.toFixed(3)}px (limit: ${epsilon}px)`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * 2. VERTEX_ORDER_VALID
   * Validates:
   * - All 4 vertices are distinct (no duplicate points or coincident coordinates within distEpsilon).
   * - No two vertices share identical or almost identical polar angles within angleEpsilon.
   * - Declared vertex sequence [V0, V1, V2, V3] forms an unambiguous cyclic traversal around the circle
   *   (i.e., non-self-intersecting circular order, either CCW or CW, with proper wrap-around).
   */
  static isVertexOrderValid(
    vertices: Point[],
    center: Point,
    distEpsilon: number = 0.5,
    angleEpsilon: number = CyclicChordEngine.DEFAULT_ANGLE_EPSILON
  ): {
    valid: boolean;
    status: ZebraNormalizationStatus;
    reason?: string;
    angles?: { vertexId: string; angleRad: number }[];
  } {
    if (!vertices || vertices.length !== 4) {
      return {
        valid: false,
        status: 'NORMALIZATION_UNAVAILABLE',
        reason: 'VERTEX_ORDER_INVALID: Quadrilateral requires exactly 4 vertices',
      };
    }

    // Check for duplicate vertex IDs or coincident geometric coordinates
    for (let i = 0; i < 4; i++) {
      for (let j = i + 1; j < 4; j++) {
        if (vertices[i].id && vertices[j].id && vertices[i].id === vertices[j].id) {
          return {
            valid: false,
            status: 'DEGENERATE',
            reason: `VERTEX_ORDER_DUPLICATE: Vertices share identical ID '${vertices[i].id}'`,
          };
        }
        const d = GeometryCore.distance(vertices[i], vertices[j]);
        if (d < distEpsilon) {
          return {
            valid: false,
            status: 'DEGENERATE',
            reason: `VERTEX_ORDER_COINCIDENT: Vertices ${vertices[i].id} and ${vertices[j].id} coincide (${d.toFixed(3)}px apart)`,
          };
        }
      }
    }

    // Compute polar angles for each vertex
    const angles = vertices.map((v) => ({
      vertexId: v.id,
      angleRad: GeometryCore.normalizedPolarAngle(v, center),
    }));

    // Check for repeating angular positions
    for (let i = 0; i < 4; i++) {
      for (let j = i + 1; j < 4; j++) {
        let diff = Math.abs(angles[i].angleRad - angles[j].angleRad);
        if (diff > Math.PI) {
          diff = 2 * Math.PI - diff;
        }
        if (diff < angleEpsilon) {
          return {
            valid: false,
            status: 'DEGENERATE',
            reason: `VERTEX_ORDER_ANGULAR_COLLAPSE: Vertices ${vertices[i].id} and ${vertices[j].id} have identical polar angles`,
          };
        }
      }
    }

    // Verify that the declared 4-sequence forms a valid circular order (either CCW or CW)
    // Check CCW forward arc lengths
    const dThetaCCW: number[] = [];
    for (let i = 0; i < 4; i++) {
      const aCurrent = angles[i].angleRad;
      const aNext = angles[(i + 1) % 4].angleRad;
      let d = (aNext - aCurrent) % (2 * Math.PI);
      if (d < 0) d += 2 * Math.PI;
      dThetaCCW.push(d);
    }
    const sumCCW = dThetaCCW.reduce((sum, val) => sum + val, 0);
    const isConsistentCCW =
      Math.abs(sumCCW - 2 * Math.PI) < 1e-4 && dThetaCCW.every((d) => d > angleEpsilon && d < 2 * Math.PI - angleEpsilon);

    // Check CW forward arc lengths
    const dThetaCW: number[] = [];
    for (let i = 0; i < 4; i++) {
      const aCurrent = angles[i].angleRad;
      const aNext = angles[(i + 1) % 4].angleRad;
      let d = (aCurrent - aNext) % (2 * Math.PI);
      if (d < 0) d += 2 * Math.PI;
      dThetaCW.push(d);
    }
    const sumCW = dThetaCW.reduce((sum, val) => sum + val, 0);
    const isConsistentCW =
      Math.abs(sumCW - 2 * Math.PI) < 1e-4 && dThetaCW.every((d) => d > angleEpsilon && d < 2 * Math.PI - angleEpsilon);

    if (!isConsistentCCW && !isConsistentCW) {
      return {
        valid: false,
        status: 'NORMALIZATION_UNAVAILABLE',
        reason:
          'VERTEX_ORDER_CROSSED: Vertices do not follow a simple cyclic traversal along the circle (crossed or non-cyclic sequence)',
      };
    }

    return {
      valid: true,
      status: 'VALID',
      angles,
    };
  }

  /**
   * 3. ORIENTATION_VALID
   * Determines global traversal orientation (CW vs CCW) of the quadrilateral sequence along the circle.
   * Handles 0/2π boundary wrap-around robustly.
   */
  static determineOrientation(
    angles: { vertexId: string; angleRad: number }[]
  ): { valid: boolean; orientation?: ZebraOrientation; reason?: string } {
    if (!angles || angles.length !== 4) {
      return { valid: false, reason: 'ORIENTATION_INVALID: Exactly 4 angles required' };
    }

    // Step differences in CCW direction: (next - curr) mod 2π
    const ccwSteps: number[] = [];
    for (let i = 0; i < 4; i++) {
      let d = (angles[(i + 1) % 4].angleRad - angles[i].angleRad) % (2 * Math.PI);
      if (d < 0) d += 2 * Math.PI;
      ccwSteps.push(d);
    }
    const sumCCW = ccwSteps.reduce((acc, v) => acc + v, 0);

    // Step differences in CW direction: (curr - next) mod 2π
    const cwSteps: number[] = [];
    for (let i = 0; i < 4; i++) {
      let d = (angles[i].angleRad - angles[(i + 1) % 4].angleRad) % (2 * Math.PI);
      if (d < 0) d += 2 * Math.PI;
      cwSteps.push(d);
    }
    const sumCW = cwSteps.reduce((acc, v) => acc + v, 0);

    if (Math.abs(sumCCW - 2 * Math.PI) < 1e-4) {
      return { valid: true, orientation: 'CCW' };
    }

    if (Math.abs(sumCW - 2 * Math.PI) < 1e-4) {
      return { valid: true, orientation: 'CW' };
    }

    return {
      valid: false,
      reason: `ORIENTATION_INDETERMINATE: Neither CCW sum (${sumCCW.toFixed(4)}) nor CW sum (${sumCW.toFixed(4)}) completes single 2π loop`,
    };
  }

  /**
   * 4. ARC_CLOSURE_VALID & COMPLETE NORMALIZATION PIPELINE
   * Executes the strict prerequisite pipeline:
   * REFERENCE_CIRCLE_VALID -> VERTEX_ORDER_VALID -> ORIENTATION_VALID -> ARC_CLOSURE_VALID
   *
   * Only if all prerequisites pass, produces a VALID result with complete ArcInterval data.
   * If any step fails, returns a fail-fast typed result with explicit reason and status
   * (NORMALIZATION_UNAVAILABLE or DEGENERATE).
   */
  static normalizeCyclicQuadrilateral(
    circle: ReferenceCircleInput | null | undefined,
    vertices: Point[],
    distEpsilon: number = CyclicChordEngine.DEFAULT_DIST_EPSILON
  ): ZebraNormalizedResult {
    // Step 1: REFERENCE_CIRCLE_VALID
    const refCheck = this.isReferenceCircleValid(circle, vertices, distEpsilon);
    if (!refCheck.valid || !circle) {
      const isDegenerate =
        circle && (!Number.isFinite(circle.radius) || circle.radius <= 0);
      return {
        status: isDegenerate ? 'DEGENERATE' : 'NORMALIZATION_UNAVAILABLE',
        reason: refCheck.reason || 'REFERENCE_CIRCLE_INVALID',
      };
    }

    // Step 2: VERTEX_ORDER_VALID
    const orderCheck = this.isVertexOrderValid(vertices, circle.center);
    if (!orderCheck.valid || !orderCheck.angles) {
      return {
        status: orderCheck.status,
        reason: orderCheck.reason,
      };
    }

    // Step 3: ORIENTATION_VALID
    const orientCheck = this.determineOrientation(orderCheck.angles);
    if (!orientCheck.valid || !orientCheck.orientation) {
      return {
        status: 'NORMALIZATION_UNAVAILABLE',
        reason: orientCheck.reason,
      };
    }

    const orientation = orientCheck.orientation;

    // Step 4: ARC_CLOSURE_VALID
    const arcIntervals: ArcInterval[] = [];
    let totalArcAngleRad = 0;

    for (let i = 0; i < 4; i++) {
      const curr = vertices[i];
      const next = vertices[(i + 1) % 4];
      const aCurr = orderCheck.angles[i].angleRad;
      const aNext = orderCheck.angles[(i + 1) % 4].angleRad;

      let subtendedAngle: number;
      if (orientation === 'CCW') {
        subtendedAngle = (aNext - aCurr) % (2 * Math.PI);
        if (subtendedAngle < 0) subtendedAngle += 2 * Math.PI;
      } else {
        subtendedAngle = (aCurr - aNext) % (2 * Math.PI);
        if (subtendedAngle < 0) subtendedAngle += 2 * Math.PI;
      }

      if (subtendedAngle <= 0 || subtendedAngle >= 2 * Math.PI) {
        return {
          status: 'DEGENERATE',
          reason: `ARC_CLOSURE_COLLAPSE: Subtended arc [${curr.id} -> ${next.id}] collapsed to ${subtendedAngle}`,
        };
      }

      // EXCLUSIVELY delegate chord computation to Foundation calculateChordLength
      const chordLen = calculateChordLength(subtendedAngle, circle.radius);

      arcIntervals.push({
        fromVertexId: curr.id,
        toVertexId: next.id,
        subtendedAngleRad: subtendedAngle,
        chordLength: chordLen,
      });

      totalArcAngleRad += subtendedAngle;
    }

    // Strict 2π closure verification with CLOSURE_EPSILON
    const closureError = Math.abs(totalArcAngleRad - 2 * Math.PI);
    if (closureError > CyclicChordEngine.CLOSURE_EPSILON) {
      return {
        status: 'NORMALIZATION_UNAVAILABLE',
        reason: `ARC_CLOSURE_FAILED: Total arc sum ${totalArcAngleRad} deviates from 2π by ${closureError}`,
      };
    }

    return {
      status: 'VALID',
      referenceCircle: {
        center: circle.center,
        radius: circle.radius,
      },
      vertexOrder: vertices,
      orientation,
      normalizedAngles: orderCheck.angles,
      arcIntervals,
      totalArcAngleRad,
    };
  }
}
