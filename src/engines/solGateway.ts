/**
 * CQNS-001 — SOL (Structural Operational Language) Gateway
 * Thin operational bridge between Agent/UI intent and authoritative geometry engines.
 * Zero independent calculations; zero theorem proving.
 */

import { GeometryState } from './geometryState';
import { GeometryCore } from './geometryCore';
import { VerificationLayer, VerificationEvaluation } from './verificationLayer';
import { RelationGraph } from './relationGraph';
import { ProvenanceOrigin, VertexMode } from '../types/geometry';

export interface SOLCommandResult {
  success: boolean;
  message: string;
  command: string;
  timestamp: number;
  entityId?: string;
}

export class SOLGateway {
  private static instance: SOLGateway;

  private constructor() {}

  public static getInstance(): SOLGateway {
    if (!SOLGateway.instance) {
      SOLGateway.instance = new SOLGateway();
    }
    return SOLGateway.instance;
  }

  /**
   * Execute evaluation cycle and update passive Relation Graph
   */
  public syncEvaluation(customEventId?: string): VerificationEvaluation {
    const state = GeometryState.getInstance();
    const evaluation = VerificationLayer.evaluateAll(state, customEventId);
    RelationGraph.getInstance().updateLedger(evaluation.relations);
    return evaluation;
  }

  /**
   * Explicitly request formal contract verification (SOL command REQUEST_VERIFICATION)
   * Dispatches to VerificationLayer without asserting or calculating truth.
   */
  public requestVerification(predicate: string = 'all'): { evaluation: VerificationEvaluation; result: SOLCommandResult } {
    const state = GeometryState.getInstance();
    const verifEventId = `evt_verif_${predicate}_v${state.stateVersion}`;
    const evaluation = this.syncEvaluation(verifEventId);

    return {
      evaluation,
      result: {
        success: true,
        message: `Explicit verification event executed: ${verifEventId}`,
        command: `REQUEST_VERIFICATION(${predicate})`,
        timestamp: Date.now(),
      },
    };
  }

  /**
   * Move point coordinates
   */
  public movePoint(pointId: string, x: number, y: number): SOLCommandResult {
    const state = GeometryState.getInstance();
    state.updatePoint(pointId, x, y, `evt_move_${pointId}`);
    const verifEventId = `evt_verif_move_${pointId}_v${state.stateVersion}`;
    this.syncEvaluation(verifEventId);

    return {
      success: true,
      message: `Point ${pointId} moved to (${Math.round(x)}, ${Math.round(y)})`,
      command: `MOVE_POINT(${pointId}, ${Math.round(x)}, ${Math.round(y)})`,
      timestamp: Date.now(),
    };
  }

  /**
   * Rotate all canonical vertices by relative deltaRad
   */
  public rotateVertices(deltaRad: number): SOLCommandResult {
    const state = GeometryState.getInstance();
    state.rotateVertices(deltaRad);
    const verifEventId = `evt_verif_rotate_v${state.stateVersion}`;
    this.syncEvaluation(verifEventId);

    return {
      success: true,
      message: `All canonical vertices rotated by ${(deltaRad * 180 / Math.PI).toFixed(1)}°`,
      command: `ROTATE_VERTICES(${(deltaRad * 180 / Math.PI).toFixed(1)})`,
      timestamp: Date.now(),
    };
  }

  /**
   * Explicitly add auxiliary diagonal
   */
  public addDiagonal(quadId: string, p1Id: string, p2Id: string): SOLCommandResult {
    const state = GeometryState.getInstance();
    const diag = state.addDiagonal(quadId, p1Id, p2Id);

    if (!diag) {
      return {
        success: false,
        message: `Failed to construct diagonal between ${p1Id} and ${p2Id}. They may be adjacent or invalid.`,
        command: `ADD_DIAGONAL(${quadId}, ${p1Id}, ${p2Id})`,
        timestamp: Date.now(),
      };
    }

    this.syncEvaluation();
    return {
      success: true,
      entityId: diag.id,
      message: `Diagonal ${diag.name} explicitly registered in Construction DAG`,
      command: `ADD_DIAGONAL(${quadId}, ${p1Id}, ${p2Id})`,
      timestamp: Date.now(),
    };
  }

