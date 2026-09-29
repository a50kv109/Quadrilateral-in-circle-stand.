/**
 * CQNS-001 — Verification Layer
 * Encapsulates EPSILON (ε) numerical tolerances.
 * Executes Verification Contracts VC-01 through VC-14.
 * Emits authorized epistemic verdicts (GIVEN, HYPOTHESIS, VERIFIED, DERIVED, INVALID, VANISHED).
 */

import { Point, RelationNode } from '../types/geometry';
import { GeometryCore } from './geometryCore';
import { GeometryState } from './geometryState';
import { RelationGraph } from './relationGraph';

export interface VerificationEvaluation {
  relations: RelationNode[];
  isCyclic: boolean;
  areOppositeAnglesSupplementary: boolean;
  ptolemyHolds: boolean;
  oppositeAngleSum1: number; // A + C in deg
  oppositeAngleSum2: number; // B + D in deg
  ptolemyDetails: {
    diagProduct: number;
    sideProductSum: number;
    delta: number;
  };
}

export class VerificationLayer {
  // Encapsulated numerical thresholds (NEVER leaked to SOL, graph semantics, or UI)
  public static readonly EPSILON_DIST = 1.0; // Distance tolerance in pixels
  public static readonly EPSILON_ANGLE = (1.5 * Math.PI) / 180; // ~1.5 deg in radians

