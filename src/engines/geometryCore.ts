/**
 * CQNS-001 — Geometry Core
 * Deterministic mathematical calculation authority for Euclidean primitives.
 * Pure arithmetic only; zero epistemic status assignment.
 */

import { Point } from '../types/geometry';
import { IntersectionEngine } from './intersectionEngine';
import { VerificationLayer } from './verificationLayer';

export class GeometryCore {
  /**
   * Euclidean distance between two points
   */
  static distance(
    p1: Point | { x: number; y: number },
    p2: Point | { x: number; y: number }
  ): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Deviation of point distance from circle radius: | ||P - O|| - R |
   */
  static radialDeviation(p: Point, center: Point, radius: number): number {
    const dist = this.distance(p, center);
    return Math.abs(dist - radius);
  }

  /**
   * Compute polar angle of point with respect to circle center in range [-PI, PI]
   */
  static polarAngle(p: Point, center: Point): number {
    return Math.atan2(p.y - center.y, p.x - center.x);
  }

  /**
   * Normalized polar angle in range [0, 2*PI)
   */
  static normalizedPolarAngle(p: Point, center: Point): number {
    let angle = Math.atan2(p.y - center.y, p.x - center.x);
    if (angle < 0) {
      angle += 2 * Math.PI;
    }
    return angle;
  }

  /**
   * Angle at vertex V formed by rays V->P1 and V->P2 in radians [0, PI]
   */
  static angleAtVertex(v: Point, p1: Point, p2: Point): number {
    const v1x = p1.x - v.x;
    const v1y = p1.y - v.y;
    const v2x = p2.x - v.x;
    const v2y = p2.y - v.y;

    const len1 = Math.sqrt(v1x * v1x + v1y * v1y);
    const len2 = Math.sqrt(v2x * v2x + v2y * v2y);

    if (len1 === 0 || len2 === 0) return 0;

    const dot = (v1x * v2x + v1y * v2y) / (len1 * len2);
    const clampedDot = Math.max(-1, Math.min(1, dot));
    return Math.acos(clampedDot);
  }

  /**
   * Calculate intersection point between two line segments (P1-P2) and (P3-P4)
   * Returns point coordinates or null if segments do not intersect
   */
  static segmentIntersection(
    p1: Point,
    p2: Point,
    p3: Point,
    p4: Point
  ): { x: number; y: number } | null {
    const d1x = p2.x - p1.x;
    const d1y = p2.y - p1.y;
    const d2x = p4.x - p3.x;
    const d2y = p4.y - p3.y;

    const denominator = d1x * d2y - d1y * d2x;
    if (Math.abs(denominator) < 1e-9) {
      return null; // Parallel or collinear
    }

    const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / denominator;
    const u = ((p3.x - p1.x) * d1y - (p3.y - p1.y) * d1x) / denominator;

    // Both t and u must be in [0, 1] for segments to intersect
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return {
        x: p1.x + t * d1x,
        y: p1.y + t * d1y,
      };
    }

