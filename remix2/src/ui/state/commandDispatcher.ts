/**
 * Headless Semantic Command Dispatcher
 * R2 — Common Command Execution Layer for Human UI and Autonomous Agent
 * 
 * Architecture Pipeline:
 * [Human UI Interaction]  ──┐
 *                           ├──> [SemanticCommand] ──> [commandDispatcher] ──> [Auxiliary State / DAG]
 * [Autonomous AI Agent]   ──┘
 * 
 * Headless: Fully executable in Node/TSX environment without Canvas, React DOM, or PointerEvents.
 */

import { Point, CyclicMutationDraft } from '../../types/geometry';
import { GeometryCore, LineEquation } from '../../kernel/dag/geometryCore';
import { UniversalGeometryState } from '../../kernel/state/geometryState';
import {
  AuxiliaryPoint,
  AuxiliarySegment,
  AuxiliaryLine,
  AuxiliaryCircle,
  AuxiliaryMeasurement,
  AuxiliaryState
} from '../types/auxiliaryTypes';
import {
  SemanticCommand,
  SemanticCommandType
} from '../types/semanticCommands';
import {
  euclideanDistance,
  calculateLineIntersection,
  projectPointOnSegment,
  recomputeAuxiliaryGeometry
} from './auxiliaryEngine';
import {
  CheckpointBuffer,
  getDefaultCheckpointBuffer,
  CheckpointSlotInfo,
  CheckpointSlotId
} from '../../research/checkpointBuffer';
import { GeometryStateSnapshot } from '../../types/snapshot';
import { createGeometryStateSnapshot } from '../../research/index';

export type CommandExecutionStatus =
  | 'SUCCESS'
  | 'INVALID_COMMAND'
  | 'MISSING_ENTITY'
  | 'INVALID_GEOMETRY'
  | 'UNSUPPORTED'
  | 'ERROR';

export interface CommandExecutionContext {
  readonly canonicalVertices: readonly {
    readonly id: string;
    readonly cartesian: Point;
    readonly label?: string;
  }[];
  readonly circumcircle: {
    readonly center: Point;
    readonly radius: number;
  };
  readonly baseChords?: readonly {
    readonly id: string;
    readonly p1: Point;
    readonly p2: Point;
    readonly label?: string;
  }[];
  readonly auxiliaryState: AuxiliaryState;
  readonly bounds?: number;
  readonly geometryState?: UniversalGeometryState;
  readonly checkpointBuffer?: CheckpointBuffer;
}

export interface EntityMeasurementResult {
  readonly entityId: string;
  readonly entityType: string;
  readonly value?: number;
  readonly units?: string;
  readonly stateVersion: number;
  readonly status: 'SUCCESS' | 'MEASUREMENT_UNAVAILABLE' | 'ENTITY_NOT_FOUND';
}

export interface CommandExecutionResult {
  readonly status: CommandExecutionStatus;
  readonly commandType: SemanticCommandType;
  readonly success: boolean;
  readonly createdEntityIds: readonly string[];
  readonly affectedEntityIds: readonly string[];
  readonly updatedAuxiliaryState: AuxiliaryState;
  readonly updatedGeometryState?: UniversalGeometryState;
  readonly message?: string;
  readonly observation?: {
    readonly distanceMm?: number;
    readonly intersectionPoint?: Point;
    readonly radius?: number;
  };
  readonly checkpointInfo?: CheckpointSlotInfo | readonly CheckpointSlotInfo[];
  readonly snapshot?: GeometryStateSnapshot;
  readonly entityMeasurement?: EntityMeasurementResult;
}

/**
 * Resolves any point by ID from canonical vertices, center O, or auxiliary points.
 */
export function resolvePoint(id: string, ctx: CommandExecutionContext): Point | null {
  if (id === 'O' || id === ctx.circumcircle.center.id) {
    return ctx.circumcircle.center;
  }
  const canonical = ctx.canonicalVertices.find((v) => v.id === id);
  if (canonical) {
    return canonical.cartesian;
  }
  const auxPt = ctx.auxiliaryState.points.find((p) => p.id === id);
  if (auxPt) {
    return { id: auxPt.id, x: auxPt.x, y: auxPt.y };
  }
  return null;
}

/**
 * Resolves a readable label for a point.
 */
export function resolvePointLabel(id: string, ctx: CommandExecutionContext): string {
  if (id === 'O' || id === ctx.circumcircle.center.id) return 'O';
  const canonical = ctx.canonicalVertices.find((v) => v.id === id);
  if (canonical) return canonical.label || canonical.id;
  const auxPt = ctx.auxiliaryState.points.find((p) => p.id === id);
  if (auxPt) return auxPt.label || auxPt.id;
  return id;
}

/**
 * Resolves a segment, chord, or line by ID into two endpoints { p1, p2 }.
 */
export function resolveSegmentOrLine(
  id: string,
  ctx: CommandExecutionContext
): { p1: Point; p2: Point; label?: string } | null {
  // 1. Check base chords
  if (ctx.baseChords) {
    const chord = ctx.baseChords.find(
      (c) => c.id === id || c.id === `chord_${id}` || id.includes(c.id)
    );
    if (chord) {
      return { p1: chord.p1, p2: chord.p2, label: chord.label || chord.id };
    }
  }

  // 2. Check auxiliary segments
  const auxSeg = ctx.auxiliaryState.segments.find((s) => s.id === id);
  if (auxSeg) {
    const p1 = resolvePoint(auxSeg.p1Id, ctx);
    const p2 = resolvePoint(auxSeg.p2Id, ctx);
    if (p1 && p2) {
      return { p1, p2, label: auxSeg.label };
    }
  }

  // 3. Check auxiliary lines
  const auxLine = ctx.auxiliaryState.lines.find((l) => l.id === id);
  if (auxLine) {
    if (auxLine.anchorPoint && auxLine.direction) {
      return {
        p1: { id: `${auxLine.id}_p1`, x: auxLine.anchorPoint.x, y: auxLine.anchorPoint.y },
        p2: {
          id: `${auxLine.id}_p2`,
          x: auxLine.anchorPoint.x + auxLine.direction.dx,
          y: auxLine.anchorPoint.y + auxLine.direction.dy
        },
        label: auxLine.label
      };
    }
    return {
      p1: { id: `${auxLine.id}_p1`, x: auxLine.x1 ?? 0, y: auxLine.y1 ?? 0 },
      p2: { id: `${auxLine.id}_p2`, x: auxLine.x2 ?? 0, y: auxLine.y2 ?? 0 },
      label: auxLine.label
    };
  }

  return null;
}

/**
 * Headless Semantic Command Dispatcher
 * Dispatches and executes an authorized SemanticCommand against the current geometric context.
 */
