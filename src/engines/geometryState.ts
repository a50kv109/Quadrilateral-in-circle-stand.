/**
 * CQNS-001 — Geometry State
 * Single Source of Truth for geometric entities.
 * Zero duplicate states; coordinates managed strictly here.
 */

import { Point, Circle, Segment, Quadrilateral, ProvenanceOrigin, VertexMode, ConstructionIntersectionPoint } from '../types/geometry';
import { ConstructionDAG } from './constructionDag';
import { GeometryCore } from './geometryCore';
import { IntersectionEngine } from './intersectionEngine';

export interface DependentLine {
  segId: string;
  lineType: 'parallel' | 'perpendicular';
  throughPointId: string;
  refSegmentId: string;
  p1Id: string;
  p2Id: string;
  extent?: number;
}

export interface DependentIntersection {
  pointId: string;
  seg1Id: string;
  seg2Id: string;
}

export interface DependentCircle {
  circleId: string;
  centerId: string;
  radiusPoint1Id: string;
  radiusPoint2Id: string;
}

export interface DependentBisector {
  segId: string;
  vertexId: string;
  ray1PointId: string;
  ray2PointId: string;
  p1Id: string;
  p2Id: string;
}

export class GeometryState {
  private static instance: GeometryState;

  public points: Map<string, Point> = new Map();
  public circles: Map<string, Circle> = new Map();
  public segments: Map<string, Segment> = new Map();
  public quadrilaterals: Map<string, Quadrilateral> = new Map();

  public stateVersion: number = 0;
  public lastEventId: string = 'evt_init';
  public provenanceMode: ProvenanceOrigin = 'CANONICAL';
  public vertexMode: VertexMode = 'SCHOOL';
  public dag: ConstructionDAG = new ConstructionDAG();

  // Active parametric dependency registries for real-time dynamic recomputations
  public dependentIntersections: Map<string, DependentIntersection> = new Map();
  public dependentLines: Map<string, DependentLine> = new Map();
  public dependentCircles: Map<string, DependentCircle> = new Map();
  public dependentBisectors: Map<string, DependentBisector> = new Map();

  private listeners: Set<(state: GeometryState) => void> = new Set();
  private freeIdCounter: number = 0;

  public static readonly MIN_VERTEX_ANGLE_GAP = (10 * Math.PI) / 180; // 10 degrees

  private normalizeAngle(rad: number): number {
    let a = rad % (2 * Math.PI);
    if (a < 0) a += 2 * Math.PI;
    return a;
  }

  private isAngleBetween(target: number, start: number, end: number): boolean {
    const normEnd = this.normalizeAngle(end - start);
    const normTarget = this.normalizeAngle(target - start);
    return normTarget <= normEnd;
  }

  private circularDistance(a: number, b: number): number {
    const diff = Math.abs(this.normalizeAngle(a - b));
    return Math.min(diff, 2 * Math.PI - diff);
  }

  private getPointAngle(ptId: string, center: Point): number {
    const pt = this.points.get(ptId);
    if (!pt) return 0;
    return this.normalizeAngle(Math.atan2(pt.y - center.y, pt.x - center.x));
  }

  private getNeighbors(pointId: string): { prevId: string; nextId: string } {
    if (pointId === 'pt_B') return { prevId: 'pt_A', nextId: 'pt_C' };
    if (pointId === 'pt_C') return { prevId: 'pt_B', nextId: 'pt_D' };
    if (pointId === 'pt_D') return { prevId: 'pt_C', nextId: 'pt_A' };
    return { prevId: 'pt_D', nextId: 'pt_B' }; // pt_A
  }

  private constructor() {
    this.resetToCanonical();
  }

  public static getInstance(): GeometryState {
    if (!GeometryState.instance) {
      GeometryState.instance = new GeometryState();
    }
    return GeometryState.instance;
  }

