/**
 * Auxiliary Geometry Engine & Dynamic DAG Recomputation
 * R2-05.1 — Canonical Geometry Stand Active Tools
 */

import { Point } from '../../types/geometry';
import { GeometryCore, LineEquation } from '../../kernel/dag/geometryCore';
import {
  AuxiliaryPoint,
  AuxiliarySegment,
  AuxiliaryLine,
  AuxiliaryCircle,
  AuxiliaryMeasurement,
  AuxiliaryState,
  SnapTarget
} from '../types/auxiliaryTypes';

export const EPSILON = 1e-9;
export const CANVAS_BOUNDS = 240;

/** Euclidean distance between two points */
export function euclideanDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1);
}

/** Intersection between two infinite 2D lines defined by (p1, p2) and (p3, p4) */
export function calculateLineIntersection(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  p4: { x: number; y: number }
): { x: number; y: number } | null {
  const denom = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
  if (Math.abs(denom) < EPSILON) {
    return null; // Lines are parallel or coincident
  }

  const cross1 = p1.x * p2.y - p1.y * p2.x;
  const cross2 = p3.x * p4.y - p3.y * p4.x;

  const px = (cross1 * (p3.x - p4.x) - (p1.x - p2.x) * cross2) / denom;
  const py = (cross1 * (p3.y - p4.y) - (p1.y - p2.y) * cross2) / denom;

  return { x: px, y: py };
}

/** Check if point q lies on segment pr */
function onSegment(p: { x: number; y: number }, q: { x: number; y: number }, r: { x: number; y: number }): boolean {
  return (
    q.x <= Math.max(p.x, r.x) + 0.1 &&
    q.x >= Math.min(p.x, r.x) - 0.1 &&
    q.y <= Math.max(p.y, r.y) + 0.1 &&
    q.y >= Math.min(p.y, r.y) - 0.1
  );
}

/** Intersection between two finite 2D segments */
export function calculateSegmentIntersection(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  p4: { x: number; y: number }
): { x: number; y: number } | null {
  const linePt = calculateLineIntersection(p1, p2, p3, p4);
  if (!linePt) return null;

  if (onSegment(p1, linePt, p2) && onSegment(p3, linePt, p4)) {
    return linePt;
  }
  return null;
}

/** Project point P onto infinite line passing through lineP1 and lineP2 */
export function projectPointOnLine(
  p: { x: number; y: number },
  lineP1: { x: number; y: number },
  lineP2: { x: number; y: number }
): { x: number; y: number } {
  const dx = lineP2.x - lineP1.x;
  const dy = lineP2.y - lineP1.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < EPSILON) return { ...lineP1 };

  const t = ((p.x - lineP1.x) * dx + (p.y - lineP1.y) * dy) / lenSq;
  return {
    x: lineP1.x + t * dx,
    y: lineP1.y + t * dy
  };
}

/** Project point P onto finite segment lineP1 -> lineP2 (clamped) */
export function projectPointOnSegment(
  p: { x: number; y: number },
  segP1: { x: number; y: number },
  segP2: { x: number; y: number }
): { x: number; y: number; t: number; distance: number } {
  const dx = segP2.x - segP1.x;
  const dy = segP2.y - segP1.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < EPSILON) {
    const dist = euclideanDistance(p.x, p.y, segP1.x, segP1.y);
    return { x: segP1.x, y: segP1.y, t: 0, distance: dist };
  }

  const rawT = ((p.x - segP1.x) * dx + (p.y - segP1.y) * dy) / lenSq;
  const t = Math.max(0, Math.min(1, rawT));
  const projX = segP1.x + t * dx;
  const projY = segP1.y + t * dy;
  const dist = euclideanDistance(p.x, p.y, projX, projY);
  return { x: projX, y: projY, t, distance: dist };
}

/** Compute visual infinite line endpoints clipped to canvas bounds */
export function computeExtendedLineEndpoints(
  throughPt: { x: number; y: number },
  dirX: number,
  dirY: number,
  bounds: number = CANVAS_BOUNDS
): { x1: number; y1: number; x2: number; y2: number } {
  const len = Math.hypot(dirX, dirY);
  if (len < EPSILON) {
    return {
      x1: throughPt.x - bounds,
      y1: throughPt.y,
      x2: throughPt.x + bounds,
      y2: throughPt.y
    };
  }

  const ux = dirX / len;
  const uy = dirY / len;
  const ext = bounds * 1.8;

  return {
    x1: throughPt.x - ux * ext,
    y1: throughPt.y - uy * ext,
    x2: throughPt.x + ux * ext,
    y2: throughPt.y + uy * ext
  };
}