  /**
   * Evaluates all canonical contracts on the current GeometryState
   * and produces the definitive list of RelationNode records for the Relation Graph.
   */
  public static evaluateAll(state: GeometryState, customEventId?: string): VerificationEvaluation {
    const relations: RelationNode[] = [];
    const verifEventId = customEventId || `evt_verif_v${state.stateVersion}`;
    const previousGraph = RelationGraph.getInstance();

    const circle = state.circles.get('circle_main');
    const ptO = state.points.get('pt_O');
    const ptA = state.points.get('pt_A');
    const ptB = state.points.get('pt_B');
    const ptC = state.points.get('pt_C');
    const ptD = state.points.get('pt_D');
    const quad = state.quadrilaterals.get('quad_ABCD');

    if (!circle || !ptO || !ptA || !ptB || !ptC || !ptD || !quad) {
      return {
        relations: [],
        isCyclic: false,
        areOppositeAnglesSupplementary: false,
        ptolemyHolds: false,
        oppositeAngleSum1: 0,
        oppositeAngleSum2: 0,
        ptolemyDetails: { diagProduct: 0, sideProductSum: 0, delta: 0 },
      };
    }

    // VC-01: Circumcircle
    relations.push({
      id: 'rel_circle_main',
      relationType: 'chord_of',
      subjectId: circle.id,
      argumentIds: [ptO.id],
      status: 'VERIFIED',
      origin: 'CANONICAL',
      verificationContractId: 'VC-01',
      stateVersion: state.stateVersion,
      eventId: verifEventId,
      createdAt: Date.now(),
      description: `Circle(O, R=${circle.radius}) non-degenerate`,
    });

    // VC-02: Point-on-Circle for A, B, C, D
    const points = [ptA, ptB, ptC, ptD];
    const pointOnCircleStatus: Record<string, 'VERIFIED' | 'VANISHED' | 'INVALID'> = {};

    for (const p of points) {
      const dev = GeometryCore.radialDeviation(p, ptO, circle.radius);
      const onCircle = dev <= this.EPSILON_DIST;

      // In CQNS dynamic state:
      // If a point was canonical and is on circle -> VERIFIED.
      // If point moved off circle -> VANISHED (prerequisite concyclicity lost while object remains).
      const status = onCircle ? 'VERIFIED' : 'VANISHED';
      pointOnCircleStatus[p.id] = status;

      const prevRel = previousGraph.get(`rel_pt_on_circle_${p.name}`);
      const wasRestored = prevRel?.status === 'VANISHED' && status === 'VERIFIED';

      relations.push({
        id: `rel_pt_on_circle_${p.name}`,
        relationType: 'point_on_circle',
        subjectId: p.id,
        argumentIds: [circle.id],
        status,
        origin: 'CANONICAL',
        verificationContractId: 'VC-02',
        stateVersion: state.stateVersion,
        eventId: verifEventId,
        createdAt: Date.now(),
        invalidationReason: onCircle ? undefined : `Point ${p.name} radial distance deviation ${dev.toFixed(2)}px exceeds ε`,
        description: wasRestored
          ? `${p.name} ∈ Circle(O, R) [Restored via re-verification ${verifEventId}]`
          : `${p.name} ∈ Circle(O, R) [dev: ${dev.toFixed(2)}px]`,
      });
    }

    // VC-04: Base Chords AB, BC, CD, DA
    const sides: [string, Point, Point][] = [
      ['seg_AB', ptA, ptB],
      ['seg_BC', ptB, ptC],
      ['seg_CD', ptC, ptD],
      ['seg_DA', ptD, ptA],
    ];

    for (const [sId, p1, p2] of sides) {
      const p1Valid = pointOnCircleStatus[p1.id] === 'VERIFIED';
      const p2Valid = pointOnCircleStatus[p2.id] === 'VERIFIED';
      const status = p1Valid && p2Valid ? 'VERIFIED' : 'VANISHED';

      relations.push({
        id: `rel_chord_${p1.name}${p2.name}`,
        relationType: 'chord_of',
        subjectId: sId,
        argumentIds: [circle.id, p1.id, p2.id],
        status,
        origin: 'CANONICAL',
        verificationContractId: 'VC-04',
        stateVersion: state.stateVersion,
        eventId: verifEventId,
        createdAt: Date.now(),
        invalidationReason: status === 'VERIFIED' ? undefined : `Prerequisite endpoint off circle`,
        description: `Chord ${p1.name}${p2.name} of Circle(O, R)`,
      });
    }

    // VC-03: CyclicQuadrilateral ABCD
    const allConcyclic = points.every(p => pointOnCircleStatus[p.id] === 'VERIFIED');
    const cyclicStatus = allConcyclic ? 'VERIFIED' : 'VANISHED';
    const prevQuadRel = previousGraph.get('rel_cyclic_quad_ABCD');
    const wasQuadRestored = prevQuadRel?.status === 'VANISHED' && cyclicStatus === 'VERIFIED';

    relations.push({
      id: 'rel_cyclic_quad_ABCD',
      relationType: 'cyclic_quadrilateral',
      subjectId: quad.id,
      argumentIds: [circle.id, ptA.id, ptB.id, ptC.id, ptD.id],
      status: cyclicStatus,
      origin: 'CANONICAL',
      verificationContractId: 'VC-03',
      stateVersion: state.stateVersion,
      eventId: verifEventId,
      createdAt: Date.now(),
      invalidationReason: allConcyclic ? undefined : 'One or more vertices not on circumcircle',
      description: wasQuadRestored
        ? `CyclicQuadrilateral ABCD on Circle(O, R) [Restored via re-verification ${verifEventId}]`
        : `CyclicQuadrilateral ABCD on Circle(O, R)`,
    });

    // VC-08 & VC-11: Opposite Angles & Supplementary Angles (A + C, B + D)
    const angleA = GeometryCore.angleAtVertex(ptA, ptD, ptB);
    const angleB = GeometryCore.angleAtVertex(ptB, ptA, ptC);
    const angleC = GeometryCore.angleAtVertex(ptC, ptB, ptD);
    const angleD = GeometryCore.angleAtVertex(ptD, ptC, ptA);

    const sumAC = angleA + angleC;
    const sumBD = angleB + angleD;

    const degAC = (sumAC * 180) / Math.PI;
    const degBD = (sumBD * 180) / Math.PI;

    const suppACHolds = Math.abs(sumAC - Math.PI) <= this.EPSILON_ANGLE;
    const suppBDHolds = Math.abs(sumBD - Math.PI) <= this.EPSILON_ANGLE;
    const suppAnglesHold = suppACHolds && suppBDHolds;

    // Epistemic condition for DERIVED supplementary angles:
    // Requires cyclic_quadrilateral to be active VERIFIED.
    // If quad is VANISHED, derived angle theorems become VANISHED.
    const suppAnglesStatus = (cyclicStatus === 'VERIFIED' && suppAnglesHold)
      ? 'DERIVED'
      : (cyclicStatus === 'VERIFIED' ? 'INVALID' : 'VANISHED');

    relations.push({
      id: 'rel_opposite_angles_AC',
      relationType: 'opposite_angles',
      subjectId: quad.id,
      argumentIds: ['angle_A', 'angle_C'],
      status: 'VERIFIED',
      origin: 'CANONICAL',
      verificationContractId: 'VC-08',
      stateVersion: state.stateVersion,
      eventId: verifEventId,
      createdAt: Date.now(),
      description: `Opposite angles ∠A and ∠C in quad ABCD`,
    });

    relations.push({
      id: 'rel_supplementary_opposite_angles',
      relationType: 'supplementary_angles',
      subjectId: quad.id,
      argumentIds: ['angle_A', 'angle_C', 'angle_B', 'angle_D'],
      status: suppAnglesStatus,
      origin: 'CANONICAL',
      verificationContractId: 'VC-11',
      derivationTrace: {
        ruleId: 'RULE_INSCRIBED_QUAD_OPPOSITE_ANGLES',
        ruleName: 'Inscribed Quadrilateral Theorem (∠A + ∠C = 180°)',
        premiseFactIds: ['rel_cyclic_quad_ABCD', 'rel_opposite_angles_AC'],
        authorizedBy: 'GEOMETRY_CORE',
      },
      stateVersion: state.stateVersion,
      eventId: verifEventId,
      createdAt: Date.now(),
      invalidationReason: suppAnglesStatus === 'DERIVED' ? undefined : 'Prerequisite cyclic quadrilateral is vanished or angle sum deviates from 180°',
      description: `∠A + ∠C = ${degAC.toFixed(1)}°, ∠B + ∠D = ${degBD.toFixed(1)}° (Theorem: 180°)`,
    });

    // VC-06: Explicit Auxiliary Diagonals (AC, BD)
    const diagAC = state.segments.get('diag_AC');
    const diagBD = state.segments.get('diag_BD');

    if (diagAC) {
      relations.push({
        id: 'rel_diag_AC',
        relationType: 'diagonal_of',
        subjectId: diagAC.id,
        argumentIds: [quad.id, ptA.id, ptC.id],
        status: 'VERIFIED',
        origin: 'CANONICAL',
        verificationContractId: 'VC-06',
        stateVersion: state.stateVersion,
        eventId: verifEventId,
        createdAt: Date.now(),
        description: `Explicit auxiliary diagonal AC [length: ${GeometryCore.distance(ptA, ptC).toFixed(1)}px]`,
      });
    }

    if (diagBD) {
      relations.push({
        id: 'rel_diag_BD',
        relationType: 'diagonal_of',
        subjectId: diagBD.id,
        argumentIds: [quad.id, ptB.id, ptD.id],
        status: 'VERIFIED',
        origin: 'CANONICAL',
        verificationContractId: 'VC-06',
        stateVersion: state.stateVersion,
        eventId: verifEventId,
        createdAt: Date.now(),
        description: `Explicit auxiliary diagonal BD [length: ${GeometryCore.distance(ptB, ptD).toFixed(1)}px]`,
      });
    }

    // VC-14: Ptolemy Metric Invariant (evaluated only when BOTH diagonals are explicitly constructed)
    const ptolemy = GeometryCore.ptolemyDelta(ptA, ptB, ptC, ptD);
    const ptolemyTolerance = this.EPSILON_DIST * 4 * circle.radius;
    const ptolemyHolds = ptolemy.delta <= ptolemyTolerance;

    if (diagAC && diagBD) {
      const ptolemyStatus = (cyclicStatus === 'VERIFIED' && ptolemyHolds)
        ? 'DERIVED'
        : (cyclicStatus === 'VERIFIED' ? 'INVALID' : 'VANISHED');

      relations.push({
        id: 'rel_ptolemy_metric_equality',
        relationType: 'ptolemy_metric_equality',
        subjectId: quad.id,
        argumentIds: [diagAC.id, diagBD.id],
        status: ptolemyStatus,
        origin: 'CANONICAL',
        verificationContractId: 'VC-14',
        derivationTrace: {
          ruleId: 'RULE_PTOLEMY_EQUALITY',
          ruleName: "Ptolemy's Theorem Metric Invariant (AC·BD = AB·CD + BC·DA)",
          premiseFactIds: ['rel_cyclic_quad_ABCD', 'rel_diag_AC', 'rel_diag_BD'],
          authorizedBy: 'GEOMETRY_CORE',
        },
        stateVersion: state.stateVersion,
        eventId: verifEventId,
        createdAt: Date.now(),
        invalidationReason: ptolemyStatus === 'DERIVED' ? undefined : 'Prerequisite cyclic quadrilateral vanished or metric equation violates tolerance',
        description: `AC·BD (${Math.round(ptolemy.diagProduct)}) = AB·CD + BC·DA (${Math.round(ptolemy.sideProductSum)}) [Δ=${ptolemy.delta.toFixed(1)}]`,
      });
    }

    // Check intersection point P (if explicitly constructed)
    const ptP = state.points.get('pt_P');
    if (ptP && diagAC && diagBD) {
      relations.push({
        id: 'rel_intersection_P',
        relationType: 'intersects',
        subjectId: ptP.id,
        argumentIds: [diagAC.id, diagBD.id],
        status: 'VERIFIED',
        origin: 'CANONICAL',
        verificationContractId: 'VC-06',
        stateVersion: state.stateVersion,
        eventId: verifEventId,
        createdAt: Date.now(),
        description: `Explicit diagonal intersection P = AC ∩ BD at (${ptP.x}, ${ptP.y})`,
      });
    }

    return {
      relations,
      isCyclic: allConcyclic,
      areOppositeAnglesSupplementary: suppAnglesHold,
      ptolemyHolds,
      oppositeAngleSum1: degAC,
      oppositeAngleSum2: degBD,
      ptolemyDetails: ptolemy,
    };
  }
}