  /**
   * Subscribe to state updates
   */
  public subscribe(listener: (state: GeometryState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(eventId: string): void {
    this.stateVersion++;
    this.lastEventId = eventId;
    for (const listener of this.listeners) {
      listener(this);
    }
  }

  /**
   * Initialize or reset to strict canonical configuration:
   * Circle(O, R=160), with A, B, C, D strictly on the circle
   */
  public resetToCanonical(): void {
    this.points.clear();
    this.circles.clear();
    this.segments.clear();
    this.quadrilaterals.clear();
    this.dag.clear();
    this.dependentIntersections.clear();
    this.dependentLines.clear();
    this.dependentCircles.clear();
    this.dependentBisectors.clear();

    const radius = 160;
    const centerX = 0;
    const centerY = 0;

    // Center point O
    const ptO: Point = { id: 'pt_O', name: 'O', x: centerX, y: centerY, role: 'center', pinned: true };
    this.points.set(ptO.id, ptO);
    this.dag.register(ptO.id, 'point', [], 'INIT_CENTER');

    // Circumcircle
    const circle: Circle = { id: 'circle_main', name: 'Circle(O, R)', centerId: ptO.id, radius };
    this.circles.set(circle.id, circle);
    this.dag.register(circle.id, 'circle', [ptO.id], 'INIT_CIRCUMCIRCLE');

    // 4 canonical concyclic vertices forming an INSCRIBED SQUARE:
    // Angles: 45 deg (π/4), 135 deg (3π/4), 225 deg (5π/4), 315 deg (7π/4)
    const angles = [
      { id: 'pt_A', name: 'A', rad: (45 * Math.PI) / 180 },
      { id: 'pt_B', name: 'B', rad: (135 * Math.PI) / 180 },
      { id: 'pt_C', name: 'C', rad: (225 * Math.PI) / 180 },
      { id: 'pt_D', name: 'D', rad: (315 * Math.PI) / 180 },
    ];

    for (const p of angles) {
      const x = Math.round(centerX + radius * Math.cos(p.rad));
      const y = Math.round(centerY + radius * Math.sin(p.rad));
      const pt: Point = { id: p.id, name: p.name, x, y, role: 'vertex' };
      this.points.set(pt.id, pt);
      this.dag.register(pt.id, 'point', [circle.id], `INIT_VERTEX_${p.name}`);
    }

    // 4 Base chords/sides: AB, BC, CD, DA
    const sides: [string, string, string][] = [
      ['seg_AB', 'pt_A', 'pt_B'],
      ['seg_BC', 'pt_B', 'pt_C'],
      ['seg_CD', 'pt_C', 'pt_D'],
      ['seg_DA', 'pt_D', 'pt_A'],
    ];

    const boundaryIds: [string, string, string, string] = [
      'seg_AB',
      'seg_BC',
      'seg_CD',
      'seg_DA',
    ];

    for (const [sId, p1, p2] of sides) {
      const seg: Segment = { id: sId, name: `${this.points.get(p1)!.name}${this.points.get(p2)!.name}`, p1Id: p1, p2Id: p2, segmentType: 'side' };
      this.segments.set(seg.id, seg);
      this.dag.register(seg.id, 'segment', [p1, p2], 'CONSTRUCT_SIDE');
    }

    // Quadrilateral
    const quad: Quadrilateral = {
      id: 'quad_ABCD',
      name: 'ABCD',
      vertexIds: ['pt_A', 'pt_B', 'pt_C', 'pt_D'],
      boundarySegmentIds: boundaryIds,
    };
    this.quadrilaterals.set(quad.id, quad);
    this.dag.register(quad.id, 'quadrilateral', ['pt_A', 'pt_B', 'pt_C', 'pt_D'], 'COMPOSE_QUADRILATERAL');

    this.dependentIntersections.clear();
    this.dependentLines.clear();
    this.vertexMode = 'SCHOOL';

    this.notify('evt_reset_canonical');
  }

  /**
   * Set vertex manipulation mode:
   * 'SCHOOL' = strict S¹ circumcircle constraint (concyclicity preserved)
   * 'RESEARCH' = unconstrained planar drag (can take D off circle to test VANISHED)
   */
  public setVertexMode(mode: VertexMode): void {
    this.vertexMode = mode;
    if (mode === 'SCHOOL') {
      const circle = this.circles.get('circle_main');
      const center = circle ? this.points.get(circle.centerId) : null;
      if (circle && center) {
        for (const ptId of ['pt_A', 'pt_B', 'pt_C', 'pt_D']) {
          const pt = this.points.get(ptId);
          if (pt) {
            const angle = Math.atan2(pt.y - center.y, pt.x - center.x);
            pt.x = Math.round(center.x + circle.radius * Math.cos(angle));
            pt.y = Math.round(center.y + circle.radius * Math.sin(angle));
            this.points.set(ptId, { ...pt });
          }
        }
        this.recomputeDependentConstructions();
      }
    }
    this.notify(`evt_set_vertex_mode_${mode.toLowerCase()}`);
  }

  /**
   * Dynamically recompute dependent constructions (intersections, parallel lines, perpendicular lines)
   * in topological order using deterministic mathematical authority GeometryCore.
   */
  public recomputeDependentConstructions(triggerPointId?: string): void {
    // 1. Recompute intersection points (e.g. P = AC ∩ BD)
    for (const item of this.dependentIntersections.values()) {
      const seg1 = this.segments.get(item.seg1Id);
      const seg2 = this.segments.get(item.seg2Id);
      if (!seg1 || !seg2) continue;

      const p1 = this.points.get(seg1.p1Id);
      const p2 = this.points.get(seg1.p2Id);
      const p3 = this.points.get(seg2.p1Id);
      const p4 = this.points.get(seg2.p2Id);
      if (!p1 || !p2 || !p3 || !p4) continue;

      const coords = GeometryCore.segmentIntersection(p1, p2, p3, p4) || GeometryCore.lineIntersection(p1, p2, p3, p4);
      if (coords) {
        const targetPt = this.points.get(item.pointId);
        if (targetPt) {
          targetPt.x = Math.round(coords.x);
          targetPt.y = Math.round(coords.y);
          this.points.set(item.pointId, { ...targetPt });
        }
      }
    }

    // 2. Recompute dependent lines (Parallel and Perpendicular)
    for (const line of this.dependentLines.values()) {
      const throughPt = this.points.get(line.throughPointId);
      const refSeg = this.segments.get(line.refSegmentId);
      if (!throughPt || !refSeg) continue;

      const refP1 = this.points.get(refSeg.p1Id);
      const refP2 = this.points.get(refSeg.p2Id);
      if (!refP1 || !refP2) continue;

      let coords: { p1: { x: number; y: number }; p2: { x: number; y: number } } | null = null;
      if (line.lineType === 'parallel') {
        coords = GeometryCore.parallelThroughPoint(throughPt, refP1, refP2);
      } else {
        coords = GeometryCore.perpendicularThroughPoint(throughPt, refP1, refP2);
      }

      if (!coords) {
        // Failure safety: do not mutate endpoints into NaN or artificial coordinates on degenerate geometry
        continue;
      }

      const endP1 = this.points.get(line.p1Id);
      const endP2 = this.points.get(line.p2Id);
      if (endP1) {
        endP1.x = coords.p1.x;
        endP1.y = coords.p1.y;
        this.points.set(line.p1Id, { ...endP1 });
      }
      if (endP2) {
        endP2.x = coords.p2.x;
        endP2.y = coords.p2.y;
        this.points.set(line.p2Id, { ...endP2 });
      }
    }

    // 3. Recompute dependent circles (Compass circles: dynamic center and radius)
    for (const item of this.dependentCircles.values()) {
      const circle = this.circles.get(item.circleId);
      const center = this.points.get(item.centerId);
      const p1 = this.points.get(item.radiusPoint1Id);
      const p2 = this.points.get(item.radiusPoint2Id);
      if (!circle || !center || !p1 || !p2) continue;

      const updatedRadius = Math.round(GeometryCore.distance(p1, p2));
      circle.radius = updatedRadius;
      circle.centerId = item.centerId;
      this.circles.set(item.circleId, { ...circle });
    }

    // 4. Recompute dependent angle bisectors
    for (const bis of this.dependentBisectors.values()) {
      const v = this.points.get(bis.vertexId);
      const r1 = this.points.get(bis.ray1PointId);
      const r2 = this.points.get(bis.ray2PointId);
      if (!v || !r1 || !r2) continue;

      const coords = GeometryCore.angleBisector(v, r1, r2, 'INTERNAL');
      if (!coords) continue;

      const endP1 = this.points.get(bis.p1Id);
      const endP2 = this.points.get(bis.p2Id);
      if (endP1) {
        endP1.x = coords.p1.x;
        endP1.y = coords.p1.y;
        this.points.set(bis.p1Id, { ...endP1 });
      }
      if (endP2) {
        endP2.x = coords.p2.x;
        endP2.y = coords.p2.y;
        this.points.set(bis.p2Id, { ...endP2 });
      }
    }
  }

  /**
   * Deterministically evaluate all active construction intersection points (Line × Circle, Line × Line, Circle × Circle)
   * using IntersectionEngine mathematical primitives.
   * Strictly read-only query for visualization layer. Zero mutation of RelationGraph, zero fake geometry.
   */
  public getConstructionIntersections(): ConstructionIntersectionPoint[] {
    const results: ConstructionIntersectionPoint[] = [];
    const knownCoords: { x: number; y: number }[] = [];

    // Helper: check if a coordinate is coincident with an already known canonical vertex, center, or existing point
    const isCoincident = (x: number, y: number, tol: number = 2.0): boolean => {
      for (const pt of this.points.values()) {
        if (pt.role === 'vertex' || pt.role === 'center') {
          if (Math.hypot(pt.x - x, pt.y - y) <= tol) return true;
        }
      }
      for (const p of knownCoords) {
        if (Math.hypot(p.x - x, p.y - y) <= tol) return true;
      }
      return false;
    };

    let pIndex = 1;

    // 1. Line × Circle (LC): Intersect constructed lines (perpendicular, parallel, auxiliary lines) with circles
    const candidateLines = Array.from(this.segments.values()).filter(
      s => s.segmentType === 'parallel' || s.segmentType === 'perpendicular' || s.isInfiniteLine
    );
    const candidateCircles = Array.from(this.circles.values());

    for (const line of candidateLines) {
      const lp1 = this.points.get(line.p1Id);
      const lp2 = this.points.get(line.p2Id);
      if (!lp1 || !lp2) continue;

      for (const circle of candidateCircles) {
        const center = this.points.get(circle.centerId);
        if (!center) continue;

        const lcRes = IntersectionEngine.intersectLineCircle(
          { p1: lp1, p2: lp2 },
          { center, radius: circle.radius }
        );

        if (lcRes.status === 'SECANT' || lcRes.status === 'TANGENT') {
          // Sort points deterministically (top-to-bottom, left-to-right)
          const sortedPts = [...lcRes.points].sort((a, b) => (Math.abs(a.y - b.y) > 0.1 ? a.y - b.y : a.x - b.x));
          for (let i = 0; i < sortedPts.length; i++) {
            const pt = sortedPts[i];
            if (isCoincident(pt.x, pt.y)) continue;

            const name = `P${pIndex++}`;
            const roundedX = Math.round(pt.x * 10) / 10;
            const roundedY = Math.round(pt.y * 10) / 10;
            knownCoords.push({ x: roundedX, y: roundedY });
            results.push({
              id: `isect_lc_${line.id}_${circle.id}_${i}`,
              name,
              x: roundedX,
              y: roundedY,
              sourceType: 'line_circle',
              parentEntityIds: [line.id, circle.id],
              description: `${line.name} ∩ ${circle.name}`,
            });
          }
        }
      }
    }

    // 2. Line × Line (LL): Intersect distinct constructed lines (e.g. perpendicular with parallel, or perpendicular with diagonal/side)
    const allLines = Array.from(this.segments.values());
    for (let i = 0; i < allLines.length; i++) {
      for (let j = i + 1; j < allLines.length; j++) {
        const l1 = allLines[i];
        const l2 = allLines[j];
        const isConstruction =
          l1.segmentType === 'parallel' || l1.segmentType === 'perpendicular' ||
          l2.segmentType === 'parallel' || l2.segmentType === 'perpendicular';
        if (!isConstruction) continue;

        const p1 = this.points.get(l1.p1Id);
        const p2 = this.points.get(l1.p2Id);
        const p3 = this.points.get(l2.p1Id);
        const p4 = this.points.get(l2.p2Id);
        if (!p1 || !p2 || !p3 || !p4) continue;

        const llRes = IntersectionEngine.intersectLines(
          { p1, p2 },
          { p1: p3, p2: p4 }
        );

        if (llRes.status === 'UNIQUE_INTERSECTION' && llRes.point) {
          const pt = llRes.point;
          if (Math.abs(pt.x) > 350 || Math.abs(pt.y) > 350) continue;
          if (isCoincident(pt.x, pt.y)) continue;

          // Don't duplicate registered pt_P
          const ptP = this.points.get('pt_P');
          if (ptP && Math.hypot(ptP.x - pt.x, ptP.y - pt.y) <= 2.0) continue;

          const name = `P${pIndex++}`;
          const roundedX = Math.round(pt.x * 10) / 10;
          const roundedY = Math.round(pt.y * 10) / 10;
          knownCoords.push({ x: roundedX, y: roundedY });
          results.push({
            id: `isect_ll_${l1.id}_${l2.id}`,
            name,
            x: roundedX,
            y: roundedY,
            sourceType: 'line_line',
            parentEntityIds: [l1.id, l2.id],
            description: `${l1.name} ∩ ${l2.name}`,
          });
        }
      }
    }

    // 3. Circle × Circle (CC): Intersect distinct circles (e.g. main circumcircle and compass circle)
    for (let i = 0; i < candidateCircles.length; i++) {
      for (let j = i + 1; j < candidateCircles.length; j++) {
        const c1 = candidateCircles[i];
        const c2 = candidateCircles[j];
        const center1 = this.points.get(c1.centerId);
        const center2 = this.points.get(c2.centerId);
        if (!center1 || !center2) continue;

        const ccRes = IntersectionEngine.intersectCircles(
          { center: center1, radius: c1.radius },
          { center: center2, radius: c2.radius }
        );

        if (ccRes.status === 'INTERSECT' || ccRes.status === 'TANGENT_EXTERNAL' || ccRes.status === 'TANGENT_INTERNAL') {
          const sortedPts = [...ccRes.points].sort((a, b) => (Math.abs(a.y - b.y) > 0.1 ? a.y - b.y : a.x - b.x));
          for (let k = 0; k < sortedPts.length; k++) {
            const pt = sortedPts[k];
            if (isCoincident(pt.x, pt.y)) continue;

            const name = `P${pIndex++}`;
            const roundedX = Math.round(pt.x * 10) / 10;
            const roundedY = Math.round(pt.y * 10) / 10;
            knownCoords.push({ x: roundedX, y: roundedY });
            results.push({
              id: `isect_cc_${c1.id}_${c2.id}_${k}`,
              name,
              x: roundedX,
              y: roundedY,
              sourceType: 'circle_circle',
              parentEntityIds: [c1.id, c2.id],
              description: `${c1.name} ∩ ${c2.name}`,
            });
          }
        }
      }
    }

    return results;
  }

  /**
   * Update point coordinates (e.g. from user dragging)
   */
  public updatePoint(pointId: string, x: number, y: number, eventId: string = 'evt_move_point'): void {
    const pt = this.points.get(pointId);
    if (!pt || pt.pinned) return;

    let targetX = x;
    let targetY = y;

    // Canonical vertices strictly constrained to circumcircle S¹ with cyclic order and MIN_VERTEX_ANGLE_GAP in both SCHOOL and RESEARCH modes
    if (['pt_A', 'pt_B', 'pt_C', 'pt_D'].includes(pointId)) {
      const circle = this.circles.get('circle_main');
      const center = circle ? this.points.get(circle.centerId) : null;
      if (circle && center) {
        // Calculate proposed angle
        const proposedAngle = this.normalizeAngle(Math.atan2(targetY - center.y, targetX - center.x));

        // Get neighbors and their current angles
        const { prevId, nextId } = this.getNeighbors(pointId);
        const prevAngle = this.getPointAngle(prevId, center);
        const nextAngle = this.getPointAngle(nextId, center);

        // Compute allowed interval boundary angles with strict MIN_VERTEX_ANGLE_GAP
        const start = this.normalizeAngle(prevAngle + GeometryState.MIN_VERTEX_ANGLE_GAP);
        const end = this.normalizeAngle(nextAngle - GeometryState.MIN_VERTEX_ANGLE_GAP);

        let finalAngle = proposedAngle;
        if (!this.isAngleBetween(proposedAngle, start, end)) {
          // Outside permitted circular interval! Clamp to the closer boundary
          const distToStart = this.circularDistance(proposedAngle, start);
          const distToEnd = this.circularDistance(proposedAngle, end);
          if (distToStart < distToEnd) {
            finalAngle = start;
          } else {
            finalAngle = end;
          }
        }

        targetX = center.x + circle.radius * Math.cos(finalAngle);
        targetY = center.y + circle.radius * Math.sin(finalAngle);
      }
    }

    const roundedX = Math.round(targetX);
    const roundedY = Math.round(targetY);

    // If point coordinates do not actually change, ignore completely (no state mutation, no stateVersion bump, no verification triggered)
    if (pt.x === roundedX && pt.y === roundedY) {
      return;
    }

    pt.x = roundedX;
    pt.y = roundedY;
    this.points.set(pointId, { ...pt });

    // Deterministically recompute dependent geometric constructions
    this.recomputeDependentConstructions(pointId);

    this.notify(eventId);
  }

  /**
   * Rotates all canonical vertices (A, B, C, D) around the circumcircle center pt_O
   * by a relative delta in radians.
   */
  public rotateVertices(deltaRad: number): void {
    const circle = this.circles.get('circle_main');
    const center = circle ? this.points.get(circle.centerId) : null;
    if (!circle || !center) return;

    const vertices = ['pt_A', 'pt_B', 'pt_C', 'pt_D'];
    
    for (const id of vertices) {
      const pt = this.points.get(id);
      if (pt) {
        const currentAngle = Math.atan2(pt.y - center.y, pt.x - center.x);
        const newAngle = currentAngle + deltaRad;
        pt.x = Math.round(center.x + circle.radius * Math.cos(newAngle));
        pt.y = Math.round(center.y + circle.radius * Math.sin(newAngle));
        this.points.set(id, { ...pt });
      }
    }

    // Recompute dependent constructions in the DAG/RelationGraph
    this.recomputeDependentConstructions();
    this.notify('evt_rotate_vertices');
  }

  /**
   * Explicit Auxiliary Construction: ADD_DIAGONAL(quadId, p1Id, p2Id)
   */
  public addDiagonal(quadId: string, p1Id: string, p2Id: string): Segment | null {
    const quad = this.quadrilaterals.get(quadId);
    if (!quad) return null;

    const p1 = this.points.get(p1Id);
    const p2 = this.points.get(p2Id);
    if (!p1 || !p2 || p1Id === p2Id) return null;

    // Check non-adjacency in quad
    const idx1 = quad.vertexIds.indexOf(p1Id);
    const idx2 = quad.vertexIds.indexOf(p2Id);
    if (idx1 === -1 || idx2 === -1) return null;

    const diff = Math.abs(idx1 - idx2);
    if (diff === 1 || diff === 3) {
      // Adjacent vertices form a side, not a diagonal!
      return null;
    }

    const sortedPts = idx1 < idx2 ? [p1, p2] : [p2, p1];
    const sortedIds = idx1 < idx2 ? [p1Id, p2Id] : [p2Id, p1Id];
    const segId = `diag_${sortedPts[0].name}${sortedPts[1].name}`;

    if (this.segments.has(segId)) {
      return this.segments.get(segId)!;
    }

    const diagonal: Segment = {
      id: segId,
      name: `Diagonal ${sortedPts[0].name}${sortedPts[1].name}`,
      p1Id: sortedIds[0],
      p2Id: sortedIds[1],
      segmentType: 'diagonal',
    };

    this.segments.set(segId, diagonal);
    this.dag.register(segId, 'segment', sortedIds, `ADD_DIAGONAL_${sortedPts[0].name}${sortedPts[1].name}`);

    this.notify(`evt_add_diagonal_${sortedPts[0].name}${sortedPts[1].name}`);
    return diagonal;
  }

  /**
   * Explicit Auxiliary Construction: CONSTRUCT_INTERSECTION(seg1Id, seg2Id)
   */
  public addIntersection(id: string, name: string, x: number, y: number, seg1Id: string, seg2Id: string): Point | null {
    if (!this.segments.has(seg1Id) || !this.segments.has(seg2Id)) {
      return null;
    }

    const pt: Point = {
      id,
      name,
      x: Math.round(x),
      y: Math.round(y),
      role: 'intersection',
    };

    this.points.set(id, pt);
    this.dag.register(id, 'point', [seg1Id, seg2Id], 'CONSTRUCT_INTERSECTION');
    this.dependentIntersections.set(id, { pointId: id, seg1Id, seg2Id });

    this.notify(`evt_construct_intersection_${name}`);
    return pt;
  }

  /**
   * Set provenance mode (CANONICAL vs EXTENSION_SCENARIO)
   */
  public setProvenanceMode(mode: ProvenanceOrigin): void {
    this.provenanceMode = mode;
    this.notify(`evt_set_mode_${mode.toLowerCase()}`);
  }

  /**
   * Explicit Auxiliary Construction: Construct BOTH diagonals AC and BD
   */
  public addBothDiagonals(quadId: string = 'quad_ABCD'): { ac: Segment | null; bd: Segment | null } {
    const ac = this.addDiagonal(quadId, 'pt_A', 'pt_C');
    const bd = this.addDiagonal(quadId, 'pt_B', 'pt_D');
    this.notify('evt_add_both_diagonals');
    return { ac, bd };
  }

  /**
   * Explicit Auxiliary Construction: Construct line through point P parallel to segment AB
   */
  public addParallelLine(throughPointId: string, refSegmentId: string): Segment | null {
    const pt = this.points.get(throughPointId);
    const refSeg = this.segments.get(refSegmentId);
    if (!pt || !refSeg) return null;

    const refP1 = this.points.get(refSeg.p1Id);
    const refP2 = this.points.get(refSeg.p2Id);
    if (!refP1 || !refP2) return null;

    const coords = GeometryCore.parallelThroughPoint(pt, refP1, refP2);
    if (!coords) return null;

    const p1Id = `pt_par_${throughPointId}_1`;
    const p2Id = `pt_par_${throughPointId}_2`;

    const p1: Point = { id: p1Id, name: `${pt.name}₁`, x: coords.p1.x, y: coords.p1.y, role: 'auxiliary' };
    const p2: Point = { id: p2Id, name: `${pt.name}₂`, x: coords.p2.x, y: coords.p2.y, role: 'auxiliary' };

    this.points.set(p1.id, p1);
    this.points.set(p2.id, p2);

    const segId = `line_par_${throughPointId}_${refSegmentId}`;
    const seg: Segment = {
      id: segId,
      name: `Parallel || ${refSeg.name} via ${pt.name}`,
      p1Id: p1.id,
      p2Id: p2.id,
      segmentType: 'parallel',
      isInfiniteLine: true,
    };

    this.segments.set(segId, seg);
    this.dag.register(p1.id, 'point', [throughPointId, refSegmentId], 'CONSTRUCT_PARALLEL_ENDPOINT');
    this.dag.register(p2.id, 'point', [throughPointId, refSegmentId], 'CONSTRUCT_PARALLEL_ENDPOINT');
    this.dag.register(segId, 'segment', [throughPointId, refSegmentId], 'CONSTRUCT_PARALLEL');
    this.dependentLines.set(segId, {
      segId,
      lineType: 'parallel',
      throughPointId,
      refSegmentId,
      p1Id: p1.id,
      p2Id: p2.id,
    });

    this.notify(`evt_add_parallel_${throughPointId}`);
    return seg;
  }

  /**
   * Explicit Auxiliary Construction: Construct line through point P perpendicular to segment AB
   */
  public addPerpendicularLine(throughPointId: string, refSegmentId: string): Segment | null {
    const pt = this.points.get(throughPointId);
    const refSeg = this.segments.get(refSegmentId);
    if (!pt || !refSeg) return null;

    const refP1 = this.points.get(refSeg.p1Id);
    const refP2 = this.points.get(refSeg.p2Id);
    if (!refP1 || !refP2) return null;

    const coords = GeometryCore.perpendicularThroughPoint(pt, refP1, refP2);
    if (!coords) return null;

    const p1Id = `pt_perp_${throughPointId}_1`;
    const p2Id = `pt_perp_${throughPointId}_2`;

    const p1: Point = { id: p1Id, name: `${pt.name}⟂₁`, x: coords.p1.x, y: coords.p1.y, role: 'auxiliary' };
    const p2: Point = { id: p2Id, name: `${pt.name}⟂₂`, x: coords.p2.x, y: coords.p2.y, role: 'auxiliary' };

    this.points.set(p1.id, p1);
    this.points.set(p2.id, p2);

    const segId = `line_perp_${throughPointId}_${refSegmentId}`;
    const seg: Segment = {
      id: segId,
      name: `Perpendicular ⟂ ${refSeg.name} via ${pt.name}`,
      p1Id: p1.id,
      p2Id: p2.id,
      segmentType: 'perpendicular',
      isInfiniteLine: true,
    };

    this.segments.set(segId, seg);
    this.dag.register(p1.id, 'point', [throughPointId, refSegmentId], 'CONSTRUCT_PERPENDICULAR_ENDPOINT');
    this.dag.register(p2.id, 'point', [throughPointId, refSegmentId], 'CONSTRUCT_PERPENDICULAR_ENDPOINT');
    this.dag.register(segId, 'segment', [throughPointId, refSegmentId], 'CONSTRUCT_PERPENDICULAR');
    this.dependentLines.set(segId, {
      segId,
      lineType: 'perpendicular',
      throughPointId,
      refSegmentId,
      p1Id: p1.id,
      p2Id: p2.id,
    });

    this.notify(`evt_add_perpendicular_${throughPointId}`);
    return seg;
  }

  /**
   * Free Auxiliary Construction: Add free point on plane
   */
  public addFreePoint(x: number, y: number, name?: string): Point {
    const id = `pt_free_${Date.now()}_${++this.freeIdCounter}`;
    const ptName = name || `P${this.points.size}`;
    const pt: Point = { id, name: ptName, x: Math.round(x), y: Math.round(y), role: 'auxiliary' };
    this.points.set(id, pt);
    this.dag.register(id, 'point', [], 'CONSTRUCT_FREE_POINT');
    this.notify(`evt_add_free_point_${ptName}`);
    return pt;
  }

  /**
   * Remove a free auxiliary point if it has no dependent constructions
   */
  public removeUnusedFreePoint(pointId: string): boolean {
    const pt = this.points.get(pointId);
    if (!pt || pt.role === 'vertex' || pt.role === 'center') return false;

    // Check if any segment, circle, or dependent line uses this point
    for (const seg of this.segments.values()) {
      if (seg.p1Id === pointId || seg.p2Id === pointId) return false;
    }
    for (const circle of this.circles.values()) {
      if (circle.centerId === pointId) return false;
    }

    this.points.delete(pointId);
    this.dag.remove(pointId);
    this.notify(`evt_remove_free_point_${pt.name}`);
    return true;
  }

  /**
   * Free Auxiliary Construction: Add free segment between two points
   */
  public addFreeSegment(p1Id: string, p2Id: string, name?: string): Segment | null {
    const p1 = this.points.get(p1Id);
    const p2 = this.points.get(p2Id);
    if (!p1 || !p2 || p1Id === p2Id) return null;

    const id = `seg_free_${p1.name}_${p2.name}_${Date.now()}_${++this.freeIdCounter}`;
    const segName = name || `${p1.name}${p2.name}`;
    const seg: Segment = { id, name: segName, p1Id, p2Id, segmentType: 'auxiliary' };
    this.segments.set(id, seg);
    this.dag.register(id, 'segment', [p1Id, p2Id], 'CONSTRUCT_FREE_SEGMENT');
    this.notify(`evt_add_free_segment_${segName}`);
    return seg;
  }

  /**
   * Free Auxiliary Construction: Add free line passing through two points
   */
  public addFreeLine(p1Id: string, p2Id: string, name?: string): Segment | null {
    const p1 = this.points.get(p1Id);
    const p2 = this.points.get(p2Id);
    if (!p1 || !p2 || p1Id === p2Id) return null;

    const id = `line_free_${p1.name}_${p2.name}_${Date.now()}_${++this.freeIdCounter}`;
    const lineName = name || `Line(${p1.name}, ${p2.name})`;
    const line: Segment = { id, name: lineName, p1Id, p2Id, segmentType: 'auxiliary', isInfiniteLine: true };
    this.segments.set(id, line);
    this.dag.register(id, 'segment', [p1Id, p2Id], 'CONSTRUCT_FREE_LINE');
    this.notify(`evt_add_free_line_${lineName}`);
    return line;
  }

  /**
   * Free Auxiliary Construction: Add auxiliary circle
   */
  public addFreeCircle(centerId: string, radius: number, name?: string): Circle | null {
    const center = this.points.get(centerId);
    if (!center || radius <= 0) return null;

    const id = `circle_aux_${center.name}_${Date.now()}_${++this.freeIdCounter}`;
    const circleName = name || `Circle(${center.name}, ${Math.round(radius)})`;
    const circle: Circle = { id, name: circleName, centerId, radius: Math.round(radius) };
    this.circles.set(id, circle);
    this.dag.register(id, 'circle', [centerId], 'CONSTRUCT_FREE_CIRCLE');
    this.notify(`evt_add_free_circle_${circle.name}`);
    return circle;
  }

  /**
   * Explicit Auxiliary Construction: Add Compass circle with center and measured radius distance |P1P2|
   */
  public addCompassCircle(centerId: string, radiusPoint1Id: string, radiusPoint2Id: string): Circle | null {
    const center = this.points.get(centerId);
    const p1 = this.points.get(radiusPoint1Id);
    const p2 = this.points.get(radiusPoint2Id);
    if (!center || !p1 || !p2) return null;

    const radius = Math.round(GeometryCore.distance(p1, p2));
    if (radius <= 0) return null;

    const id = `circle_compass_${center.name}_${p1.name}${p2.name}_${Date.now()}`;
    const name = `Compass(⊙${center.name}, |${p1.name}${p2.name}|)`;
    const circle: Circle = { id, name, centerId, radius };

    this.circles.set(id, circle);
    this.dag.register(id, 'circle', [centerId, radiusPoint1Id, radiusPoint2Id], 'CONSTRUCT_COMPASS_CIRCLE');
    this.dependentCircles.set(id, {
      circleId: id,
      centerId,
      radiusPoint1Id,
      radiusPoint2Id,
    });

    this.notify(`evt_add_compass_circle_${center.name}`);
    return circle;
  }

  // ===========================================================================
  // PACKAGE 03: CLASSICAL CONSTRUCTIONS STATE INTEGRATION
  // ===========================================================================

  /**
   * Construct perpendicular bisector of a segment
   */
  public addPerpendicularBisector(segmentId: string): Segment | null {
    const seg = this.segments.get(segmentId);
    if (!seg) return null;

    const pA = this.points.get(seg.p1Id);
    const pB = this.points.get(seg.p2Id);
    if (!pA || !pB) return null;

    const result = GeometryCore.perpendicularBisector(pA, pB);
    if (!result) return null;

    const ts = Date.now();
    const p1Id = `pt_bisect_${pA.name}${pB.name}_1_${ts}`;
    const p2Id = `pt_bisect_${pA.name}${pB.name}_2_${ts}`;
    const mId = `pt_mid_${pA.name}${pB.name}_${ts}`;

    const midPt: Point = { id: mId, name: `M_${pA.name}${pB.name}`, x: result.midpoint.x, y: result.midpoint.y, role: 'auxiliary' };
    const pt1: Point = { id: p1Id, name: `${pA.name}${pB.name}⟂₁`, x: result.p1.x, y: result.p1.y, role: 'auxiliary' };
    const pt2: Point = { id: p2Id, name: `${pA.name}${pB.name}⟂₂`, x: result.p2.x, y: result.p2.y, role: 'auxiliary' };

    this.points.set(midPt.id, midPt);
    this.points.set(pt1.id, pt1);
    this.points.set(pt2.id, pt2);

    const lineId = `line_bisect_${pA.name}${pB.name}_${ts}`;
    const bisectLine: Segment = {
      id: lineId,
      name: `PerpBisector(${seg.name})`,
      p1Id: pt1.id,
      p2Id: pt2.id,
      segmentType: 'perpendicular',
      isInfiniteLine: true,
    };
    this.segments.set(lineId, bisectLine);

    this.dag.registerOperation(
      lineId,
      'PERPENDICULAR_BISECTOR',
      [seg.p1Id, seg.p2Id, segmentId],
      [mId, p1Id, p2Id, lineId]
    );

    this.notify(`evt_add_perp_bisector_${seg.name}`);
    return bisectLine;
  }

  /**
   * Construct angle bisector of angle formed by vertexB, ray1PtA, ray2PtC
   */
  public addAngleBisector(
    vertexId: string,
    ray1PtId: string,
    ray2PtId: string,
    bisectorType: 'INTERNAL' | 'EXTERNAL' = 'INTERNAL'
  ): Segment | null {
    const vB = this.points.get(vertexId);
    const pA = this.points.get(ray1PtId);
    const pC = this.points.get(ray2PtId);
    if (!vB || !pA || !pC) return null;

    const result = GeometryCore.angleBisector(vB, pA, pC, bisectorType);
    if (!result) return null;

    const ts = Date.now();
    const p1Id = `pt_angbisect_${vB.name}_1_${ts}`;
    const p2Id = `pt_angbisect_${vB.name}_2_${ts}`;

    const pt1: Point = { id: p1Id, name: `Bis_${vB.name}₁`, x: result.p1.x, y: result.p1.y, role: 'auxiliary' };
    const pt2: Point = { id: p2Id, name: `Bis_${vB.name}₂`, x: result.p2.x, y: result.p2.y, role: 'auxiliary' };

    this.points.set(pt1.id, pt1);
    this.points.set(pt2.id, pt2);

    const lineId = `line_angbisect_${vB.name}_${bisectorType}_${ts}`;
    const bisectLine: Segment = {
      id: lineId,
      name: `${bisectorType === 'INTERNAL' ? 'Int' : 'Ext'}AngleBisector(∠${pA.name}${vB.name}${pC.name})`,
      p1Id: pt1.id,
      p2Id: pt2.id,
      segmentType: 'auxiliary',
      isInfiniteLine: true,
    };
    this.segments.set(lineId, bisectLine);

    this.dag.registerOperation(
      lineId,
      'ANGLE_BISECTOR',
      [vertexId, ray1PtId, ray2PtId],
      [p1Id, p2Id, lineId],
      { bisectorType }
    );

    this.dependentBisectors.set(lineId, {
      segId: lineId,
      vertexId,
      ray1PointId: ray1PtId,
      ray2PointId: ray2PtId,
      p1Id,
      p2Id,
    });

    this.notify(`evt_add_angle_bisector_${vB.name}`);
    return bisectLine;
  }

  /**
   * Construct circumcircle from three non-collinear points
   */
  public addCircumcircle(p1Id: string, p2Id: string, p3Id: string): Circle | null {
    const pA = this.points.get(p1Id);
    const pB = this.points.get(p2Id);
    const pC = this.points.get(p3Id);
    if (!pA || !pB || !pC) return null;

    const result = GeometryCore.circumcircle(pA, pB, pC);
    if (!result) return null;

    const ts = Date.now();
    const centerId = `pt_circum_${pA.name}${pB.name}${pC.name}_${ts}`;
    const centerPt: Point = {
      id: centerId,
      name: `O_${pA.name}${pB.name}${pC.name}`,
      x: result.center.x,
      y: result.center.y,
      role: 'auxiliary',
    };
    this.points.set(centerId, centerPt);

    const circleId = `circle_circum_${pA.name}${pB.name}${pC.name}_${ts}`;
    const circumCircle: Circle = {
      id: circleId,
      name: `Circumcircle(△${pA.name}${pB.name}${pC.name})`,
      centerId,
      radius: result.radius,
    };
    this.circles.set(circleId, circumCircle);

    this.dag.registerOperation(
      circleId,
      'CIRCUMCIRCLE',
      [p1Id, p2Id, p3Id],
      [centerId, circleId],
      { radius: result.radius }
    );

    this.notify(`evt_add_circumcircle_${circleId}`);
    return circumCircle;
  }

  /**
   * Construct inscribed square in circle given diameter endpoints
   */
  public addInscribedSquare(
    circleId: string,
    diameterP1Id: string,
    diameterP2Id: string
  ): { squareId: string; vertexIds: string[]; segmentIds: string[] } | null {
    const circle = this.circles.get(circleId);
    const p1 = this.points.get(diameterP1Id);
    const p2 = this.points.get(diameterP2Id);
    if (!circle || !p1 || !p2) return null;

    const center = this.points.get(circle.centerId);
    if (!center) return null;

    const result = GeometryCore.inscribedSquare(center, circle.radius, p1, p2);
    if (!result) return null;

    const ts = Date.now();
    const v1Id = `pt_sq_${circle.name}_1_${ts}`;
    const v2Id = `pt_sq_${circle.name}_2_${ts}`;
    const v3Id = `pt_sq_${circle.name}_3_${ts}`;
    const v4Id = `pt_sq_${circle.name}_4_${ts}`;

    const ptV1: Point = { id: v1Id, name: `Sq₁`, x: result.v1.x, y: result.v1.y, role: 'vertex' };
    const ptV2: Point = { id: v2Id, name: `Sq₂`, x: result.v2.x, y: result.v2.y, role: 'vertex' };
    const ptV3: Point = { id: v3Id, name: `Sq₃`, x: result.v3.x, y: result.v3.y, role: 'vertex' };
    const ptV4: Point = { id: v4Id, name: `Sq₄`, x: result.v4.x, y: result.v4.y, role: 'vertex' };

    this.points.set(v1Id, ptV1);
    this.points.set(v2Id, ptV2);
    this.points.set(v3Id, ptV3);
    this.points.set(v4Id, ptV4);

    const s1Id = `seg_sq_${v1Id}_${v2Id}`;
    const s2Id = `seg_sq_${v2Id}_${v3Id}`;
    const s3Id = `seg_sq_${v3Id}_${v4Id}`;
    const s4Id = `seg_sq_${v4Id}_${v1Id}`;

    const seg1: Segment = { id: s1Id, name: 'SqSide₁', p1Id: v1Id, p2Id: v2Id, segmentType: 'side' };
    const seg2: Segment = { id: s2Id, name: 'SqSide₂', p1Id: v2Id, p2Id: v3Id, segmentType: 'side' };
    const seg3: Segment = { id: s3Id, name: 'SqSide₃', p1Id: v3Id, p2Id: v4Id, segmentType: 'side' };
    const seg4: Segment = { id: s4Id, name: 'SqSide₄', p1Id: v4Id, p2Id: v1Id, segmentType: 'side' };

    this.segments.set(s1Id, seg1);
    this.segments.set(s2Id, seg2);
    this.segments.set(s3Id, seg3);
    this.segments.set(s4Id, seg4);

    const squareId = `quad_sq_${circle.name}_${ts}`;
    const quad: Quadrilateral = {
      id: squareId,
      name: `InscribedSquare(${circle.name})`,
      vertexIds: [v1Id, v2Id, v3Id, v4Id],
      boundarySegmentIds: [s1Id, s2Id, s3Id, s4Id],
    };
    this.quadrilaterals.set(squareId, quad);

    this.dag.registerOperation(
      squareId,
      'INSCRIBED_SQUARE',
      [circleId, diameterP1Id, diameterP2Id],
      [v1Id, v2Id, v3Id, v4Id, s1Id, s2Id, s3Id, s4Id, squareId]
    );

    this.notify(`evt_add_inscribed_square_${squareId}`);
    return {
      squareId,
      vertexIds: [v1Id, v2Id, v3Id, v4Id],
      segmentIds: [s1Id, s2Id, s3Id, s4Id],
    };
  }

  /**
   * Construct tangent lines from external point P to circle S(O, R)
   */
  public addTangentsFromExternalPoint(
    pointId: string,
    circleId: string
  ): { t1Id: string; t2Id: string; line1Id: string; line2Id: string } | null {
    const pt = this.points.get(pointId);
    const circle = this.circles.get(circleId);
    if (!pt || !circle) return null;

    const center = this.points.get(circle.centerId);
    if (!center) return null;

    const result = GeometryCore.tangentsFromExternalPoint(pt, center, circle.radius);
    if (!result) return null;

    const ts = Date.now();
    const t1Id = `pt_tan_${pt.name}_1_${ts}`;
    const t2Id = `pt_tan_${pt.name}_2_${ts}`;

    const ptT1: Point = { id: t1Id, name: `T₁(${pt.name})`, x: result.t1.x, y: result.t1.y, role: 'auxiliary' };
    const ptT2: Point = { id: t2Id, name: `T₂(${pt.name})`, x: result.t2.x, y: result.t2.y, role: 'auxiliary' };

    this.points.set(t1Id, ptT1);
    this.points.set(t2Id, ptT2);

    const line1Id = `line_tan_${pt.name}_1_${ts}`;
    const line2Id = `line_tan_${pt.name}_2_${ts}`;

    const line1: Segment = {
      id: line1Id,
      name: `Tangent₁(${pt.name} -> ${circle.name})`,
      p1Id: t1Id,
      p2Id: pointId,
      segmentType: 'auxiliary',
      isInfiniteLine: true,
    };
    const line2: Segment = {
      id: line2Id,
      name: `Tangent₂(${pt.name} -> ${circle.name})`,
      p1Id: t2Id,
      p2Id: pointId,
      segmentType: 'auxiliary',
      isInfiniteLine: true,
    };

    this.segments.set(line1Id, line1);
    this.segments.set(line2Id, line2);

    this.dag.registerOperation(
      line1Id,
      'TANGENT_FROM_EXTERNAL_POINT',
      [pointId, circleId],
      [t1Id, t2Id, line1Id, line2Id]
    );

    this.notify(`evt_add_tangents_${pointId}_${circleId}`);
    return { t1Id, t2Id, line1Id, line2Id };
  }

  /**
   * Construct tangent line at point P lying on circle S(O, R)
   */
  public addTangentAtPoint(pointId: string, circleId: string): Segment | null {
    const pt = this.points.get(pointId);
    const circle = this.circles.get(circleId);
    if (!pt || !circle) return null;

    const center = this.points.get(circle.centerId);
    if (!center) return null;

    const result = GeometryCore.tangentAtPoint(pt, center, circle.radius);
    if (!result) return null;

    const ts = Date.now();
    const p1Id = `pt_tanpt_${pt.name}_1_${ts}`;
    const p2Id = `pt_tanpt_${pt.name}_2_${ts}`;

    const pt1: Point = { id: p1Id, name: `Tan_${pt.name}₁`, x: result.p1.x, y: result.p1.y, role: 'auxiliary' };
    const pt2: Point = { id: p2Id, name: `Tan_${pt.name}₂`, x: result.p2.x, y: result.p2.y, role: 'auxiliary' };

    this.points.set(p1Id, pt1);
    this.points.set(p2Id, pt2);

    const lineId = `line_tanpt_${pt.name}_${ts}`;
    const tanLine: Segment = {
      id: lineId,
      name: `TangentAt(${pt.name}, ${circle.name})`,
      p1Id: pt1.id,
      p2Id: pt2.id,
      segmentType: 'auxiliary',
      isInfiniteLine: true,
    };
    this.segments.set(lineId, tanLine);

    this.dag.registerOperation(
      lineId,
      'TANGENT_AT_POINT',
      [pointId, circleId],
      [p1Id, p2Id, lineId]
    );

    this.notify(`evt_add_tangent_at_${pointId}`);
    return tanLine;
  }
}