  /**
   * Explicitly construct diagonal intersection point P = AC ∩ BD
   */
  public constructIntersection(seg1Id: string, seg2Id: string): SOLCommandResult {
    const state = GeometryState.getInstance();
    const seg1 = state.segments.get(seg1Id);
    const seg2 = state.segments.get(seg2Id);

    if (!seg1 || !seg2) {
      return {
        success: false,
        message: `Both diagonal segments (${seg1Id}, ${seg2Id}) must be explicitly constructed before intersection can be computed.`,
        command: `CONSTRUCT_INTERSECTION(${seg1Id}, ${seg2Id})`,
        timestamp: Date.now(),
      };
    }

    const p1 = state.points.get(seg1.p1Id);
    const p2 = state.points.get(seg1.p2Id);
    const p3 = state.points.get(seg2.p1Id);
    const p4 = state.points.get(seg2.p2Id);

    if (!p1 || !p2 || !p3 || !p4) {
      return {
        success: false,
        message: 'Endpoint primitives missing in GeometryState',
        command: `CONSTRUCT_INTERSECTION(${seg1Id}, ${seg2Id})`,
        timestamp: Date.now(),
      };
    }

    const intersection = GeometryCore.segmentIntersection(p1, p2, p3, p4);
    if (!intersection) {
      return {
        success: false,
        message: 'Segments do not intersect within their bounds (e.g. non-convex or crossed quadrilateral).',
        command: `CONSTRUCT_INTERSECTION(${seg1Id}, ${seg2Id})`,
        timestamp: Date.now(),
      };
    }

    const ptP = state.addIntersection('pt_P', 'P', intersection.x, intersection.y, seg1Id, seg2Id);
    this.syncEvaluation();

    return {
      success: true,
      message: `Intersection point P = ${seg1.name} ∩ ${seg2.name} registered at (${Math.round(intersection.x)}, ${Math.round(intersection.y)})`,
      command: `CONSTRUCT_INTERSECTION(${seg1Id}, ${seg2Id})`,
      timestamp: Date.now(),
    };
  }

  /**
   * Reset stand to canonical state
   */
  public resetToCanon(): SOLCommandResult {
    const state = GeometryState.getInstance();
    state.resetToCanonical();
    this.syncEvaluation();

    return {
      success: true,
      message: 'Stand reset to strict canonical configuration: Circle(O, R) with concyclic vertices A, B, C, D',
      command: 'RESET_CANON()',
      timestamp: Date.now(),
    };
  }

  /**
   * Explicitly add BOTH diagonals AC and BD
   */
  public addBothDiagonals(quadId: string = 'quad_ABCD'): SOLCommandResult {
    const state = GeometryState.getInstance();
    const { ac, bd } = state.addBothDiagonals(quadId);
    this.syncEvaluation();

    return {
      success: !!(ac && bd),
      message: `Diagonals AC and BD explicitly registered in Construction DAG`,
      command: `ADD_DIAGONALS(${quadId})`,
      timestamp: Date.now(),
    };
  }

  /**
   * Construct line through point P parallel to segment refSeg
   */
  public constructParallel(throughPointId: string, refSegmentId: string): SOLCommandResult {
    const state = GeometryState.getInstance();
    const line = state.addParallelLine(throughPointId, refSegmentId);

    if (!line) {
      return {
        success: false,
        message: `Failed to construct parallel line: Point or segment missing`,
        command: `CONSTRUCT_PARALLEL(${throughPointId}, ${refSegmentId})`,
        timestamp: Date.now(),
      };
    }

    this.syncEvaluation();
    return {
      success: true,
      entityId: line.id,
      message: `Parallel line ${line.name} constructed through ${throughPointId}`,
      command: `CONSTRUCT_PARALLEL(${throughPointId}, ${refSegmentId})`,
      timestamp: Date.now(),
    };
  }