/**
 * Presentation Helper:
 * Projects a canonical mathematical line (anchorPoint + direction) to visual viewport endpoints.
 * Strictly a presentation concern for SVG rendering; independent of core geometric state.
 */
export function getLineRenderEndpoints(
  line: AuxiliaryLine,
  bounds: number = CANVAS_BOUNDS
): { x1: number; y1: number; x2: number; y2: number } {
  if (line.anchorPoint && line.direction) {
    if (line.type === 'bisector') {
      const ext = bounds * 1.8;
      return {
        x1: line.anchorPoint.x,
        y1: line.anchorPoint.y,
        x2: line.anchorPoint.x + line.direction.dx * ext,
        y2: line.anchorPoint.y + line.direction.dy * ext
      };
    }
    return computeExtendedLineEndpoints(
      line.anchorPoint,
      line.direction.dx,
      line.direction.dy,
      bounds
    );
  }

  // Fallback for precomputed endpoints if present
  if (
    line.x1 !== undefined &&
    line.y1 !== undefined &&
    line.x2 !== undefined &&
    line.y2 !== undefined
  ) {
    return { x1: line.x1, y1: line.y1, x2: line.x2, y2: line.y2 };
  }

  return { x1: 0, y1: 0, x2: 0, y2: 0 };
}

/** Compute parallel line endpoints passing through point */
export function computeParallelLine(
  refP1: { x: number; y: number },
  refP2: { x: number; y: number },
  throughPt: { x: number; y: number },
  bounds: number = CANVAS_BOUNDS
): { x1: number; y1: number; x2: number; y2: number } {
  const dx = refP2.x - refP1.x;
  const dy = refP2.y - refP1.y;
  return computeExtendedLineEndpoints(throughPt, dx, dy, bounds);
}

/** Compute perpendicular line endpoints passing through point */
export function computePerpendicularLine(
  refP1: { x: number; y: number },
  refP2: { x: number; y: number },
  throughPt: { x: number; y: number },
  bounds: number = CANVAS_BOUNDS
): { x1: number; y1: number; x2: number; y2: number } {
  const dx = refP2.x - refP1.x;
  const dy = refP2.y - refP1.y;
  // Perpendicular vector: (-dy, dx)
  return computeExtendedLineEndpoints(throughPt, -dy, dx, bounds);
}

/** Compute angle bisector endpoints */
export function computeAngleBisectorLine(
  armP1: { x: number; y: number },
  vertexP2: { x: number; y: number },
  armP3: { x: number; y: number },
  bounds: number = CANVAS_BOUNDS
): { x1: number; y1: number; x2: number; y2: number } {
  const v1x = armP1.x - vertexP2.x;
  const v1y = armP1.y - vertexP2.y;
  const len1 = Math.hypot(v1x, v1y);

  const v2x = armP3.x - vertexP2.x;
  const v2y = armP3.y - vertexP2.y;
  const len2 = Math.hypot(v2x, v2y);

  if (len1 < EPSILON || len2 < EPSILON) {
    return computeExtendedLineEndpoints(vertexP2, 1, 0, bounds);
  }

  const u1x = v1x / len1;
  const u1y = v1y / len1;
  const u2x = v2x / len2;
  const u2y = v2y / len2;

  let bx = u1x + u2x;
  let by = u1y + u2y;
  const bLen = Math.hypot(bx, by);

  if (bLen < EPSILON) {
    // Vectors are directly opposite (180 deg) -> bisector is perpendicular
    bx = -u1y;
    by = u1x;
  } else {
    bx /= bLen;
    by /= bLen;
  }

  // Bisector ray from vertex outward: endpoints (vertex, vertex + ext * b)
  const ext = bounds * 1.8;
  return {
    x1: vertexP2.x,
    y1: vertexP2.y,
    x2: vertexP2.x + bx * ext,
    y2: vertexP2.y + by * ext
  };
}

/**
 * Snapping Engine:
 * Finds the closest snapping candidate to (worldX, worldY).
 */
