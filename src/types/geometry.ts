/**
 * CQNS-001 — Domain and Epistemic Types
 * Strict compliance with frozen specifications (Phases 0-7)
 */

export type EpistemicStatus = 
  | 'GIVEN' 
  | 'HYPOTHESIS' 
  | 'VERIFIED' 
  | 'DERIVED' 
  | 'INVALID' 
  | 'VANISHED';

export type ProvenanceOrigin = 
  | 'CANONICAL' 
  | 'EXTENSION_SCENARIO';

export type VertexMode = 
  | 'SCHOOL' 
  | 'RESEARCH';

export type CanvasTool = 
  | 'select' 
  | 'move' 
  | 'point' 
  | 'segment' 
  | 'line' 
  | 'circle' 
  | 'line_circle'
  | 'angle' 
  | 'ruler' 
  | 'compass' 
  | 'diagonal'
  | 'diagonals' 
  | 'parallel' 
  | 'perpendicular';

export interface Point {
  id: string;
  name: string;
  x: number;
  y: number;
  role: 'center' | 'vertex' | 'intersection' | 'auxiliary';
  pinned?: boolean;
}

export interface Circle {
  id: string;
  name: string;
  centerId: string;
  radius: number;
}

export interface Segment {
  id: string;
  name: string;
  p1Id: string;
  p2Id: string;
  segmentType: 'side' | 'diagonal' | 'chord' | 'auxiliary' | 'parallel' | 'perpendicular';
  isInfiniteLine?: boolean;
}

export interface Angle {
  id: string;
  name: string;
  vertexId: string;
  ray1PointId: string;
  ray2PointId: string;
}

export interface Quadrilateral {
  id: string;
  name: string;
  vertexIds: [string, string, string, string];
  boundarySegmentIds: [string, string, string, string];
}

export interface DerivationTrace {
  ruleId: string;
  ruleName: string;
  premiseFactIds: string[];
  authorizedBy: 'GEOMETRY_CORE' | 'FORMAL_RULE_CATALOG';
}

export interface RelationNode {
  id: string;
  relationType: 
    | 'point_on_circle'
    | 'chord_of'
    | 'diameter_of'
    | 'diagonal_of'
    | 'cyclic_quadrilateral'
    | 'inscribed_angle'
    | 'opposite_angles'
    | 'supplementary_angles'
    | 'same_arc_subtended'
    | 'equal_inscribed_angles'
    | 'segment_length'
    | 'angle_measure'
    | 'ptolemy_metric_equality'
    | 'intersects';
  subjectId: string;
  argumentIds: string[];
  status: EpistemicStatus;
  origin: ProvenanceOrigin;
  verificationContractId?: string;
  derivationTrace?: DerivationTrace;
  stateVersion: number;
  eventId: string;
  createdAt: number;
  invalidatedAt?: number;
  invalidationReason?: string;
  description: string;
}

export interface ConstructionNode {
  entityId: string;
  entityType: 'point' | 'circle' | 'segment' | 'quadrilateral';
  parentIds: string[];
  operation: string;
  timestamp: number;
}

export interface ConstructionIntersectionPoint {
  id: string;
  name: string;
  x: number;
  y: number;
  sourceType: 'line_circle' | 'line_line' | 'circle_circle';
  parentEntityIds: [string, string];
  description?: string;
}