  /**
   * Construct line through point P perpendicular to segment refSeg
   */
  public constructPerpendicular(throughPointId: string, refSegmentId: string): SOLCommandResult {
    const state = GeometryState.getInstance();
    const line = state.addPerpendicularLine(throughPointId, refSegmentId);

    if (!line) {
      return {
        success: false,
        message: `Failed to construct perpendicular line: Point or segment missing`,
        command: `CONSTRUCT_PERPENDICULAR(${throughPointId}, ${refSegmentId})`,
        timestamp: Date.now(),
      };
    }

    this.syncEvaluation();
    return {
      success: true,
      entityId: line.id,
      message: `Perpendicular line ${line.name} constructed through ${throughPointId}`,
      command: `CONSTRUCT_PERPENDICULAR(${throughPointId}, ${refSegmentId})`,
      timestamp: Date.now(),
    };
  }

  /**
   * Add free point
   */
  public addFreePoint(x: number, y: number): SOLCommandResult {
    const state = GeometryState.getInstance();
    
    const pt = state.addFreePoint(x, y);
    this.syncEvaluation();

    return {
      success: true,
      entityId: pt.id,
      message: `Auxiliary point ${pt.name} constructed at (${pt.x}, ${pt.y})`,
      command: `ADD_POINT(${pt.x}, ${pt.y})`,
      timestamp: Date.now(),
    };
  }

  /**
   * Remove unused free point
   */
  public removeUnusedFreePoint(pointId: string): SOLCommandResult {
    const state = GeometryState.getInstance();
    const removed = state.removeUnusedFreePoint(pointId);

    if (removed) {
      this.syncEvaluation();
      return {
        success: true,
        message: `Removed unused point ${pointId}`,
        command: `REMOVE_POINT(${pointId})`,
        timestamp: Date.now(),
      };
    }

    return {
      success: false,
      message: `Point ${pointId} cannot be removed`,
      command: `REMOVE_POINT(${pointId})`,
      timestamp: Date.now(),
    };
  }

  /**
   * Add free segment
   */
  public addFreeSegment(p1Id: string, p2Id: string): SOLCommandResult {
    const state = GeometryState.getInstance();
    const seg = state.addFreeSegment(p1Id, p2Id);

    if (!seg) {
      return {
        success: false,
        message: 'Failed to construct segment: endpoints invalid or identical',
        command: `ADD_SEGMENT(${p1Id}, ${p2Id})`,
        timestamp: Date.now(),
      };
    }

    this.syncEvaluation();
    return {
      success: true,
      entityId: seg.id,
      message: `Auxiliary segment ${seg.name} constructed`,
      command: `ADD_SEGMENT(${p1Id}, ${p2Id})`,
      timestamp: Date.now(),
    };
  }

  /**
   * Add free infinite line through two points
   */
  public addFreeLine(p1Id: string, p2Id: string): SOLCommandResult {
    const state = GeometryState.getInstance();
    const line = state.addFreeLine(p1Id, p2Id);

    if (!line) {
      return {
        success: false,
        message: 'Failed to construct line: endpoints invalid or identical',
        command: `ADD_LINE(${p1Id}, ${p2Id})`,
        timestamp: Date.now(),
      };
    }

    this.syncEvaluation();
    return {
      success: true,
      entityId: line.id,
      message: `Auxiliary line ${line.name} constructed`,
      command: `ADD_LINE(${p1Id}, ${p2Id})`,
      timestamp: Date.now(),
    };
  }

  /**
   * Add free circle
   */
  public addFreeCircle(centerId: string, radius: number): SOLCommandResult {
    const state = GeometryState.getInstance();
    const circle = state.addFreeCircle(centerId, radius);

    if (!circle) {
      return {
        success: false,
        message: 'Failed to construct circle: center invalid or radius <= 0',
        command: `ADD_CIRCLE(${centerId}, ${radius})`,
        timestamp: Date.now(),
      };
    }

    this.syncEvaluation();
    return {
      success: true,
      message: `Auxiliary circle ${circle.name} constructed`,
      command: `ADD_CIRCLE(${centerId}, ${radius})`,
      timestamp: Date.now(),
    };
  }