export function findSnapTarget(
  worldX: number,
  worldY: number,
  canonicalVertices: readonly { id: string; cartesian: Point }[],
  circumcircle: { center: Point; radius: number },
  auxiliaryPoints: readonly AuxiliaryPoint[],
  chords: readonly { id: string; p1: Point; p2: Point }[],
  auxiliarySegments: readonly AuxiliarySegment[],
  threshold: number = 14
): SnapTarget | null {
  let closest: SnapTarget | null = null;
  let minDistance = threshold;

  // 1. Center O
  const distCenter = euclideanDistance(worldX, worldY, circumcircle.center.x, circumcircle.center.y);
  if (distCenter <= minDistance) {
    minDistance = distCenter;
    closest = {
      x: circumcircle.center.x,
      y: circumcircle.center.y,
      entityId: circumcircle.center.id,
      entityType: 'center',
      label: 'Центр O',
      distance: distCenter
    };
  }

  // 2. Canonical Vertices (A, B, C, D)
  for (const v of canonicalVertices) {
    const d = euclideanDistance(worldX, worldY, v.cartesian.x, v.cartesian.y);
    if (d <= minDistance) {
      minDistance = d;
      closest = {
        x: v.cartesian.x,
        y: v.cartesian.y,
        entityId: v.id,
        entityType: 'vertex',
        label: `Вершина ${v.id}`,
        distance: d
      };
    }
  }

  // 3. Auxiliary Points (P, E, F, etc.)
  for (const ap of auxiliaryPoints) {
    const d = euclideanDistance(worldX, worldY, ap.x, ap.y);
    if (d <= minDistance) {
      minDistance = d;
      closest = {
        x: ap.x,
        y: ap.y,
        entityId: ap.id,
        entityType: 'point',
        label: ap.label,
        distance: d
      };
    }
  }

  // If a discrete point (center, canonical vertex, auxiliary point) was matched within threshold,
  // return it with top priority over continuous curves (circumference or chords).
  if (closest) {
    return closest;
  }

  // 4. Circumcircle boundary (Snap to circumference only if not snapping to a point)
  const distFromCenter = euclideanDistance(worldX, worldY, circumcircle.center.x, circumcircle.center.y);
  const diffCircle = Math.abs(distFromCenter - circumcircle.radius);
  if (diffCircle <= minDistance && diffCircle <= 10 && distFromCenter > EPSILON) {
    // Project directly onto circle
    const angle = Math.atan2(worldY - circumcircle.center.y, worldX - circumcircle.center.x);
    const circleX = circumcircle.center.x + circumcircle.radius * Math.cos(angle);
    const circleY = circumcircle.center.y + circumcircle.radius * Math.sin(angle);
    minDistance = diffCircle;
    closest = {
      x: circleX,
      y: circleY,
      entityType: 'circle',
      label: 'Описанная окружность S¹',
      distance: diffCircle
    };
  }

  // 5. Chords & Auxiliary Segments
  for (const chord of chords) {
    const proj = projectPointOnSegment({ x: worldX, y: worldY }, chord.p1, chord.p2);
    if (proj.distance <= minDistance && proj.distance <= 8) {
      minDistance = proj.distance;
      closest = {
        x: proj.x,
        y: proj.y,
        entityId: chord.id,
        entityType: 'segment',
        label: `Отрезок ${chord.id}`,
        distance: proj.distance
      };
    }
  }

  // 6. Auxiliary Segments
  for (const seg of auxiliarySegments) {
    const p1 = auxiliaryPoints.find((p) => p.id === seg.p1Id) ||
      canonicalVertices.find((v) => v.id === seg.p1Id)?.cartesian;
    const p2 = auxiliaryPoints.find((p) => p.id === seg.p2Id) ||
      canonicalVertices.find((v) => v.id === seg.p2Id)?.cartesian;
    if (p1 && p2) {
      const proj = projectPointOnSegment({ x: worldX, y: worldY }, p1, p2);
      if (proj.distance <= minDistance && proj.distance <= 8) {
        minDistance = proj.distance;
        closest = {
          x: proj.x,
          y: proj.y,
          entityId: seg.id,
          entityType: 'segment',
          label: seg.label,
          distance: proj.distance
        };
      }
    }
  }

  return closest;
}