    return null;
  }

  /**
   * Calculate intersection point between two infinite lines passing through (P1-P2) and (P3-P4)
   * Returns point coordinates or null if lines are parallel
   */
  static lineIntersection(
    p1: Point,
    p2: Point,
    p3: Point,
    p4: Point
  ): { x: number; y: number } | null {
    const d1x = p2.x - p1.x;
    const d1y = p2.y - p1.y;
    const d2x = p4.x - p3.x;
    const d2y = p4.y - p3.y;

    const denominator = d1x * d2y - d1y * d2x;
    if (Math.abs(denominator) < 1e-9) {
      return null; // Parallel or collinear lines
    }

    const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / denominator;
    return {
      x: p1.x + t * d1x,
      y: p1.y + t * d1y,
    };
  }

  /**
   * Ptolemy equality check: | AC * BD - (AB * CD + BC * AD) |
   */
  static ptolemyDelta(
    a: Point,
    b: Point,
    c: Point,
    d: Point
  ): { delta: number; diagProduct: number; sideProductSum: number } {
    const ab = this.distance(a, b);
    const bc = this.distance(b, c);
    const cd = this.distance(c, d);
    const da = this.distance(d, a);
    const ac = this.distance(a, c);
    const bd = this.distance(b, d);

    const diagProduct = ac * bd;
    const sideProductSum = ab * cd + bc * da;
    const delta = Math.abs(diagProduct - sideProductSum);

    return { delta, diagProduct, sideProductSum };
  }

  /**
   * Checks if four points along circumcircle appear in strictly convex order
   * by verifying monotonic counter-clockwise progression of polar angles
   */
  static isConvexCircularOrder(
    a: Point,
    b: Point,
    c: Point,
    d: Point,
    center: Point
  ): boolean {
    const thetaA = this.normalizedPolarAngle(a, center);
    let thetaB = this.normalizedPolarAngle(b, center);
    let thetaC = this.normalizedPolarAngle(c, center);
    let thetaD = this.normalizedPolarAngle(d, center);

    // Shift relative to thetaA to handle branch cut
    thetaB = (thetaB - thetaA + 2 * Math.PI) % (2 * Math.PI);
    thetaC = (thetaC - thetaA + 2 * Math.PI) % (2 * Math.PI);
    thetaD = (thetaD - thetaA + 2 * Math.PI) % (2 * Math.PI);

    // Strictly monotonic progression in range (0, 2*PI)
    return thetaB > 0 && thetaB < thetaC && thetaC < thetaD && thetaD < 2 * Math.PI;
  }

  /**
   * Convert point coordinates to polar angle in degrees [0, 360)
   * With 0 deg at positive x-axis, counter-clockwise
   */
  static pointToDegree(p: Point, center: Point): number {
    const rad = this.normalizedPolarAngle(p, center);
    return Math.round(((rad * 180) / Math.PI) * 10) / 10;
  }

  // ===========================================================================
  // LEGACY GRAPHICAL UI PREVIEW HELPERS (NON-AUTHORITATIVE, UI CANVAS ONLY)
  // These helpers are strictly restricted to transient canvas hover previews.
  // FORBIDDEN for use in Construction DAG, GeometryState, or mathematical layer.
  // The authoritative classical constructions are parallelThroughPoint and perpendicularThroughPoint.
  // ===========================================================================

  /**
   * LEGACY UI PREVIEW ONLY: Calculate transient hover preview endpoints for parallel line.
   * STRICTLY NON-AUTHORITATIVE. Do not use in Construction Layer or dynamic recomputation.
   */
  static legacyPreviewParallelLine(
    pt: Point | { x: number; y: number },
    refP1: Point | { x: number; y: number },
    refP2: Point | { x: number; y: number },
    extent: number = 400
  ): { p1: { x: number; y: number }; p2: { x: number; y: number } } {
    const dx = refP2.x - refP1.x;
    const dy = refP2.y - refP1.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len === 0) {
      return {
        p1: { x: pt.x - extent, y: pt.y },
        p2: { x: pt.x + extent, y: pt.y },
      };
    }

    const ux = dx / len;
    const uy = dy / len;

    return {
      p1: { x: Math.round(pt.x - ux * extent), y: Math.round(pt.y - uy * extent) },
      p2: { x: Math.round(pt.x + ux * extent), y: Math.round(pt.y + uy * extent) },
    };
  }

  /**
   * LEGACY UI PREVIEW ONLY: Calculate transient hover preview endpoints for perpendicular line.
   * STRICTLY NON-AUTHORITATIVE. Do not use in Construction Layer or dynamic recomputation.
   */
  static legacyPreviewPerpendicularLine(
    pt: Point | { x: number; y: number },
    refP1: Point | { x: number; y: number },
    refP2: Point | { x: number; y: number },
    extent: number = 400
  ): { p1: { x: number; y: number }; p2: { x: number; y: number } } {
    const dx = refP2.x - refP1.x;
    const dy = refP2.y - refP1.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len === 0) {
      return {
        p1: { x: pt.x, y: pt.y - extent },
        p2: { x: pt.x, y: pt.y + extent },
      };
    }

    // Normal vector (-dy, dx)
    const nx = -dy / len;
    const ny = dx / len;

    return {
      p1: { x: Math.round(pt.x - nx * extent), y: Math.round(pt.y - ny * extent) },
      p2: { x: Math.round(pt.x + nx * extent), y: Math.round(pt.y + ny * extent) },
    };
  }

  /** @deprecated Use legacyPreviewParallelLine for transient UI preview, or parallelThroughPoint for construction */
  static parallelLine(
    pt: Point | { x: number; y: number },
    refP1: Point | { x: number; y: number },
    refP2: Point | { x: number; y: number },
    extent: number = 400
  ): { p1: { x: number; y: number }; p2: { x: number; y: number } } {
    return this.legacyPreviewParallelLine(pt, refP1, refP2, extent);
  }

  /** @deprecated Use legacyPreviewPerpendicularLine for transient UI preview, or perpendicularThroughPoint for construction */
  static perpendicularLine(
    pt: Point | { x: number; y: number },
    refP1: Point | { x: number; y: number },
    refP2: Point | { x: number; y: number },
    extent: number = 400
  ): { p1: { x: number; y: number }; p2: { x: number; y: number } } {
    return this.legacyPreviewPerpendicularLine(pt, refP1, refP2, extent);
  }

  // ===========================================================================
  // PACKAGE 03: CLASSICAL CONSTRUCTIONS (LL, LC, CC DERIVED ROUTINES)
  // ===========================================================================

  /**
   * 1. PERPENDICULAR_BISECTOR
   * Segment AB -> Circle(A, |AB|) ∩ Circle(B, |AB|) (CC primitive) -> C, D -> Line(C, D)
   * Passing through midpoint M = (A + B) / 2
   */
  static perpendicularBisector(
    a: Point | { x: number; y: number },
    b: Point | { x: number; y: number }
  ): { midpoint: { x: number; y: number }; p1: { x: number; y: number }; p2: { x: number; y: number } } | null {
    const d = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
    if (d < 1e-6) return null;

    // Pure classical construction: Circle(A, |AB|) ∩ Circle(B, |AB|) via CC primitive
    const ccRes = IntersectionEngine.intersectCircles(
      { center: a, radius: d },
      { center: b, radius: d }
    );

    if (ccRes.status !== 'INTERSECT' || ccRes.points.length !== 2) {
      return null;
    }

    const c = ccRes.points[0];
    const dPt = ccRes.points[1];
    const midpoint = {
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
    };

    return {
      midpoint,
      p1: { x: c.x, y: c.y },
      p2: { x: dPt.x, y: dPt.y },
    };
  }

  /**
   * 2. PERPENDICULAR_THROUGH_POINT
   * Line L(lineP1, lineP2), Point P
   * Case A (P ∉ L):
   *   Circle(P, R > dist(P, L)) ∩ L -> A, B (LC primitive)
   *   PERPENDICULAR_BISECTOR(A, B) (CC primitive) -> line through P perpendicular to L
   * Case B (P ∈ L):
   *   Circle(P, R) ∩ L -> A, B (LC primitive, P is midpoint)
   *   PERPENDICULAR_BISECTOR(A, B) (CC primitive) -> line through P perpendicular to L
   */
  static perpendicularThroughPoint(
    p: Point | { x: number; y: number },
    lineP1: Point | { x: number; y: number },
    lineP2: Point | { x: number; y: number }
  ): { p1: { x: number; y: number }; p2: { x: number; y: number } } | null {
    const dx = lineP2.x - lineP1.x;
    const dy = lineP2.y - lineP1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1e-6) return null;

    // Perpendicular distance from P to line L
    const h = Math.abs((p.x - lineP1.x) * dy - (p.y - lineP1.y) * dx) / len;

    let radius: number;
    if (h < 1e-4) {
      // Case B: P ∈ L -> choose radius along line
      radius = Math.max(50, len / 2);
    } else {
      // Case A: P ∉ L -> choose radius R > dist(P, L)
      radius = Math.max(h * 2, h + 50);
    }

    // Step 1: Auxiliary circle centered at P intersected with line L (LC primitive)
    const lcRes = IntersectionEngine.intersectLineCircle(
      { p1: lineP1, p2: lineP2 },
      { center: p, radius }
    );

    if (lcRes.status !== 'SECANT' || lcRes.points.length !== 2) {
      return null;
    }

    const ptA = lcRes.points[0];
    const ptB = lcRes.points[1];

    // Step 2: Perpendicular bisector of segment AB (CC primitive)
    const bisect = this.perpendicularBisector(ptA, ptB);
    if (!bisect) return null;

    return {
      p1: bisect.p1,
      p2: bisect.p2,
    };
  }

  /**
   * 3. PARALLEL_THROUGH_POINT
   * Line L, Point P ∉ L
   * Validated construction:
   * 1. Construct L_perp through P perpendicular to L (PERPENDICULAR_THROUGH_POINT via LC/CC)
   * 2. Construct L_parallel through P perpendicular to L_perp (PERPENDICULAR_THROUGH_POINT via LC/CC)
   */
  static parallelThroughPoint(
    p: Point | { x: number; y: number },
    lineP1: Point | { x: number; y: number },
    lineP2: Point | { x: number; y: number }
  ): { p1: { x: number; y: number }; p2: { x: number; y: number } } | null {
    // Check P ∉ L (distance > epsilon)
    const dx = lineP2.x - lineP1.x;
    const dy = lineP2.y - lineP1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1e-6) return null;

    const distToLine = Math.abs((p.x - lineP1.x) * dy - (p.y - lineP1.y) * dx) / len;
    if (distToLine < 1e-4) {
      // P lies on L; parallel line through point requires P ∉ L
      return null;
    }

    // Step 1: Perpendicular to L through P (via LC/CC primitives)
    const perp = this.perpendicularThroughPoint(p, lineP1, lineP2);
    if (!perp) return null;

    // Step 2: Perpendicular to L_perp through P (yields line parallel to L, via LC/CC primitives)
    return this.perpendicularThroughPoint(p, perp.p1, perp.p2);
  }

  /**
   * 4. ANGLE_BISECTOR
   * Angle ∠ABC (vertex B, ray BA, ray BC), bisectorType: 'INTERNAL' | 'EXTERNAL'
   * Constructive chain:
   * 1. Circle(B, R) ∩ ray BA -> E, ∩ ray BC -> F (LC primitive)
   * 2. Circle(E, |EF|) ∩ Circle(F, |EF|) -> D1, D2 (CC primitive)
   * 3. Mathematical selection rule:
   *    Candidate direction d = D - B.
   *    Internal bisector: u · d > 0 and v · d > 0.
   *    External bisector: alternate candidate.
   * Degenerate cases: opposite rays (180 deg) or coincident rays (0 deg) -> null.
   */
  static angleBisector(
    vertexB: Point | { x: number; y: number },
    ray1PtA: Point | { x: number; y: number },
    ray2PtC: Point | { x: number; y: number },
    bisectorType: 'INTERNAL' | 'EXTERNAL' = 'INTERNAL'
  ): { p1: { x: number; y: number }; p2: { x: number; y: number } } | null {
    const uX = ray1PtA.x - vertexB.x;
    const uY = ray1PtA.y - vertexB.y;
    const vX = ray2PtC.x - vertexB.x;
    const vY = ray2PtC.y - vertexB.y;

    const lenU = Math.sqrt(uX * uX + uY * uY);
    const lenV = Math.sqrt(vX * vX + vY * vY);
    if (lenU < 1e-6 || lenV < 1e-6) return null;

    const uNormX = uX / lenU;
    const uNormY = uY / lenU;
    const vNormX = vX / lenV;
    const vNormY = vY / lenV;

    // Dot product between unit vectors
    const dot = uNormX * vNormX + uNormY * vNormY;

    // Coincident rays (angle = 0 deg)
    if (Math.abs(dot - 1) < 1e-6) return null;
    // Opposite rays (angle = 180 deg)
    if (Math.abs(dot + 1) < 1e-6) return null;

    // Step 1: Auxiliary circle centered at B intersecting both rays (LC primitive)
    const r1 = Math.max(30, Math.min(lenU, lenV) / 2);
    const lcRay1 = IntersectionEngine.intersectLineCircle(
      { p1: vertexB, p2: ray1PtA },
      { center: vertexB, radius: r1 }
    );
    const lcRay2 = IntersectionEngine.intersectLineCircle(
      { p1: vertexB, p2: ray2PtC },
      { center: vertexB, radius: r1 }
    );

    if (lcRay1.status !== 'SECANT' || lcRay2.status !== 'SECANT') return null;

    // Select intersection points on the positive rays
    const ptE = lcRay1.points.find(p => (p.x - vertexB.x) * uNormX + (p.y - vertexB.y) * uNormY > 0);
    const ptF = lcRay2.points.find(p => (p.x - vertexB.x) * vNormX + (p.y - vertexB.y) * vNormY > 0);
    if (!ptE || !ptF) return null;

    if (bisectorType === 'INTERNAL') {
      // Step 2: Circles centered at E and F of equal radius (CC primitive)
      const distEF = Math.sqrt((ptF.x - ptE.x) ** 2 + (ptF.y - ptE.y) ** 2);
      const r2 = Math.max(distEF, 30);

      const ccRes = IntersectionEngine.intersectCircles(
        { center: ptE, radius: r2 },
        { center: ptF, radius: r2 }
      );

      if (ccRes.status !== 'INTERSECT' || ccRes.points.length !== 2) return null;

      const [d1, d2] = ccRes.points;
      return {
        p1: { x: Math.round(d1.x), y: Math.round(d1.y) },
        p2: { x: Math.round(d2.x), y: Math.round(d2.y) },
      };
    } else {
      // EXTERNAL BISECTOR:
      // Construct point E' on the opposite ray of BA (LC primitive):
      const ptEPrime = lcRay1.points.find(p => (p.x - vertexB.x) * uNormX + (p.y - vertexB.y) * uNormY < 0);
      if (!ptEPrime) return null;

      // Circles centered at E' and F of equal radius (CC primitive)
      const distEPrimeF = Math.sqrt((ptF.x - ptEPrime.x) ** 2 + (ptF.y - ptEPrime.y) ** 2);
      const r2 = Math.max(distEPrimeF, 30);

      const ccRes = IntersectionEngine.intersectCircles(
        { center: ptEPrime, radius: r2 },
        { center: ptF, radius: r2 }
      );

      if (ccRes.status !== 'INTERSECT' || ccRes.points.length !== 2) return null;

      const [g1, g2] = ccRes.points;
      return {
        p1: { x: Math.round(g1.x), y: Math.round(g1.y) },
        p2: { x: Math.round(g2.x), y: Math.round(g2.y) },
      };
    }
  }

  /**
   * 5. CIRCUMCIRCLE
   * Three pairwise distinct, non-collinear points A, B, C
   * Perpendicular bisector of AB (L1) + Perpendicular bisector of BC (L2) -> L1 ∩ L2 -> Center O (LL)
   * Circle(O, |OA|)
   */
  static circumcircle(
    a: Point | { x: number; y: number },
    b: Point | { x: number; y: number },
    c: Point | { x: number; y: number }
  ): { center: { x: number; y: number }; radius: number } | null {
    // Check collinearity via cross-product
    const cross = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    if (Math.abs(cross) < 1e-4) return null;

    const bisectAB = this.perpendicularBisector(a, b);
    const bisectBC = this.perpendicularBisector(b, c);
    if (!bisectAB || !bisectBC) return null;

    const llRes = IntersectionEngine.intersectLines(
      { p1: bisectAB.p1, p2: bisectAB.p2 },
      { p1: bisectBC.p1, p2: bisectBC.p2 }
    );

    if (llRes.status !== 'UNIQUE_INTERSECTION' || !llRes.point) {
      return null;
    }

    const center = llRes.point;
    const radius = Math.sqrt((a.x - center.x) ** 2 + (a.y - center.y) ** 2);

    return { center, radius: Math.round(radius) };
  }

  /**
   * 6. INSCRIBED_SQUARE
   * Circle S(O, R) and explicit diameter line AB
   * Intersect diameter line with circle -> A', B' (LC)
   * Construct perpendicular diameter CD via perpendicular bisector -> C, D
   * Return 4 square vertices [A', C, B', D]
   */
  static inscribedSquare(
    center: Point | { x: number; y: number },
    radius: number,
    diameterP1: Point | { x: number; y: number },
    diameterP2: Point | { x: number; y: number }
  ): { v1: { x: number; y: number }; v2: { x: number; y: number }; v3: { x: number; y: number }; v4: { x: number; y: number } } | null {
    if (radius <= 0) return null;

    const lcRes = IntersectionEngine.intersectLineCircle(
      { p1: diameterP1, p2: diameterP2 },
      { center, radius }
    );

    if (lcRes.status !== 'SECANT' || lcRes.points.length !== 2) {
      return null;
    }

    const pA = lcRes.points[0];
    const pB = lcRes.points[1];

    const perpBisect = this.perpendicularBisector(pA, pB);
    if (!perpBisect) return null;

    const lcPerp = IntersectionEngine.intersectLineCircle(
      { p1: perpBisect.p1, p2: perpBisect.p2 },
      { center, radius }
    );

    if (lcPerp.status !== 'SECANT' || lcPerp.points.length !== 2) {
      return null;
    }

    const pC = lcPerp.points[0];
    const pD = lcPerp.points[1];

    return {
      v1: { x: Math.round(pA.x), y: Math.round(pA.y) },
      v2: { x: Math.round(pC.x), y: Math.round(pC.y) },
      v3: { x: Math.round(pB.x), y: Math.round(pB.y) },
      v4: { x: Math.round(pD.x), y: Math.round(pD.y) },
    };
  }

  /**
   * 7. TANGENT_FROM_EXTERNAL_POINT
   * Strictly P outside S(O, R) (dist(O, P) > R).
   * Midpoint M of OP -> Thales circle Circle(M, |MO|) ∩ S(O, R) -> T1, T2 (CC primitive).
   * Tangent lines PT1, PT2.
   */
  static tangentsFromExternalPoint(
    p: Point | { x: number; y: number },
    center: Point | { x: number; y: number },
    radius: number
  ): {
    t1: { x: number; y: number };
    t2: { x: number; y: number };
    line1: { p1: { x: number; y: number }; p2: { x: number; y: number } };
    line2: { p1: { x: number; y: number }; p2: { x: number; y: number } };
  } | null {
    const distOP = Math.sqrt((p.x - center.x) ** 2 + (p.y - center.y) ** 2);
    if (distOP <= radius + 1e-6) {
      // Point must be strictly outside circle
      return null;
    }

    // Midpoint of OP via classical bisector or vector midpoint
    const midM = { x: (p.x + center.x) / 2, y: (p.y + center.y) / 2 };
    const radiusM = distOP / 2;

    // CC intersection of Thales circle with S(O, R)
    const ccRes = IntersectionEngine.intersectCircles(
      { center: midM, radius: radiusM },
      { center, radius }
    );

    if (ccRes.status !== 'INTERSECT' || ccRes.points.length !== 2) {
      return null;
    }

    const t1 = { x: Math.round(ccRes.points[0].x), y: Math.round(ccRes.points[0].y) };
    const t2 = { x: Math.round(ccRes.points[1].x), y: Math.round(ccRes.points[1].y) };

    return {
      t1,
      t2,
      line1: { p1: { x: Math.round(p.x), y: Math.round(p.y) }, p2: t1 },
      line2: { p1: { x: Math.round(p.x), y: Math.round(p.y) }, p2: t2 },
    };
  }

  /**
   * 8. TANGENT_AT_POINT
   * Strictly P on S(O, R) (|dist(O, P) - R| <= EPSILON_DIST)
   * Construct radius line OP -> construct line perpendicular to OP passing through P.
   */
  static tangentAtPoint(
    p: Point | { x: number; y: number },
    center: Point | { x: number; y: number },
    radius: number
  ): { p1: { x: number; y: number }; p2: { x: number; y: number } } | null {
    const dist = Math.sqrt((p.x - center.x) ** 2 + (p.y - center.y) ** 2);
    if (Math.abs(dist - radius) > VerificationLayer.EPSILON_DIST) {
      // P must lie on circle
      return null;
    }

    return this.perpendicularThroughPoint(p, center, p);
  }
}