  /**
   * Construct Compass circle with center point and radius defined by distance |P1P2|
   */
  public constructCompass(centerId: string, radiusPoint1Id: string, radiusPoint2Id: string): SOLCommandResult {
    const state = GeometryState.getInstance();
    const circle = state.addCompassCircle(centerId, radiusPoint1Id, radiusPoint2Id);

    if (!circle) {
      return {
        success: false,
        message: 'Failed to construct compass circle: Center or radius endpoints invalid',
        command: `CONSTRUCT_COMPASS(${centerId}, ${radiusPoint1Id}, ${radiusPoint2Id})`,
        timestamp: Date.now(),
      };
    }

    this.syncEvaluation();
    return {
      success: true,
      entityId: circle.id,
      message: `Compass circle ${circle.name} constructed with radius ${circle.radius}px`,
      command: `CONSTRUCT_COMPASS(${centerId}, ${radiusPoint1Id}, ${radiusPoint2Id})`,
      timestamp: Date.now(),
    };
  }

  /**
   * Switch provenance mode
   */
  public setProvenanceMode(mode: ProvenanceOrigin): SOLCommandResult {
    const state = GeometryState.getInstance();
    state.setProvenanceMode(mode);
    this.syncEvaluation();

    return {
      success: true,
      message: `Provenance mode changed to ${mode}`,
      command: `SET_MODE(${mode})`,
      timestamp: Date.now(),
    };
  }

  /**
   * Switch vertex manipulation mode (SCHOOL vs RESEARCH)
   */
  public setVertexMode(mode: VertexMode): SOLCommandResult {
    const state = GeometryState.getInstance();
    state.setVertexMode(mode);
    this.syncEvaluation();

    return {
      success: true,
      message: `Vertex mode changed to ${mode}`,
      command: `SET_VERTEX_MODE(${mode})`,
      timestamp: Date.now(),
    };
  }

  // ===========================================================================
  // PACKAGE 03: CLASSICAL CONSTRUCTIONS SOL COMMANDS
  // ===========================================================================

  /**
   * Construct perpendicular bisector of segment
   */
  public constructPerpendicularBisector(segmentId: string): SOLCommandResult {
    const state = GeometryState.getInstance();
    const line = state.addPerpendicularBisector(segmentId);

    if (!line) {
      return {
        success: false,
        message: `Failed to construct perpendicular bisector: Segment ${segmentId} missing or endpoints identical`,
        command: `CONSTRUCT_PERPENDICULAR_BISECTOR(${segmentId})`,
        timestamp: Date.now(),
      };
    }

    this.syncEvaluation();
    return {
      success: true,
      entityId: line.id,
      message: `Perpendicular bisector ${line.name} constructed`,
      command: `CONSTRUCT_PERPENDICULAR_BISECTOR(${segmentId})`,
      timestamp: Date.now(),
    };
  }

  /**
   * Construct angle bisector
   */
  public constructAngleBisector(
    vertexId: string,
    ray1PtId: string,
    ray2PtId: string,
    bisectorType: 'INTERNAL' | 'EXTERNAL' = 'INTERNAL'
  ): SOLCommandResult {
    const state = GeometryState.getInstance();
    const line = state.addAngleBisector(vertexId, ray1PtId, ray2PtId, bisectorType);

    if (!line) {
      return {
        success: false,
        message: `Failed to construct angle bisector: Points missing or rays collinear/opposite`,
        command: `CONSTRUCT_ANGLE_BISECTOR(${vertexId}, ${ray1PtId}, ${ray2PtId}, ${bisectorType})`,
        timestamp: Date.now(),
      };
    }

    this.syncEvaluation();
    return {
      success: true,
      entityId: line.id,
      message: `${bisectorType} angle bisector ${line.name} constructed`,
      command: `CONSTRUCT_ANGLE_BISECTOR(${vertexId}, ${ray1PtId}, ${ray2PtId}, ${bisectorType})`,
      timestamp: Date.now(),
    };
  }