/**
 * Dynamic DAG Recomputation:
 * Updates coordinates of all dependent auxiliary entities when canonical vertices move!
 */
export function recomputeAuxiliaryGeometry(
  auxState: AuxiliaryState,
  canonicalPointsMap: Map<string, { x: number; y: number }>,
  circumcircle: { center: Point; radius: number }
): AuxiliaryState {
  // Working map of all points (canonical + auxiliary)
  const allPoints = new Map<string, { x: number; y: number }>(canonicalPointsMap);

  const resolveLineLikeEndpoints = (id: string): { p1: { x: number; y: number }; p2: { x: number; y: number } } | null => {
    // 1. Check canonical chords
    const chordMatch = id.match(/^chord_([A-D])([A-D])$/);
    if (chordMatch) {
      const v1 = chordMatch[1];
      const v2 = chordMatch[2];
      const p1 = allPoints.get(v1);
      const p2 = allPoints.get(v2);
      if (p1 && p2) return { p1, p2 };
    }
    
    // 2. Check auxiliary segments
    const seg = auxState.segments.find((s) => s.id === id);
    if (seg) {
      const p1 = allPoints.get(seg.p1Id);
      const p2 = allPoints.get(seg.p2Id);
      if (p1 && p2) return { p1, p2 };
    }

    // 3. Check auxiliary lines
    const line = auxState.lines.find((l) => l.id === id);
    if (line) {
      // Recompute the line's mathematical coordinates on-the-fly to get the absolute freshest state
      const throughPt = allPoints.get(line.throughPointId);
      if (throughPt) {
        if (line.type === 'parallel' && line.referenceSegmentId) {
          const refSeg = auxState.segments.find((s) => s.id === line.referenceSegmentId);
          let refP1 = refSeg ? allPoints.get(refSeg.p1Id) : null;
          let refP2 = refSeg ? allPoints.get(refSeg.p2Id) : null;
          if (!refP1 || !refP2) {
            // Check if reference is a chord
            const m = line.referenceSegmentId.match(/chord_([A-D])([A-D])/);
            if (m) {
              refP1 = allPoints.get(m[1]);
              refP2 = allPoints.get(m[2]);
            }
          }
          if (refP1 && refP2) {
            const dx = refP2.x - refP1.x;
            const dy = refP2.y - refP1.y;
            const len = Math.hypot(dx, dy);
            const ux = len > EPSILON ? dx / len : 1;
            const uy = len > EPSILON ? dy / len : 0;
            return {
              p1: { x: throughPt.x, y: throughPt.y },
              p2: { x: throughPt.x + ux, y: throughPt.y + uy }
            };
          }
        } else if (line.type === 'perpendicular' && line.referenceSegmentId) {
          const refSeg = auxState.segments.find((s) => s.id === line.referenceSegmentId);
          let refP1 = refSeg ? allPoints.get(refSeg.p1Id) : null;
          let refP2 = refSeg ? allPoints.get(refSeg.p2Id) : null;
          if (!refP1 || !refP2) {
            const m = line.referenceSegmentId.match(/chord_([A-D])([A-D])/);
            if (m) {
              refP1 = allPoints.get(m[1]);
              refP2 = allPoints.get(m[2]);
            }
          }
          if (refP1 && refP2) {
            const dx = refP2.x - refP1.x;
            const dy = refP2.y - refP1.y;
            const len = Math.hypot(dx, dy);
            const ux = len > EPSILON ? -dy / len : 0;
            const uy = len > EPSILON ? dx / len : 1;
            return {
              p1: { x: throughPt.x, y: throughPt.y },
              p2: { x: throughPt.x + ux, y: throughPt.y + uy }
            };
          }
        } else if (line.type === 'bisector' && line.point1Id && line.point2Id && line.point3Id) {
          const arm1 = allPoints.get(line.point1Id);
          const vertex = allPoints.get(line.point2Id);
          const arm2 = allPoints.get(line.point3Id);
          if (arm1 && vertex && arm2) {
            const bis = GeometryCore.angleBisector(
              { id: line.point1Id, x: arm1.x, y: arm1.y },
              { id: line.point2Id, x: vertex.x, y: vertex.y },
              { id: line.point3Id, x: arm2.x, y: arm2.y }
            );
            return {
              p1: { x: vertex.x, y: vertex.y },
              p2: { x: vertex.x + bis.dirX, y: vertex.y + bis.dirY }
            };
          }
        } else if (line.type === 'two_points' && line.point1Id && line.point2Id) {
          const p1 = allPoints.get(line.point1Id);
          const p2 = allPoints.get(line.point2Id);
          if (p1 && p2) {
            return { p1, p2 };
          }
        }
      }
      
      // Fallback to static stored anchor & direction
      if (line.anchorPoint && line.direction) {
        return {
          p1: { x: line.anchorPoint.x, y: line.anchorPoint.y },
          p2: {
            x: line.anchorPoint.x + line.direction.dx,
            y: line.anchorPoint.y + line.direction.dy
          }
        };
      }
    }

    return null;
  };

  // 1. Recompute auxiliary points (intersections & constrained points)
  const updatedPoints: AuxiliaryPoint[] = auxState.points.map((pt) => {
    if (pt.type === 'intersection' && pt.parentIds && pt.parentIds.length === 2) {
      // Parents are two segment or line IDs
      const seg1Id = pt.parentIds[0];
      const seg2Id = pt.parentIds[1];

      const parent1 = resolveLineLikeEndpoints(seg1Id);
      const parent2 = resolveLineLikeEndpoints(seg2Id);

      console.log(`[recompute debug] pt=${pt.id}, seg1Id=${seg1Id}, seg2Id=${seg2Id}, parent1=${JSON.stringify(parent1)}, parent2=${JSON.stringify(parent2)}`);

      if (parent1 && parent2) {
        const inter = calculateLineIntersection(parent1.p1, parent1.p2, parent2.p1, parent2.p2);
        console.log(`[recompute debug] calculated intersection inter=${JSON.stringify(inter)}`);
        if (inter) {
          allPoints.set(pt.id, { x: inter.x, y: inter.y });
          return {
            ...pt,
            x: inter.x,
            y: inter.y
          };
        }
      }
    } else if (pt.type === 'on_circle') {
      // Keep on circumcircle
      const angle = Math.atan2(pt.y - circumcircle.center.y, pt.x - circumcircle.center.x);
      const nx = circumcircle.center.x + circumcircle.radius * Math.cos(angle);
      const ny = circumcircle.center.y + circumcircle.radius * Math.sin(angle);
      allPoints.set(pt.id, { x: nx, y: ny });
      return {
        ...pt,
        x: nx,
        y: ny
      };
    }

    allPoints.set(pt.id, { x: pt.x, y: pt.y });
    return pt;
  });

  // 2. Recompute auxiliary segments (length recalculation)
  const updatedSegments: AuxiliarySegment[] = auxState.segments.map((seg) => {
    const p1 = allPoints.get(seg.p1Id);
    const p2 = allPoints.get(seg.p2Id);
    const length = p1 && p2 ? euclideanDistance(p1.x, p1.y, p2.x, p2.y) : seg.lengthMm;
    return {
      ...seg,
      lengthMm: length
    };
  });

  // 3. Recompute auxiliary lines (parallel, perpendicular, bisector, two_points)
  const updatedLines: AuxiliaryLine[] = auxState.lines.map((line) => {
    const throughPt = allPoints.get(line.throughPointId);

    if (line.type === 'parallel' && line.referenceSegmentId && throughPt) {
      const refSeg = updatedSegments.find((s) => s.id === line.referenceSegmentId);
      if (refSeg) {
        const refP1 = allPoints.get(refSeg.p1Id);
        const refP2 = allPoints.get(refSeg.p2Id);
        if (refP1 && refP2) {
          const dx = refP2.x - refP1.x;
          const dy = refP2.y - refP1.y;
          const len = Math.hypot(dx, dy);
          const ux = len > EPSILON ? dx / len : 1;
          const uy = len > EPSILON ? dy / len : 0;
          const equation = GeometryCore.parallelLine(
            { id: refSeg.p1Id, x: refP1.x, y: refP1.y },
            { id: refSeg.p2Id, x: refP2.x, y: refP2.y },
            { id: line.throughPointId, x: throughPt.x, y: throughPt.y }
          );
          const anchorPoint = { x: throughPt.x, y: throughPt.y };
          const direction = { dx: ux, dy: uy };
          return {
            ...line,
            anchorPoint,
            direction,
            equation
          };
        }
      }
    } else if (line.type === 'perpendicular' && line.referenceSegmentId && throughPt) {
      const refSeg = updatedSegments.find((s) => s.id === line.referenceSegmentId);
      if (refSeg) {
        const refP1 = allPoints.get(refSeg.p1Id);
        const refP2 = allPoints.get(refSeg.p2Id);
        if (refP1 && refP2) {
          const dx = refP2.x - refP1.x;
          const dy = refP2.y - refP1.y;
          const len = Math.hypot(dx, dy);
          const ux = len > EPSILON ? -dy / len : 0;
          const uy = len > EPSILON ? dx / len : 1;
          const equation = GeometryCore.perpendicularLine(
            { id: refSeg.p1Id, x: refP1.x, y: refP1.y },
            { id: refSeg.p2Id, x: refP2.x, y: refP2.y },
            { id: line.throughPointId, x: throughPt.x, y: throughPt.y }
          );
          const anchorPoint = { x: throughPt.x, y: throughPt.y };
          const direction = { dx: ux, dy: uy };
          return {
            ...line,
            anchorPoint,
            direction,
            equation
          };
        }
      }
    } else if (line.type === 'bisector' && line.point1Id && line.point2Id && line.point3Id) {
      const arm1 = allPoints.get(line.point1Id);
      const vertex = allPoints.get(line.point2Id);
      const arm2 = allPoints.get(line.point3Id);
      if (arm1 && vertex && arm2) {
        const bisector = GeometryCore.angleBisector(
          { id: line.point1Id, x: arm1.x, y: arm1.y },
          { id: line.point2Id, x: vertex.x, y: vertex.y },
          { id: line.point3Id, x: arm2.x, y: arm2.y }
        );
        const anchorPoint = { x: vertex.x, y: vertex.y };
        const direction = { dx: bisector.dirX, dy: bisector.dirY };
        return {
          ...line,
          anchorPoint,
          direction
        };
      }
    } else if (line.type === 'two_points' && line.point1Id && line.point2Id) {
      const p1 = allPoints.get(line.point1Id);
      const p2 = allPoints.get(line.point2Id);
      if (p1 && p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.hypot(dx, dy);
        const ux = len > EPSILON ? dx / len : 1;
        const uy = len > EPSILON ? dy / len : 0;
        const equation = GeometryCore.lineFromPoints(
          { id: line.point1Id, x: p1.x, y: p1.y },
          { id: line.point2Id, x: p2.x, y: p2.y }
        );
        const anchorPoint = { x: p1.x, y: p1.y };
        const direction = { dx: ux, dy: uy };
        return {
          ...line,
          anchorPoint,
          direction,
          equation
        };
      }
    }

    return line;
  });

  // 4. Recompute compass circles (radius and center dynamic tracking)
  const updatedCircles: AuxiliaryCircle[] = auxState.circles.map((circ) => {
    let radius = circ.radius;
    if (circ.type === 'compass' && circ.radiusPoint1Id && circ.radiusPoint2Id) {
      const rp1 = allPoints.get(circ.radiusPoint1Id);
      const rp2 = allPoints.get(circ.radiusPoint2Id);
      if (rp1 && rp2) {
        radius = euclideanDistance(rp1.x, rp1.y, rp2.x, rp2.y);
      }
    }
    return {
      ...circ,
      radius
    };
  });

  // 5. Recompute measurements
  const updatedMeasurements: AuxiliaryMeasurement[] = auxState.measurements.map((m) => {
    const p1 = allPoints.get(m.p1Id);
    const p2 = allPoints.get(m.p2Id);
    const dist = p1 && p2 ? euclideanDistance(p1.x, p1.y, p2.x, p2.y) : m.distanceMm;
    return {
      ...m,
      distanceMm: dist
    };
  });

  return {
    ...auxState,
    points: updatedPoints,
    segments: updatedSegments,
    lines: updatedLines,
    circles: updatedCircles,
    measurements: updatedMeasurements
  };
}

/** Initial empty auxiliary state */
export function createEmptyAuxiliaryState(): AuxiliaryState {
  return {
    points: [],
    segments: [],
    lines: [],
    circles: [],
    measurements: [],
    selectedEntityId: null,
    selectedEntityType: null
  };
}