export function dispatchSemanticCommand(
  command: SemanticCommand,
  ctx: CommandExecutionContext
): CommandExecutionResult {
  const currentAux = ctx.auxiliaryState;

  switch (command.type) {
    // ============================================================
    // 1. SELECT COMMAND
    // ============================================================
    case 'SELECT': {
      const updatedAux: AuxiliaryState = {
        ...currentAux,
        selectedEntityId: command.targetId,
        selectedEntityType: command.targetType || (command.targetId ? 'entity' : null)
      };
      return {
        status: 'SUCCESS',
        commandType: 'SELECT',
        success: true,
        createdEntityIds: [],
        affectedEntityIds: command.targetId ? [command.targetId] : [],
        updatedAuxiliaryState: updatedAux,
        message: command.targetId ? `Selected ${command.targetId}` : 'Selection cleared'
      };
    }

    // ============================================================
    // 2. CONSTRUCT_POINT COMMAND
    // ============================================================
    case 'CONSTRUCT_POINT': {
      let finalX = command.x;
      let finalY = command.y;

      if (command.pointType === 'on_circle') {
        const angle = Math.atan2(
          command.y - ctx.circumcircle.center.y,
          command.x - ctx.circumcircle.center.x
        );
        finalX = ctx.circumcircle.center.x + ctx.circumcircle.radius * Math.cos(angle);
        finalY = ctx.circumcircle.center.y + ctx.circumcircle.radius * Math.sin(angle);
      } else if (command.pointType === 'on_segment' && command.parentId) {
        const seg = resolveSegmentOrLine(command.parentId, ctx);
        if (seg) {
          const proj = projectPointOnSegment({ x: command.x, y: command.y }, seg.p1, seg.p2);
          finalX = proj.x;
          finalY = proj.y;
        }
      }

      const ptId = `pt_${Date.now().toString().slice(-4)}_${currentAux.points.length + 1}`;
      const newPt: AuxiliaryPoint = {
        id: ptId,
        label: `P${currentAux.points.length + 1}`,
        x: finalX,
        y: finalY,
        type: command.pointType,
        parentIds: command.parentId ? [command.parentId] : undefined,
        color: '#38bdf8'
      };

      const updatedAux: AuxiliaryState = {
        ...currentAux,
        points: [...currentAux.points, newPt],
        selectedEntityId: ptId,
        selectedEntityType: 'point'
      };

      return {
        status: 'SUCCESS',
        commandType: 'CONSTRUCT_POINT',
        success: true,
        createdEntityIds: [ptId],
        affectedEntityIds: [ptId],
        updatedAuxiliaryState: updatedAux,
        message: `Point ${newPt.label} created at (${finalX.toFixed(1)}, ${finalY.toFixed(1)})`
      };
    }

    // ============================================================
    // 3. CONSTRUCT_SEGMENT COMMAND
    // ============================================================
    case 'CONSTRUCT_SEGMENT': {
      if (command.p1Id === command.p2Id) {
        return {
          status: 'INVALID_GEOMETRY',
          commandType: 'CONSTRUCT_SEGMENT',
          success: false,
          createdEntityIds: [],
          affectedEntityIds: [],
          updatedAuxiliaryState: currentAux,
          message: 'Cannot connect point to itself'
        };
      }

      const p1 = resolvePoint(command.p1Id, ctx);
      const p2 = resolvePoint(command.p2Id, ctx);

      if (!p1 || !p2) {
        return {
          status: 'MISSING_ENTITY',
          commandType: 'CONSTRUCT_SEGMENT',
          success: false,
          createdEntityIds: [],
          affectedEntityIds: [],
          updatedAuxiliaryState: currentAux,
          message: `Missing point entity: ${!p1 ? command.p1Id : command.p2Id}`
        };
      }

      const length = euclideanDistance(p1.x, p1.y, p2.x, p2.y);
      const segId = `seg_${command.p1Id}_${command.p2Id}`;
      const label = `${resolvePointLabel(command.p1Id, ctx)}${resolvePointLabel(command.p2Id, ctx)}`;

      const newSeg: AuxiliarySegment = {
        id: segId,
        label,
        p1Id: command.p1Id,
        p2Id: command.p2Id,
        type: 'segment',
        lengthMm: length,
        color: '#38bdf8'
      };

      const updatedAux: AuxiliaryState = {
        ...currentAux,
        segments: [...currentAux.segments.filter((s) => s.id !== segId), newSeg]
      };

      return {
        status: 'SUCCESS',
        commandType: 'CONSTRUCT_SEGMENT',
        success: true,
        createdEntityIds: [segId],
        affectedEntityIds: [segId, command.p1Id, command.p2Id],
        updatedAuxiliaryState: updatedAux,
        message: `Segment ${label} created (length: ${length.toFixed(1)} mm)`,
        observation: { distanceMm: length }
      };
    }

    // ============================================================
    // 4. MEASURE_DISTANCE COMMAND
    // ============================================================
    case 'MEASURE_DISTANCE': {
      const p1 = resolvePoint(command.p1Id, ctx);
      const p2 = resolvePoint(command.p2Id, ctx);

      if (!p1 || !p2) {
        return {
          status: 'MISSING_ENTITY',
          commandType: 'MEASURE_DISTANCE',
          success: false,
          createdEntityIds: [],
          affectedEntityIds: [],
          updatedAuxiliaryState: currentAux,
          message: `Missing point entity: ${!p1 ? command.p1Id : command.p2Id}`
        };
      }

      const dist = euclideanDistance(p1.x, p1.y, p2.x, p2.y);
      const measId = `meas_${command.p1Id}_${command.p2Id}`;
      const label = `d(${resolvePointLabel(command.p1Id, ctx)}, ${resolvePointLabel(command.p2Id, ctx)})`;

      const measurement: AuxiliaryMeasurement = {
        id: measId,
        p1Id: command.p1Id,
        p2Id: command.p2Id,
        distanceMm: dist,
        label
      };

      const updatedAux: AuxiliaryState = {
        ...currentAux,
        measurements: [...currentAux.measurements.filter((m) => m.id !== measId), measurement]
      };

      return {
        status: 'SUCCESS',
        commandType: 'MEASURE_DISTANCE',
        success: true,
        createdEntityIds: [measId],
        affectedEntityIds: [measId, command.p1Id, command.p2Id],
        updatedAuxiliaryState: updatedAux,
        message: `Distance ${label} = ${dist.toFixed(1)} mm`,
        observation: { distanceMm: dist }
      };
    }

    // ============================================================
    // 5. CONSTRUCT_COMPASS COMMAND
    // ============================================================
    case 'CONSTRUCT_COMPASS': {
      const center = resolvePoint(command.centerId, ctx);
      if (!center) {
        return {
          status: 'MISSING_ENTITY',
          commandType: 'CONSTRUCT_COMPASS',
          success: false,
          createdEntityIds: [],
          affectedEntityIds: [],
          updatedAuxiliaryState: currentAux,
          message: `Missing center point: ${command.centerId}`
        };
      }

      let radius = command.radius;
      if (command.radiusPointId) {
        const radiusPt = resolvePoint(command.radiusPointId, ctx);
        if (!radiusPt) {
          return {
            status: 'MISSING_ENTITY',
            commandType: 'CONSTRUCT_COMPASS',
            success: false,
            createdEntityIds: [],
            affectedEntityIds: [],
            updatedAuxiliaryState: currentAux,
            message: `Missing radius opening point: ${command.radiusPointId}`
          };
        }
        radius = euclideanDistance(center.x, center.y, radiusPt.x, radiusPt.y);
      }

      if (radius < 1e-4 || !isFinite(radius)) {
        return {
          status: 'INVALID_GEOMETRY',
          commandType: 'CONSTRUCT_COMPASS',
          success: false,
          createdEntityIds: [],
          affectedEntityIds: [],
          updatedAuxiliaryState: currentAux,
          message: 'Compass radius must be positive'
        };
      }

      const circId = `circ_compass_${command.centerId}_${Math.round(radius)}`;
      const compassCircle: AuxiliaryCircle = {
        id: circId,
        label: `Циркуль(R=${radius.toFixed(1)} мм)`,
        type: 'compass',
        centerPointId: command.centerId,
        radiusPoint1Id: command.centerId,
        radiusPoint2Id: command.radiusPointId,
        radius,
        color: '#ec4899'
      };

      const updatedAux: AuxiliaryState = {
        ...currentAux,
        circles: [...currentAux.circles, compassCircle]
      };

      return {
        status: 'SUCCESS',
        commandType: 'CONSTRUCT_COMPASS',
        success: true,
        createdEntityIds: [circId],
        affectedEntityIds: [circId, command.centerId],
        updatedAuxiliaryState: updatedAux,
        message: `Compass circle committed (center: ${command.centerId}, R: ${radius.toFixed(1)} mm)`,
        observation: { radius }
      };
    }

    // ============================================================
    // 6. CONSTRUCT_LINE COMMAND
    // ============================================================
    case 'CONSTRUCT_LINE': {
      if (command.p1Id === command.p2Id) {
        return {
          status: 'INVALID_GEOMETRY',
          commandType: 'CONSTRUCT_LINE',
          success: false,
          createdEntityIds: [],
          affectedEntityIds: [],
          updatedAuxiliaryState: currentAux,
          message: 'Two distinct points required to construct line'
        };
      }

      const p1 = resolvePoint(command.p1Id, ctx);
      const p2 = resolvePoint(command.p2Id, ctx);

      if (!p1 || !p2) {
        return {
          status: 'MISSING_ENTITY',
          commandType: 'CONSTRUCT_LINE',
          success: false,
          createdEntityIds: [],
          affectedEntityIds: [],
          updatedAuxiliaryState: currentAux,
          message: `Missing point entity: ${!p1 ? command.p1Id : command.p2Id}`
        };
      }

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy);
      const ux = len > 1e-9 ? dx / len : 1;
      const uy = len > 1e-9 ? dy / len : 0;
      const equation = GeometryCore.lineFromPoints(p1, p2);
      const lineId = `line_${command.p1Id}_${command.p2Id}`;
      const newLine: AuxiliaryLine = {
        id: lineId,
        label: `L(${resolvePointLabel(command.p1Id, ctx)}, ${resolvePointLabel(command.p2Id, ctx)})`,
        type: 'two_points',
        throughPointId: command.p1Id,
        point1Id: command.p1Id,
        point2Id: command.p2Id,
        anchorPoint: { x: p1.x, y: p1.y },
        direction: { dx: ux, dy: uy },
        equation,
        color: '#38bdf8'
      };

      const updatedAux: AuxiliaryState = {
        ...currentAux,
        lines: [...currentAux.lines, newLine]
      };

      return {
        status: 'SUCCESS',
        commandType: 'CONSTRUCT_LINE',
        success: true,
        createdEntityIds: [lineId],
        affectedEntityIds: [lineId, command.p1Id, command.p2Id],
        updatedAuxiliaryState: updatedAux,
        message: `Line ${newLine.label} constructed through points`
      };
    }

    // ============================================================
    // 7. CONSTRUCT_CIRCLE COMMAND
    // ============================================================
    case 'CONSTRUCT_CIRCLE': {
      const center = resolvePoint(command.centerId, ctx);
      if (!center) {
        return {
          status: 'MISSING_ENTITY',
          commandType: 'CONSTRUCT_CIRCLE',
          success: false,
          createdEntityIds: [],
          affectedEntityIds: [],
          updatedAuxiliaryState: currentAux,
          message: `Missing center point: ${command.centerId}`
        };
      }

      let radius = command.radius;
      if (command.radiusPointId) {
        const radiusPt = resolvePoint(command.radiusPointId, ctx);
        if (radiusPt) {
          radius = euclideanDistance(center.x, center.y, radiusPt.x, radiusPt.y);
        }
      }

      if (radius < 1e-4 || !isFinite(radius)) {
        return {
          status: 'INVALID_GEOMETRY',
          commandType: 'CONSTRUCT_CIRCLE',
          success: false,
          createdEntityIds: [],
          affectedEntityIds: [],
          updatedAuxiliaryState: currentAux,
          message: 'Circle radius must be positive'
        };
      }

      const circId = `circ_${command.centerId}_${Math.round(radius)}`;
      const newCircle: AuxiliaryCircle = {
        id: circId,
        label: `Окружность(${resolvePointLabel(command.centerId, ctx)})`,
        type: 'center_radius',
        centerPointId: command.centerId,
        radiusPoint1Id: command.radiusPointId,
        radius,
        color: '#38bdf8'
      };

      const updatedAux: AuxiliaryState = {
        ...currentAux,
        circles: [...currentAux.circles, newCircle]
      };

      return {
        status: 'SUCCESS',
        commandType: 'CONSTRUCT_CIRCLE',
        success: true,
        createdEntityIds: [circId],
        affectedEntityIds: [circId, command.centerId],
        updatedAuxiliaryState: updatedAux,
        message: `Circle created at ${command.centerId} (R: ${radius.toFixed(1)} mm)`,
        observation: { radius }
      };
    }

    // ============================================================
    // 8. CONSTRUCT_PARALLEL COMMAND
    // ============================================================
    case 'CONSTRUCT_PARALLEL': {
      const refSeg = resolveSegmentOrLine(command.referenceSegmentId, ctx);
      if (!refSeg) {
        return {
          status: 'MISSING_ENTITY',
          commandType: 'CONSTRUCT_PARALLEL',
          success: false,
          createdEntityIds: [],
          affectedEntityIds: [],
          updatedAuxiliaryState: currentAux,
          message: `Missing reference segment: ${command.referenceSegmentId}`
        };
      }

      const throughPt = resolvePoint(command.throughPointId, ctx);
      if (!throughPt) {
        return {
          status: 'MISSING_ENTITY',
          commandType: 'CONSTRUCT_PARALLEL',
          success: false,
          createdEntityIds: [],
          affectedEntityIds: [],
          updatedAuxiliaryState: currentAux,
          message: `Missing through point: ${command.throughPointId}`
        };
      }

      const dx = refSeg.p2.x - refSeg.p1.x;
      const dy = refSeg.p2.y - refSeg.p1.y;
      const len = Math.hypot(dx, dy);
      const ux = len > 1e-9 ? dx / len : 1;
      const uy = len > 1e-9 ? dy / len : 0;
      const equation = GeometryCore.parallelLine(refSeg.p1, refSeg.p2, throughPt);
      const lineId = `line_par_${command.referenceSegmentId}_${command.throughPointId}`;
      const newLine: AuxiliaryLine = {
        id: lineId,
        label: `Параллель(${command.referenceSegmentId})`,
        type: 'parallel',
        referenceSegmentId: command.referenceSegmentId,
        throughPointId: command.throughPointId,
        anchorPoint: { x: throughPt.x, y: throughPt.y },
        direction: { dx: ux, dy: uy },
        equation,
        color: '#38bdf8'
      };

      const updatedAux: AuxiliaryState = {
        ...currentAux,
        lines: [...currentAux.lines, newLine]
      };

      return {
        status: 'SUCCESS',
        commandType: 'CONSTRUCT_PARALLEL',
        success: true,
        createdEntityIds: [lineId],
        affectedEntityIds: [lineId, command.referenceSegmentId, command.throughPointId],
        updatedAuxiliaryState: updatedAux,
        message: `Parallel line constructed through ${command.throughPointId}`
      };
    }

    // ============================================================
    // 9. CONSTRUCT_PERPENDICULAR COMMAND
    // ============================================================
    case 'CONSTRUCT_PERPENDICULAR': {
      const refSeg = resolveSegmentOrLine(command.referenceSegmentId, ctx);
      if (!refSeg) {
        return {
          status: 'MISSING_ENTITY',
          commandType: 'CONSTRUCT_PERPENDICULAR',
          success: false,
          createdEntityIds: [],
          affectedEntityIds: [],
          updatedAuxiliaryState: currentAux,
          message: `Missing reference segment: ${command.referenceSegmentId}`
        };
      }

      const throughPt = resolvePoint(command.throughPointId, ctx);
      if (!throughPt) {
        return {
          status: 'MISSING_ENTITY',
          commandType: 'CONSTRUCT_PERPENDICULAR',
          success: false,
          createdEntityIds: [],
          affectedEntityIds: [],
          updatedAuxiliaryState: currentAux,
          message: `Missing through point: ${command.throughPointId}`
        };
      }

      const dx = refSeg.p2.x - refSeg.p1.x;
      const dy = refSeg.p2.y - refSeg.p1.y;
      const len = Math.hypot(dx, dy);
      const ux = len > 1e-9 ? -dy / len : 0;
      const uy = len > 1e-9 ? dx / len : 1;
      const equation = GeometryCore.perpendicularLine(refSeg.p1, refSeg.p2, throughPt);
      const lineId = `line_perp_${command.referenceSegmentId}_${command.throughPointId}`;
      const newLine: AuxiliaryLine = {
        id: lineId,
        label: `Перпендикуляр(${command.referenceSegmentId})`,
        type: 'perpendicular',
        referenceSegmentId: command.referenceSegmentId,
        throughPointId: command.throughPointId,
        anchorPoint: { x: throughPt.x, y: throughPt.y },
        direction: { dx: ux, dy: uy },
        equation,
        color: '#38bdf8'
      };

      const updatedAux: AuxiliaryState = {
        ...currentAux,
        lines: [...currentAux.lines, newLine]
      };

      return {
        status: 'SUCCESS',
        commandType: 'CONSTRUCT_PERPENDICULAR',
        success: true,
        createdEntityIds: [lineId],
        affectedEntityIds: [lineId, command.referenceSegmentId, command.throughPointId],
        updatedAuxiliaryState: updatedAux,
        message: `Perpendicular line constructed through ${command.throughPointId}`
      };
    }

    // ============================================================
    // 10. CONSTRUCT_ANGLE_BISECTOR COMMAND
    // ============================================================
    case 'CONSTRUCT_ANGLE_BISECTOR': {
      const arm1 = resolvePoint(command.arm1PointId, ctx);
      const vertex = resolvePoint(command.vertexPointId, ctx);
      const arm2 = resolvePoint(command.arm2PointId, ctx);

      if (!arm1 || !vertex || !arm2) {
        return {
          status: 'MISSING_ENTITY',
          commandType: 'CONSTRUCT_ANGLE_BISECTOR',
          success: false,
          createdEntityIds: [],
          affectedEntityIds: [],
          updatedAuxiliaryState: currentAux,
          message: `Missing point for angle bisector: ${!arm1 ? command.arm1PointId : !vertex ? command.vertexPointId : command.arm2PointId}`
        };
      }

      const bisector = GeometryCore.angleBisector(arm1, vertex, arm2);
      const lineId = `line_bis_${command.vertexPointId}_${command.arm1PointId}_${command.arm2PointId}`;
      const label = `Деление угла ∠(${resolvePointLabel(command.arm1PointId, ctx)}-${resolvePointLabel(command.vertexPointId, ctx)}-${resolvePointLabel(command.arm2PointId, ctx)})`;

      const newLine: AuxiliaryLine = {
        id: lineId,
        label,
        type: 'bisector',
        throughPointId: command.vertexPointId,
        point1Id: command.arm1PointId,
        point2Id: command.vertexPointId,
        point3Id: command.arm2PointId,
        anchorPoint: { x: vertex.x, y: vertex.y },
        direction: { dx: bisector.dirX, dy: bisector.dirY },
        color: '#38bdf8'
      };

      const updatedAux: AuxiliaryState = {
        ...currentAux,
        lines: [...currentAux.lines, newLine]
      };

      return {
        status: 'SUCCESS',
        commandType: 'CONSTRUCT_ANGLE_BISECTOR',
        success: true,
        createdEntityIds: [lineId],
        affectedEntityIds: [lineId, command.vertexPointId, command.arm1PointId, command.arm2PointId],
        updatedAuxiliaryState: updatedAux,
        message: `Angle bisector ${label} constructed`
      };
    }

    // ============================================================
    // 11. CONSTRUCT_DIAGONAL COMMAND
    // ============================================================
    case 'CONSTRUCT_DIAGONAL': {
      const v1 = command.vertex1Id;
      const v2 = command.vertex2Id;

      if (v1 === v2) {
        return {
          status: 'INVALID_GEOMETRY',
          commandType: 'CONSTRUCT_DIAGONAL',
          success: false,
          createdEntityIds: [],
          affectedEntityIds: [],
          updatedAuxiliaryState: currentAux,
          message: 'Cannot construct diagonal to same vertex'
        };
      }

      // Check non-adjacent vertices in cyclic quadrilateral ABCD
      const isNonAdjacent =
        (v1 === 'A' && v2 === 'C') ||
        (v1 === 'C' && v2 === 'A') ||
        (v1 === 'B' && v2 === 'D') ||
        (v1 === 'D' && v2 === 'B');

      if (!isNonAdjacent) {
        return {
          status: 'INVALID_GEOMETRY',
          commandType: 'CONSTRUCT_DIAGONAL',
          success: false,
          createdEntityIds: [],
          affectedEntityIds: [],
          updatedAuxiliaryState: currentAux,
          message: `Vertices ${v1} and ${v2} are adjacent (form base chord, not diagonal)`
        };
      }

      const p1 = resolvePoint(v1, ctx);
      const p2 = resolvePoint(v2, ctx);

      if (!p1 || !p2) {
        return {
          status: 'MISSING_ENTITY',
          commandType: 'CONSTRUCT_DIAGONAL',
          success: false,
          createdEntityIds: [],
          affectedEntityIds: [],
          updatedAuxiliaryState: currentAux,
          message: `Missing quadrilateral vertex: ${!p1 ? v1 : v2}`
        };
      }

      const length = euclideanDistance(p1.x, p1.y, p2.x, p2.y);
      const diagId = `diag_${v1}_${v2}`;
      const newDiag: AuxiliarySegment = {
        id: diagId,
        label: `Диагональ ${v1}${v2}`,
        p1Id: v1,
        p2Id: v2,
        parentIds: [v1, v2],
        type: 'diagonal',
        lengthMm: length,
        color: '#38bdf8'
      };

      const updatedAux: AuxiliaryState = {
        ...currentAux,
        segments: [...currentAux.segments.filter((s) => s.id !== diagId), newDiag]
      };

      return {
        status: 'SUCCESS',
        commandType: 'CONSTRUCT_DIAGONAL',
        success: true,
        createdEntityIds: [diagId],
        affectedEntityIds: [diagId, v1, v2],
        updatedAuxiliaryState: updatedAux,
        message: `Diagonal ${v1}${v2} constructed (length: ${length.toFixed(1)} mm)`,
        observation: { distanceMm: length }
      };
    }

    // ============================================================
    // 12. CONSTRUCT_INTERSECTION COMMAND
    // ============================================================
    case 'CONSTRUCT_INTERSECTION': {
      if (command.entity1Id === command.entity2Id) {
        return {
          status: 'INVALID_GEOMETRY',
          commandType: 'CONSTRUCT_INTERSECTION',
          success: false,
          createdEntityIds: [],
          affectedEntityIds: [],
          updatedAuxiliaryState: currentAux,
          message: 'Cannot intersect entity with itself'
        };
      }

      const s1 = resolveSegmentOrLine(command.entity1Id, ctx);
      const s2 = resolveSegmentOrLine(command.entity2Id, ctx);

      if (!s1 || !s2) {
        return {
          status: 'MISSING_ENTITY',
          commandType: 'CONSTRUCT_INTERSECTION',
          success: false,
          createdEntityIds: [],
          affectedEntityIds: [],
          updatedAuxiliaryState: currentAux,
          message: `Missing entity for intersection: ${!s1 ? command.entity1Id : command.entity2Id}`
        };
      }

      const inter = calculateLineIntersection(s1.p1, s1.p2, s2.p1, s2.p2);
      if (!inter) {
        return {
          status: 'INVALID_GEOMETRY',
          commandType: 'CONSTRUCT_INTERSECTION',
          success: false,
          createdEntityIds: [],
          affectedEntityIds: [],
          updatedAuxiliaryState: currentAux,
          message: 'Lines are parallel or coincident (no unique intersection point)'
        };
      }

      const isAC = (id: string) => (id.includes('A') && id.includes('C')) || id.includes('AC');
      const isBD = (id: string) => (id.includes('B') && id.includes('D')) || id.includes('BD');
      const isDiagonals =
        (isAC(command.entity1Id) && isBD(command.entity2Id)) ||
        (isBD(command.entity1Id) && isAC(command.entity2Id));

      const pLabel = isDiagonals ? 'P' : `P${currentAux.points.length + 1}`;
      const ptId = `pt_inter_${command.entity1Id}_${command.entity2Id}`;

      const newPt: AuxiliaryPoint = {
        id: ptId,
        label: pLabel,
        x: inter.x,
        y: inter.y,
        type: 'intersection',
        parentIds: [command.entity1Id, command.entity2Id],
        color: '#38bdf8'
      };

      const updatedAux: AuxiliaryState = {
        ...currentAux,
        points: [...currentAux.points.filter((p) => p.id !== ptId), newPt]
      };

      return {
        status: 'SUCCESS',
        commandType: 'CONSTRUCT_INTERSECTION',
        success: true,
        createdEntityIds: [ptId],
        affectedEntityIds: [ptId, command.entity1Id, command.entity2Id],
        updatedAuxiliaryState: updatedAux,
        message: `Intersection point ${pLabel} created at (${inter.x.toFixed(1)}, ${inter.y.toFixed(1)})`,
        observation: { intersectionPoint: { id: ptId, x: inter.x, y: inter.y } }
      };
    }

    // ============================================================
    // 13. ERASE_ENTITY COMMAND
    // ============================================================
    case 'ERASE_ENTITY': {
      const protectedEntities = ['A', 'B', 'C', 'D', 'O', 'circle_main'];
      if (protectedEntities.includes(command.entityId)) {
        return {
          status: 'INVALID_COMMAND',
          commandType: 'ERASE_ENTITY',
          success: false,
          createdEntityIds: [],
          affectedEntityIds: [],
          updatedAuxiliaryState: currentAux,
          message: 'Canonical quadrilateral vertices, center, and circumcircle are protected from deletion'
        };
      }

      const targetId = command.entityId;
      const points = currentAux.points.filter((p) => p.id !== targetId);
      const segments = currentAux.segments.filter(
        (s) => s.id !== targetId && s.p1Id !== targetId && s.p2Id !== targetId
      );
      const lines = currentAux.lines.filter(
        (l) => l.id !== targetId && l.throughPointId !== targetId
      );
      const circles = currentAux.circles.filter(
        (c) => c.id !== targetId && c.centerPointId !== targetId
      );
      const measurements = currentAux.measurements.filter(
        (m) => m.id !== targetId && m.p1Id !== targetId && m.p2Id !== targetId
      );

      const updatedAux: AuxiliaryState = {
        ...currentAux,
        points,
        segments,
        lines,
        circles,
        measurements,
        selectedEntityId: currentAux.selectedEntityId === targetId ? null : currentAux.selectedEntityId,
        selectedEntityType: currentAux.selectedEntityId === targetId ? null : currentAux.selectedEntityType
      };

      return {
        status: 'SUCCESS',
        commandType: 'ERASE_ENTITY',
        success: true,
        createdEntityIds: [],
        affectedEntityIds: [targetId],
        updatedAuxiliaryState: updatedAux,
        message: `Entity ${targetId} erased successfully`
      };
    }

    case 'SET_CANONICAL_VERTEX_ANGLE': {
      if (!ctx.geometryState) {
        return {
          status: 'ERROR',
          commandType: 'SET_CANONICAL_VERTEX_ANGLE',
          success: false,
          createdEntityIds: [],
          affectedEntityIds: [],
          updatedAuxiliaryState: currentAux,
          message: 'Geometry state not provided in context'
        };
      }
      if (ctx.geometryState.domainProfile !== 'CYCLIC') {
        return {
          status: 'INVALID_COMMAND',
          commandType: 'SET_CANONICAL_VERTEX_ANGLE',
          success: false,
          createdEntityIds: [],
          affectedEntityIds: [],
          updatedAuxiliaryState: currentAux,
          message: 'Canonical vertex angle modification is only supported in CYCLIC mode'
        };
      }

      const vertexMap: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
      const vertexIdx = vertexMap[command.vertexId.toUpperCase()];
      if (vertexIdx === undefined) {
        return {
          status: 'MISSING_ENTITY',
          commandType: 'SET_CANONICAL_VERTEX_ANGLE',
          success: false,
          createdEntityIds: [],
          affectedEntityIds: [],
          updatedAuxiliaryState: currentAux,
          message: `Vertex ${command.vertexId} not found in cyclic canonical quadrilateral`
        };
      }

      const angleDegrees = command.angle;
      if (!isFinite(angleDegrees)) {
        return {
          status: 'INVALID_GEOMETRY',
          commandType: 'SET_CANONICAL_VERTEX_ANGLE',
          success: false,
          createdEntityIds: [],
          affectedEntityIds: [],
          updatedAuxiliaryState: currentAux,
          message: 'Angle must be a finite number'
        };
      }

      try {
        const nextState = ctx.geometryState.commitMutation((draft) => {
          const cd = draft as CyclicMutationDraft;
          cd.canonicalInputs.angles[vertexIdx] = (angleDegrees * Math.PI) / 180;
        }, `SET_CANONICAL_VERTEX_ANGLE_${command.vertexId}`);

        const derivedVertices = nextState.getDerivedCartesianVertices();
        const pointsMap = new Map<string, { x: number; y: number }>();
        pointsMap.set('O', { x: 0, y: 0 });
        derivedVertices.forEach((v, idx) => {
          pointsMap.set(v.id, { x: v.x, y: v.y });
          const letter = ['A', 'B', 'C', 'D', 'E', 'F'][idx];
          if (letter) {
            pointsMap.set(letter, { x: v.x, y: v.y });
          }
        });

        const updatedAux = recomputeAuxiliaryGeometry(
          currentAux,
          pointsMap,
          { center: { id: 'O', x: 0, y: 0 }, radius: 160 }
        );

        return {
          status: 'SUCCESS',
          commandType: 'SET_CANONICAL_VERTEX_ANGLE',
          success: true,
          createdEntityIds: [],
          affectedEntityIds: [command.vertexId],
          updatedAuxiliaryState: updatedAux,
          updatedGeometryState: nextState,
          message: `Vertex ${command.vertexId} angle set to ${angleDegrees.toFixed(1)}°`
        };
      } catch (err: any) {
        return {
          status: 'INVALID_GEOMETRY',
          commandType: 'SET_CANONICAL_VERTEX_ANGLE',
          success: false,
          createdEntityIds: [],
          affectedEntityIds: [],
          updatedAuxiliaryState: currentAux,
          message: `Mutation rejected by TopologyGuard: ${err.message || err}`
        };
      }
    }

    case 'SHIFT_CANONICAL_VERTEX_ANGLE': {
      if (!ctx.geometryState) {
        return {
          status: 'ERROR',
          commandType: 'SHIFT_CANONICAL_VERTEX_ANGLE',
          success: false,
          createdEntityIds: [],
          affectedEntityIds: [],
          updatedAuxiliaryState: currentAux,
          message: 'Geometry state not provided in context'
        };
      }
      if (ctx.geometryState.domainProfile !== 'CYCLIC') {
        return {
          status: 'INVALID_COMMAND',
          commandType: 'SHIFT_CANONICAL_VERTEX_ANGLE',
          success: false,
          createdEntityIds: [],
          affectedEntityIds: [],
          updatedAuxiliaryState: currentAux,
          message: 'Canonical vertex angle modification is only supported in CYCLIC mode'
        };
      }

      const vertexMap: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
      const vertexIdx = vertexMap[command.vertexId.toUpperCase()];
      if (vertexIdx === undefined) {
        return {
          status: 'MISSING_ENTITY',
          commandType: 'SHIFT_CANONICAL_VERTEX_ANGLE',
          success: false,
          createdEntityIds: [],
          affectedEntityIds: [],
          updatedAuxiliaryState: currentAux,
          message: `Vertex ${command.vertexId} not found in cyclic canonical quadrilateral`
        };
      }

      const deltaDegrees = command.deltaAngle;
      if (!isFinite(deltaDegrees)) {
        return {
          status: 'INVALID_GEOMETRY',
          commandType: 'SHIFT_CANONICAL_VERTEX_ANGLE',
          success: false,
          createdEntityIds: [],
          affectedEntityIds: [],
          updatedAuxiliaryState: currentAux,
          message: 'Delta angle must be a finite number'
        };
      }

      try {
        const cyclicInputs = ctx.geometryState.canonicalInputs as any;
        const currentAngleRad = cyclicInputs.angles[vertexIdx];
        const currentAngleDeg = (currentAngleRad * 180) / Math.PI;
        const targetAngleDeg = currentAngleDeg + deltaDegrees;

        const nextState = ctx.geometryState.commitMutation((draft) => {
          const cd = draft as CyclicMutationDraft;
          cd.canonicalInputs.angles[vertexIdx] = (targetAngleDeg * Math.PI) / 180;
        }, `SHIFT_CANONICAL_VERTEX_ANGLE_${command.vertexId}`);

        const derivedVertices = nextState.getDerivedCartesianVertices();
        const pointsMap = new Map<string, { x: number; y: number }>();
        pointsMap.set('O', { x: 0, y: 0 });
        derivedVertices.forEach((v, idx) => {
          pointsMap.set(v.id, { x: v.x, y: v.y });
          const letter = ['A', 'B', 'C', 'D', 'E', 'F'][idx];
          if (letter) {
            pointsMap.set(letter, { x: v.x, y: v.y });
          }
        });

        const updatedAux = recomputeAuxiliaryGeometry(
          currentAux,
          pointsMap,
          { center: { id: 'O', x: 0, y: 0 }, radius: 160 }
        );

        return {
          status: 'SUCCESS',
          commandType: 'SHIFT_CANONICAL_VERTEX_ANGLE',
          success: true,
          createdEntityIds: [],
          affectedEntityIds: [command.vertexId],
          updatedAuxiliaryState: updatedAux,
          updatedGeometryState: nextState,
          message: `Vertex ${command.vertexId} angle shifted by ${deltaDegrees > 0 ? '+' : ''}${deltaDegrees.toFixed(1)}°`
        };
      } catch (err: any) {
        return {
          status: 'INVALID_GEOMETRY',
          commandType: 'SHIFT_CANONICAL_VERTEX_ANGLE',
          success: false,
          createdEntityIds: [],
          affectedEntityIds: [],
          updatedAuxiliaryState: currentAux,
          message: `Mutation rejected by TopologyGuard: ${err.message || err}`
        };
      }
    }

    // ============================================================
    // 16. SAVE_CHECKPOINT COMMAND
    // ============================================================
    case 'SAVE_CHECKPOINT': {
      const slot = command.slot as CheckpointSlotId;
      if (slot !== 1 && slot !== 2 && slot !== 3) {
        return {
          status: 'INVALID_COMMAND',
          commandType: 'SAVE_CHECKPOINT',
          success: false,
          createdEntityIds: [],
          affectedEntityIds: [],
          updatedAuxiliaryState: currentAux,
          message: `Invalid checkpoint slot: ${command.slot}. Allowed slots are 1, 2, 3.`
        };
      }

      if (!ctx.geometryState) {
        return {
          status: 'ERROR',
          commandType: 'SAVE_CHECKPOINT',
          success: false,
          createdEntityIds: [],
          affectedEntityIds: [],
          updatedAuxiliaryState: currentAux,
          message: 'Geometry state not provided in context'
        };
      }

      try {
        const buffer = ctx.checkpointBuffer ?? getDefaultCheckpointBuffer();
        const record = buffer.save(slot, ctx.geometryState, currentAux, command.label);

        return {
          status: 'SUCCESS',
          commandType: 'SAVE_CHECKPOINT',
          success: true,
          createdEntityIds: [],
          affectedEntityIds: [],
          updatedAuxiliaryState: currentAux,
          updatedGeometryState: ctx.geometryState,
          message: `Checkpoint saved in slot ${slot}${command.label ? ` ("${command.label}")` : ''} at stateVersion ${record.savedAtVersion}`,
          checkpointInfo: buffer.getInfo(slot)
        };
      } catch (err: any) {
        return {
          status: 'ERROR',
          commandType: 'SAVE_CHECKPOINT',
          success: false,
          createdEntityIds: [],
          affectedEntityIds: [],
          updatedAuxiliaryState: currentAux,
          message: `Failed to save checkpoint in slot ${slot}: ${err.message || err}`
        };
      }
    }

    // ============================================================
    // 17. RESTORE_CHECKPOINT COMMAND
    // ============================================================
    case 'RESTORE_CHECKPOINT': {
      const slot = command.slot as CheckpointSlotId;
      if (slot !== 1 && slot !== 2 && slot !== 3) {
        return {
          status: 'INVALID_COMMAND',
          commandType: 'RESTORE_CHECKPOINT',
          success: false,
          createdEntityIds: [],
          affectedEntityIds: [],
          updatedAuxiliaryState: currentAux,
          message: `Invalid checkpoint slot: ${command.slot}. Allowed slots are 1, 2, 3.`
        };
      }

      if (!ctx.geometryState) {
        return {
          status: 'ERROR',
          commandType: 'RESTORE_CHECKPOINT',
          success: false,
          createdEntityIds: [],
          affectedEntityIds: [],
          updatedAuxiliaryState: currentAux,
          message: 'Geometry state not provided in context'
        };
      }

      const buffer = ctx.checkpointBuffer ?? getDefaultCheckpointBuffer();
      const record = buffer.get(slot);

      if (!record) {
        return {
          status: 'MISSING_ENTITY',
          commandType: 'RESTORE_CHECKPOINT',
          success: false,
          createdEntityIds: [],
          affectedEntityIds: [],
          updatedAuxiliaryState: currentAux,
          message: `Checkpoint slot ${slot} is empty (EMPTY_SLOT)`
        };
      }

      try {
        // Monotonic stateVersion increment: commit restore mutation onto current state
        const restoredGeo = ctx.geometryState.commitMutation((draft) => {
          if (record.domainProfile === 'CYCLIC') {
            const cd = draft as CyclicMutationDraft;
            const savedInputs = record.geoState.canonicalInputs as any;
            cd.canonicalInputs.angles = [...savedInputs.angles];
            if (savedInputs.referenceCircle) {
              cd.canonicalInputs.referenceCircle = {
                center: { ...savedInputs.referenceCircle.center },
                radius: savedInputs.referenceCircle.radius
              };
            }
          } else if (record.domainProfile === 'CARTESIAN') {
            const fd = draft as any;
            const savedInputs = record.geoState.canonicalInputs as any;
            fd.canonicalInputs.vertices = savedInputs.vertices.map((v: any) => ({ ...v }));
          }
        }, `RESTORE_CHECKPOINT_${slot}_FROM_V${record.savedAtVersion}`);

        // Recompute dynamic DAG with restored coordinates
        const derivedVertices = restoredGeo.getDerivedCartesianVertices();
        const pointsMap = new Map<string, { x: number; y: number }>();
        pointsMap.set('O', { x: 0, y: 0 });
        derivedVertices.forEach((v, idx) => {
          pointsMap.set(v.id, { x: v.x, y: v.y });
          const letter = ['A', 'B', 'C', 'D', 'E', 'F'][idx];
          if (letter) {
            pointsMap.set(letter, { x: v.x, y: v.y });
          }
        });

        const restoredAux = recomputeAuxiliaryGeometry(
          record.auxState,
          pointsMap,
          {
            center: { id: 'O', x: 0, y: 0 },
            radius: (restoredGeo.canonicalInputs as any).referenceCircle?.radius ?? 160
          }
        );

        return {
          status: 'SUCCESS',
          commandType: 'RESTORE_CHECKPOINT',
          success: true,
          createdEntityIds: [],
          affectedEntityIds: [],
          updatedAuxiliaryState: restoredAux,
          updatedGeometryState: restoredGeo,
          message: `Restored checkpoint from slot ${slot} (originally saved at v${record.savedAtVersion}) to new stateVersion ${restoredGeo.stateVersion}`,
          checkpointInfo: buffer.getInfo(slot)
        };
      } catch (err: any) {
        return {
          status: 'INVALID_GEOMETRY',
          commandType: 'RESTORE_CHECKPOINT',
          success: false,
          createdEntityIds: [],
          affectedEntityIds: [],
          updatedAuxiliaryState: currentAux,
          message: `Failed to restore checkpoint from slot ${slot}: ${err.message || err}`
        };
      }
    }

    // ============================================================
    // 18. CLEAR_CHECKPOINT COMMAND
    // ============================================================
    case 'CLEAR_CHECKPOINT': {
      const slot = command.slot as CheckpointSlotId;
      if (slot !== 1 && slot !== 2 && slot !== 3) {
        return {
          status: 'INVALID_COMMAND',
          commandType: 'CLEAR_CHECKPOINT',
          success: false,
          createdEntityIds: [],
          affectedEntityIds: [],
          updatedAuxiliaryState: currentAux,
          message: `Invalid checkpoint slot: ${command.slot}. Allowed slots are 1, 2, 3.`
        };
      }

      const buffer = ctx.checkpointBuffer ?? getDefaultCheckpointBuffer();
      const wasCleared = buffer.clear(slot);

      return {
        status: 'SUCCESS',
        commandType: 'CLEAR_CHECKPOINT',
        success: true,
        createdEntityIds: [],
        affectedEntityIds: [],
        updatedAuxiliaryState: currentAux,
        updatedGeometryState: ctx.geometryState,
        message: wasCleared ? `Checkpoint slot ${slot} cleared` : `Checkpoint slot ${slot} was already empty`,
        checkpointInfo: buffer.getInfo(slot)
      };
    }

    // ============================================================
    // 19. GET_CHECKPOINT_INFO COMMAND
    // ============================================================
    case 'GET_CHECKPOINT_INFO': {
      const buffer = ctx.checkpointBuffer ?? getDefaultCheckpointBuffer();
      if (command.slot) {
        const slot = command.slot as CheckpointSlotId;
        if (slot !== 1 && slot !== 2 && slot !== 3) {
          return {
            status: 'INVALID_COMMAND',
            commandType: 'GET_CHECKPOINT_INFO',
            success: false,
            createdEntityIds: [],
            affectedEntityIds: [],
            updatedAuxiliaryState: currentAux,
            message: `Invalid checkpoint slot: ${command.slot}. Allowed slots are 1, 2, 3.`
          };
        }
        return {
          status: 'SUCCESS',
          commandType: 'GET_CHECKPOINT_INFO',
          success: true,
          createdEntityIds: [],
          affectedEntityIds: [],
          updatedAuxiliaryState: currentAux,
          updatedGeometryState: ctx.geometryState,
          checkpointInfo: buffer.getInfo(slot)
        };
      }

      return {
        status: 'SUCCESS',
        commandType: 'GET_CHECKPOINT_INFO',
        success: true,
        createdEntityIds: [],
        affectedEntityIds: [],
        updatedAuxiliaryState: currentAux,
        updatedGeometryState: ctx.geometryState,
        checkpointInfo: buffer.list()
      };
    }

    // ============================================================
    // 20. GET_ACTIVE_SNAPSHOT COMMAND
    // ============================================================
    case 'GET_ACTIVE_SNAPSHOT': {
      if (!ctx.geometryState) {
        return {
          status: 'ERROR',
          commandType: 'GET_ACTIVE_SNAPSHOT',
          success: false,
          createdEntityIds: [],
          affectedEntityIds: [],
          updatedAuxiliaryState: currentAux,
          message: 'No active geometry state provided in context (NO_ACTIVE_GEOMETRY_STATE)'
        };
      }

      const snapshot = createGeometryStateSnapshot(ctx.geometryState, currentAux);

      return {
        status: 'SUCCESS',
        commandType: 'GET_ACTIVE_SNAPSHOT',
        success: true,
        createdEntityIds: [],
        affectedEntityIds: [],
        updatedAuxiliaryState: currentAux,
        updatedGeometryState: ctx.geometryState,
        snapshot,
        message: `Active geometry state snapshot captured at stateVersion ${snapshot.metadata.stateVersion}`
      };
    }

    // ============================================================
    // 21. GET_ENTITY_MEASUREMENT COMMAND
    // ============================================================
    case 'GET_ENTITY_MEASUREMENT': {
      const entityId = command.entityId?.trim();
      if (!entityId) {
        return {
          status: 'INVALID_COMMAND',
          commandType: 'GET_ENTITY_MEASUREMENT',
          success: false,
          createdEntityIds: [],
          affectedEntityIds: [],
          updatedAuxiliaryState: currentAux,
          message: 'Missing entityId parameter for GET_ENTITY_MEASUREMENT'
        };
      }

      const currentVersion = ctx.geometryState?.stateVersion ?? 1;

      // 1. Check in measurements
      const measurement = currentAux.measurements.find(
        (m) => m.id === entityId || m.id === `meas_${entityId}`
      );
      if (measurement) {
        return {
          status: 'SUCCESS',
          commandType: 'GET_ENTITY_MEASUREMENT',
          success: true,
          createdEntityIds: [],
          affectedEntityIds: [],
          updatedAuxiliaryState: currentAux,
          updatedGeometryState: ctx.geometryState,
          observation: { distanceMm: measurement.distanceMm },
          entityMeasurement: {
            entityId: measurement.id,
            entityType: 'measurement',
            value: measurement.distanceMm,
            units: 'mm',
            stateVersion: currentVersion,
            status: 'SUCCESS'
          },
          message: `Measurement for ${measurement.id}: ${measurement.distanceMm.toFixed(2)} mm`
        };
      }

      // 2. Check in segments
      const segment = currentAux.segments.find((s) => s.id === entityId);
      if (segment) {
        return {
          status: 'SUCCESS',
          commandType: 'GET_ENTITY_MEASUREMENT',
          success: true,
          createdEntityIds: [],
          affectedEntityIds: [],
          updatedAuxiliaryState: currentAux,
          updatedGeometryState: ctx.geometryState,
          observation: { distanceMm: segment.lengthMm },
          entityMeasurement: {
            entityId: segment.id,
            entityType: segment.type,
            value: segment.lengthMm,
            units: 'mm',
            stateVersion: currentVersion,
            status: 'SUCCESS'
          },
          message: `Measurement for ${segment.id} (${segment.type}): ${segment.lengthMm.toFixed(2)} mm`
        };
      }

      // 3. Check in circles
      const circle = currentAux.circles.find((c) => c.id === entityId);
      if (circle) {
        return {
          status: 'SUCCESS',
          commandType: 'GET_ENTITY_MEASUREMENT',
          success: true,
          createdEntityIds: [],
          affectedEntityIds: [],
          updatedAuxiliaryState: currentAux,
          updatedGeometryState: ctx.geometryState,
          observation: { radius: circle.radius },
          entityMeasurement: {
            entityId: circle.id,
            entityType: 'circle',
            value: circle.radius,
            units: 'mm',
            stateVersion: currentVersion,
            status: 'SUCCESS'
          },
          message: `Measurement for circle ${circle.id}: radius ${circle.radius.toFixed(2)} mm`
        };
      }

      // 4. Check in lines (infinite lines have no scalar length measurement)
      const line = currentAux.lines.find((l) => l.id === entityId);
      if (line) {
        return {
          status: 'SUCCESS',
          commandType: 'GET_ENTITY_MEASUREMENT',
          success: true,
          createdEntityIds: [],
          affectedEntityIds: [],
          updatedAuxiliaryState: currentAux,
          updatedGeometryState: ctx.geometryState,
          entityMeasurement: {
            entityId: line.id,
            entityType: 'line',
            stateVersion: currentVersion,
            status: 'MEASUREMENT_UNAVAILABLE'
          },
          message: `Measurement unavailable for infinite line entity ${line.id} (MEASUREMENT_UNAVAILABLE)`
        };
      }

      // 5. Check in auxiliary points or canonical vertices
      const point = currentAux.points.find((p) => p.id === entityId) ||
                    ctx.canonicalVertices.find((v) => v.id === entityId) ||
                    (entityId === 'O' || entityId === ctx.circumcircle.center.id ? ctx.circumcircle.center : null);
      if (point) {
        return {
          status: 'SUCCESS',
          commandType: 'GET_ENTITY_MEASUREMENT',
          success: true,
          createdEntityIds: [],
          affectedEntityIds: [],
          updatedAuxiliaryState: currentAux,
          updatedGeometryState: ctx.geometryState,
          entityMeasurement: {
            entityId: point.id,
            entityType: 'point',
            stateVersion: currentVersion,
            status: 'MEASUREMENT_UNAVAILABLE'
          },
          message: `Measurement unavailable for point entity ${point.id} (MEASUREMENT_UNAVAILABLE)`
        };
      }

      // 6. Entity not found anywhere
      return {
        status: 'MISSING_ENTITY',
        commandType: 'GET_ENTITY_MEASUREMENT',
        success: false,
        createdEntityIds: [],
        affectedEntityIds: [],
        updatedAuxiliaryState: currentAux,
        updatedGeometryState: ctx.geometryState,
        entityMeasurement: {
          entityId,
          entityType: 'unknown',
          stateVersion: currentVersion,
          status: 'ENTITY_NOT_FOUND'
        },
        message: `Entity ${entityId} not found in active geometry or auxiliary state (ENTITY_NOT_FOUND)`
      };
    }

    default: {
      const unhandled = command as { type: string };
      return {
        status: 'UNSUPPORTED',
        commandType: (unhandled.type as SemanticCommandType) || 'SELECT',
        success: false,
        createdEntityIds: [],
        affectedEntityIds: [],
        updatedAuxiliaryState: currentAux,
        message: `Command type ${unhandled.type} is unsupported`
      };
    }
  }
}