  /**
   * Construct circumcircle from three non-collinear points
   */
  public constructCircumcircle(p1Id: string, p2Id: string, p3Id: string): SOLCommandResult {
    const state = GeometryState.getInstance();
    const circle = state.addCircumcircle(p1Id, p2Id, p3Id);

    if (!circle) {
      return {
        success: false,
        message: `Failed to construct circumcircle: Points missing or collinear`,
        command: `CONSTRUCT_CIRCUMCIRCLE(${p1Id}, ${p2Id}, ${p3Id})`,
        timestamp: Date.now(),
      };
    }

    this.syncEvaluation();
    return {
      success: true,
      entityId: circle.id,
      message: `Circumcircle ${circle.name} constructed with radius ${circle.radius}px`,
      command: `CONSTRUCT_CIRCUMCIRCLE(${p1Id}, ${p2Id}, ${p3Id})`,
      timestamp: Date.now(),
    };
  }

  /**
   * Construct inscribed square in circle given diameter endpoints
   */
  public constructInscribedSquare(
    circleId: string,
    diameterP1Id: string,
    diameterP2Id: string
  ): SOLCommandResult {
    const state = GeometryState.getInstance();
    const result = state.addInscribedSquare(circleId, diameterP1Id, diameterP2Id);

    if (!result) {
      return {
        success: false,
        message: `Failed to construct inscribed square: Circle or diameter endpoints invalid`,
        command: `CONSTRUCT_INSCRIBED_SQUARE(${circleId}, ${diameterP1Id}, ${diameterP2Id})`,
        timestamp: Date.now(),
      };
    }

    this.syncEvaluation();
    return {
      success: true,
      entityId: result.squareId,
      message: `Inscribed square ${result.squareId} constructed with 4 vertices and 4 boundary sides`,
      command: `CONSTRUCT_INSCRIBED_SQUARE(${circleId}, ${diameterP1Id}, ${diameterP2Id})`,
      timestamp: Date.now(),
    };
  }

  /**
   * Construct tangents from external point to circle
   */
  public constructTangentsFromExternalPoint(pointId: string, circleId: string): SOLCommandResult {
    const state = GeometryState.getInstance();
    const result = state.addTangentsFromExternalPoint(pointId, circleId);

    if (!result) {
      return {
        success: false,
        message: `Failed to construct tangents: Point ${pointId} must be strictly outside circle ${circleId}`,
        command: `CONSTRUCT_TANGENTS_FROM_EXTERNAL_POINT(${pointId}, ${circleId})`,
        timestamp: Date.now(),
      };
    }

    this.syncEvaluation();
    return {
      success: true,
      entityId: result.line1Id,
      message: `Tangents from ${pointId} to ${circleId} constructed`,
      command: `CONSTRUCT_TANGENTS_FROM_EXTERNAL_POINT(${pointId}, ${circleId})`,
      timestamp: Date.now(),
    };
  }

  /**
   * Construct tangent at point lying on circle
   */
  public constructTangentAtPoint(pointId: string, circleId: string): SOLCommandResult {
    const state = GeometryState.getInstance();
    const line = state.addTangentAtPoint(pointId, circleId);

    if (!line) {
      return {
        success: false,
        message: `Failed to construct tangent at point: Point ${pointId} does not lie on circle ${circleId}`,
        command: `CONSTRUCT_TANGENT_AT_POINT(${pointId}, ${circleId})`,
        timestamp: Date.now(),
      };
    }

    this.syncEvaluation();
    return {
      success: true,
      entityId: line.id,
      message: `Tangent line ${line.name} constructed at point ${pointId}`,
      command: `CONSTRUCT_TANGENT_AT_POINT(${pointId}, ${circleId})`,
      timestamp: Date.now(),
    };
  }
}
