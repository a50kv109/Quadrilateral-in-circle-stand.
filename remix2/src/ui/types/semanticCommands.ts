/**
 * Semantic Construction Commands Interface
 * R2-05.2 — Canonical Geometry Stand Active Tools & Agent Architecture
 * 
 * Defines the unified semantic command protocol for both Human UI interactions
 * and future Agent/AAM execution.
 * 
 * Pipeline:
 * [Human UI or Future Agent] -> Semantic Command -> Construction Layer -> GeometryCore -> GeometryState -> DAG
 */

import { CanonicalToolId } from './uiTypes';

export type SemanticCommandType =
  | 'SELECT'
  | 'CONSTRUCT_POINT'
  | 'CONSTRUCT_SEGMENT'
  | 'MEASURE_DISTANCE'
  | 'CONSTRUCT_COMPASS'
  | 'CONSTRUCT_LINE'
  | 'CONSTRUCT_CIRCLE'
  | 'CONSTRUCT_PARALLEL'
  | 'CONSTRUCT_PERPENDICULAR'
  | 'CONSTRUCT_ANGLE_BISECTOR'
  | 'CONSTRUCT_DIAGONAL'
  | 'CONSTRUCT_INTERSECTION'
  | 'ERASE_ENTITY'
  | 'SET_CANONICAL_VERTEX_ANGLE'
  | 'SHIFT_CANONICAL_VERTEX_ANGLE'
  | 'SAVE_CHECKPOINT'
  | 'RESTORE_CHECKPOINT'
  | 'CLEAR_CHECKPOINT'
  | 'GET_CHECKPOINT_INFO'
  | 'GET_ACTIVE_SNAPSHOT'
  | 'GET_ENTITY_MEASUREMENT';

export interface SelectCommand {
  readonly type: 'SELECT';
  readonly targetId: string | null;
  readonly targetType?: string | null;
}

export interface ConstructPointCommand {
  readonly type: 'CONSTRUCT_POINT';
  readonly x: number;
  readonly y: number;
  readonly pointType: 'free' | 'on_circle' | 'on_segment';
  readonly parentId?: string;
}

export interface ConstructSegmentCommand {
  readonly type: 'CONSTRUCT_SEGMENT';
  readonly p1Id: string;
  readonly p2Id: string;
}

export interface MeasureDistanceCommand {
  readonly type: 'MEASURE_DISTANCE';
  readonly p1Id: string;
  readonly p2Id: string;
}

export interface ConstructCompassCommand {
  readonly type: 'CONSTRUCT_COMPASS';
  readonly centerId: string;
  readonly radius: number;
  readonly radiusPointId?: string;
}

export interface ConstructLineCommand {
  readonly type: 'CONSTRUCT_LINE';
  readonly p1Id: string;
  readonly p2Id: string;
}

export interface ConstructCircleCommand {
  readonly type: 'CONSTRUCT_CIRCLE';
  readonly centerId: string;
  readonly radius: number;
  readonly radiusPointId?: string;
}

export interface ConstructParallelCommand {
  readonly type: 'CONSTRUCT_PARALLEL';
  readonly referenceSegmentId: string;
  readonly throughPointId: string;
}

export interface ConstructPerpendicularCommand {
  readonly type: 'CONSTRUCT_PERPENDICULAR';
  readonly referenceSegmentId: string;
  readonly throughPointId: string;
}

export interface ConstructAngleBisectorCommand {
  readonly type: 'CONSTRUCT_ANGLE_BISECTOR';
  readonly arm1PointId: string;
  readonly vertexPointId: string;
  readonly arm2PointId: string;
}

export interface ConstructDiagonalCommand {
  readonly type: 'CONSTRUCT_DIAGONAL';
  readonly vertex1Id: string;
  readonly vertex2Id: string;
}

export interface ConstructIntersectionCommand {
  readonly type: 'CONSTRUCT_INTERSECTION';
  readonly entity1Id: string;
  readonly entity2Id: string;
}

export interface EraseEntityCommand {
  readonly type: 'ERASE_ENTITY';
  readonly entityId: string;
}

export interface SetCanonicalVertexAngleCommand {
  readonly type: 'SET_CANONICAL_VERTEX_ANGLE';
  readonly vertexId: string; // e.g. "A", "B", "C", "D"
  readonly angle: number; // in degrees
}

export interface ShiftCanonicalVertexAngleCommand {
  readonly type: 'SHIFT_CANONICAL_VERTEX_ANGLE';
  readonly vertexId: string; // e.g. "A", "B", "C", "D"
  readonly deltaAngle: number; // in degrees
}

export type CheckpointSlotId = 1 | 2 | 3;

export interface SaveCheckpointCommand {
  readonly type: 'SAVE_CHECKPOINT';
  readonly slot: CheckpointSlotId;
  readonly label?: string;
}

export interface RestoreCheckpointCommand {
  readonly type: 'RESTORE_CHECKPOINT';
  readonly slot: CheckpointSlotId;
}

export interface ClearCheckpointCommand {
  readonly type: 'CLEAR_CHECKPOINT';
  readonly slot: CheckpointSlotId;
}

export interface GetCheckpointInfoCommand {
  readonly type: 'GET_CHECKPOINT_INFO';
  readonly slot?: CheckpointSlotId;
}

export interface GetActiveSnapshotCommand {
  readonly type: 'GET_ACTIVE_SNAPSHOT';
}

export interface GetEntityMeasurementCommand {
  readonly type: 'GET_ENTITY_MEASUREMENT';
  readonly entityId: string;
}

export type SemanticCommand =
  | SelectCommand
  | ConstructPointCommand
  | ConstructSegmentCommand
  | MeasureDistanceCommand
  | ConstructCompassCommand
  | ConstructLineCommand
  | ConstructCircleCommand
  | ConstructParallelCommand
  | ConstructPerpendicularCommand
  | ConstructAngleBisectorCommand
  | ConstructDiagonalCommand
  | ConstructIntersectionCommand
  | EraseEntityCommand
  | SetCanonicalVertexAngleCommand
  | ShiftCanonicalVertexAngleCommand
  | SaveCheckpointCommand
  | RestoreCheckpointCommand
  | ClearCheckpointCommand
  | GetCheckpointInfoCommand
  | GetActiveSnapshotCommand
  | GetEntityMeasurementCommand;

/**
 * Mapping from canonical tool ID to semantic command type
 */
export const TOOL_TO_COMMAND_MAP: Record<CanonicalToolId, SemanticCommandType | 'CONSTRUCT_LINE_OR_CIRCLE'> = {
  SELECT: 'SELECT',
  POINT: 'CONSTRUCT_POINT',
  SEGMENT: 'CONSTRUCT_SEGMENT',
  RULER: 'MEASURE_DISTANCE',
  COMPASS: 'CONSTRUCT_COMPASS',
  LINE_CIRCLE: 'CONSTRUCT_LINE_OR_CIRCLE',
  PARALLEL: 'CONSTRUCT_PARALLEL',
  PERPENDICULAR: 'CONSTRUCT_PERPENDICULAR',
  ANGLE_BISECTOR: 'CONSTRUCT_ANGLE_BISECTOR',
  DIAGONAL: 'CONSTRUCT_DIAGONAL',
  INTERSECTION: 'CONSTRUCT_INTERSECTION',
  ERASER: 'ERASE_ENTITY'
};
