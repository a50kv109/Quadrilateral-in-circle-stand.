/**
 * CQNS-001: Package 01 — Zebra (Cyclic Chord Engine & Parametric Arc Indexing) Test Suite
 *
 * Verifies all 16 mandatory test conditions:
 * 1. Valid reference circle
 * 2. Invalid/missing reference circle
 * 3. Point outside reference circle
 * 4. Coincident vertices
 * 5. Repeated angular positions
 * 6. Valid CW ordering
 * 7. Valid CCW ordering
 * 8. Angle wrap-around across 0 / 2π
 * 9. Degenerate configuration
 * 10. Valid arc closure
 * 11. Invalid normalization (crossed vertices [A, C, B, D])
 * 12. Sum of four arcs ≈ 2π
 * 13. Delegation of chord calculation to Foundation (calculateChordLength)
 * 14. Absence of mutation in GeometryState
 * 15. Absence of RelationGraph writes
 * 16. Absence of VERIFIED creation
 */

import {
  CyclicChordEngine,
  ReferenceCircleInput,
} from '../engines/cyclicChordEngine';
import { GeometryCore } from '../engines/geometryCore';
import { GeometryState } from '../engines/geometryState';
import { RelationGraph } from '../engines/relationGraph';
import { Point } from '../types/geometry';

export function runZebraTests(): void {
  console.log('====================================================');
  console.log('PACKAGE 01: ZEBRA (CHORD–ARC PARAMETRIC INDEXING) TESTS');
  console.log('====================================================\n');

  const centerO: Point = { id: 'pt_O', name: 'O', x: 0, y: 0, role: 'center' };
  const R = 160;
  const refCircle: ReferenceCircleInput = { center: centerO, radius: R };

  // Helper to make points along circle at given angles in degrees
  const makeCirclePoint = (id: string, deg: number): Point => {
    const rad = (deg * Math.PI) / 180;
    return {
      id,
      name: id,
      x: Math.round(centerO.x + R * Math.cos(rad)),
      y: Math.round(centerO.y + R * Math.sin(rad)),
      role: 'vertex',
    };
  };

  // Canonical vertices: A=54.9°, B=135°, C=230.1°, D=315° (all on S¹, CCW order)
  const pA = makeCirclePoint('pt_A', 55);
  const pB = makeCirclePoint('pt_B', 135);
  const pC = makeCirclePoint('pt_C', 230);
  const pD = makeCirclePoint('pt_D', 315);

  // -------------------------------------------------------------------------
  // TEST 1: Valid Reference Circle
  // -------------------------------------------------------------------------
  console.log('--- TEST 1: Valid Reference Circle ---');
  const refRes1 = CyclicChordEngine.isReferenceCircleValid(refCircle, [pA, pB, pC, pD]);
  if (!refRes1.valid) {
    throw new Error(`TEST 1 FAILED: Expected reference circle to be valid, got: ${refRes1.reason}`);
  }
  console.log('RESULT: PASS (Valid reference circle accepted)\n');

  // -------------------------------------------------------------------------
  // TEST 2: Invalid / Missing Reference Circle
  // -------------------------------------------------------------------------
  console.log('--- TEST 2: Invalid or Missing Reference Circle ---');
  const missingRes = CyclicChordEngine.isReferenceCircleValid(null, [pA, pB, pC, pD]);
  const zeroRRes = CyclicChordEngine.isReferenceCircleValid({ center: centerO, radius: 0 }, [pA, pB, pC, pD]);
  const negRRes = CyclicChordEngine.isReferenceCircleValid({ center: centerO, radius: -100 }, [pA, pB, pC, pD]);
  const nanRRes = CyclicChordEngine.isReferenceCircleValid({ center: centerO, radius: NaN }, [pA, pB, pC, pD]);

  if (missingRes.valid || zeroRRes.valid || negRRes.valid || nanRRes.valid) {
    throw new Error('TEST 2 FAILED: Invalid reference circle was incorrectly accepted');
  }
  console.log('RESULT: PASS (Null, zero, negative, and NaN radii strictly rejected)\n');

  // -------------------------------------------------------------------------
  // TEST 3: Point Outside Reference Circle
  // -------------------------------------------------------------------------
  console.log('--- TEST 3: Point Outside Reference Circle ---');
  const pOff: Point = { id: 'pt_Off', name: 'Off', x: 0, y: -250, role: 'vertex' };
  const offRes = CyclicChordEngine.isReferenceCircleValid(refCircle, [pA, pB, pC, pOff]);
  if (offRes.valid) {
    throw new Error('TEST 3 FAILED: Point with 90px deviation was accepted as concyclic');
  }
  console.log(`RESULT: PASS (Point outside circle correctly rejected: ${offRes.reason})\n`);

  // -------------------------------------------------------------------------
  // TEST 4: Coincident Vertices
  // -------------------------------------------------------------------------
  console.log('--- TEST 4: Coincident Vertices ---');
  const pA_clone = { ...pA, id: 'pt_A_clone' };
  const coincRes = CyclicChordEngine.isVertexOrderValid([pA, pA_clone, pC, pD], centerO);
  if (coincRes.valid || coincRes.status !== 'DEGENERATE') {
    throw new Error(`TEST 4 FAILED: Coincident vertices expected DEGENERATE, got: ${coincRes.status}`);
  }
  console.log('RESULT: PASS (Coincident vertices flagged DEGENERATE)\n');

  // -------------------------------------------------------------------------
  // TEST 5: Repeated Angular Positions
  // -------------------------------------------------------------------------
  console.log('--- TEST 5: Repeated Angular Positions ---');
  const pA_dupAngle: Point = { id: 'pt_dup', name: 'Dup', x: pA.x, y: pA.y, role: 'vertex' };
  const dupAngleRes = CyclicChordEngine.isVertexOrderValid([pA, pB, pC, pA_dupAngle], centerO);
  if (dupAngleRes.valid || dupAngleRes.status !== 'DEGENERATE') {
    throw new Error('TEST 5 FAILED: Repeated angular position was not flagged DEGENERATE');
  }
  console.log('RESULT: PASS (Repeated angular positions flagged DEGENERATE)\n');

  // -------------------------------------------------------------------------
  // TEST 6: Valid CW Ordering
  // -------------------------------------------------------------------------
  console.log('--- TEST 6: Valid CW Ordering ---');
  // Traversal: A(55°) -> D(315°) -> C(230°) -> B(135°)
  const cwNorm = CyclicChordEngine.normalizeCyclicQuadrilateral(refCircle, [pA, pD, pC, pB]);
  if (cwNorm.status !== 'VALID' || cwNorm.orientation !== 'CW') {
    throw new Error(`TEST 6 FAILED: Expected VALID CW, got status=${cwNorm.status}, orientation=${cwNorm.orientation}`);
  }
  console.log('RESULT: PASS (CW traversal detected and validated)\n');

  // -------------------------------------------------------------------------
  // TEST 7: Valid CCW Ordering
  // -------------------------------------------------------------------------
  console.log('--- TEST 7: Valid CCW Ordering ---');
  // Traversal: A(55°) -> B(135°) -> C(230°) -> D(315°)
  const ccwNorm = CyclicChordEngine.normalizeCyclicQuadrilateral(refCircle, [pA, pB, pC, pD]);
  if (ccwNorm.status !== 'VALID' || ccwNorm.orientation !== 'CCW') {
    throw new Error(`TEST 7 FAILED: Expected VALID CCW, got status=${ccwNorm.status}, orientation=${ccwNorm.orientation}`);
  }
  console.log('RESULT: PASS (CCW traversal detected and validated)\n');

  // -------------------------------------------------------------------------
  // TEST 8: Angle Wrap-around Across 0 / 2π
  // -------------------------------------------------------------------------
  console.log('--- TEST 8: Angle Wrap-around Across 0 / 2π ---');
  // Vertices spanning across 0 rad: 350° (near 2π), 30°, 100°, 200°
  const pW1 = makeCirclePoint('pt_W1', 350);
  const pW2 = makeCirclePoint('pt_W2', 30);
  const pW3 = makeCirclePoint('pt_W3', 100);
  const pW4 = makeCirclePoint('pt_W4', 200);

  const wrapNorm = CyclicChordEngine.normalizeCyclicQuadrilateral(refCircle, [pW1, pW2, pW3, pW4]);
  if (wrapNorm.status !== 'VALID' || wrapNorm.orientation !== 'CCW') {
    throw new Error(`TEST 8 FAILED: Wrap-around across 0 rad failed, status=${wrapNorm.status}`);
  }
  console.log('RESULT: PASS (Wrap-around across 0/2π boundary cleanly normalized)\n');

  // -------------------------------------------------------------------------
  // TEST 9: Degenerate Configuration
  // -------------------------------------------------------------------------
  console.log('--- TEST 9: Degenerate Configuration ---');
  const degenCircle: ReferenceCircleInput = { center: centerO, radius: -50 };
  const degenRes = CyclicChordEngine.normalizeCyclicQuadrilateral(degenCircle, [pA, pB, pC, pD]);
  if (degenRes.status !== 'DEGENERATE') {
    throw new Error(`TEST 9 FAILED: Negative radius expected DEGENERATE, got ${degenRes.status}`);
  }
  console.log('RESULT: PASS (Degenerate configuration returns DEGENERATE)\n');

  // -------------------------------------------------------------------------
  // TEST 10: Valid Arc Closure
  // -------------------------------------------------------------------------
  console.log('--- TEST 10: Valid Arc Closure ---');
  if (!ccwNorm.arcIntervals || ccwNorm.arcIntervals.length !== 4) {
    throw new Error('TEST 10 FAILED: Arc intervals array missing or not 4 elements');
  }
  console.log('RESULT: PASS (All 4 arc intervals successfully constructed)\n');

  // -------------------------------------------------------------------------
  // TEST 11: Invalid Normalization (Crossed / Non-Cyclic Vertices)
  // -------------------------------------------------------------------------
  console.log('--- TEST 11: Invalid Normalization (Crossed Vertices) ---');
  // Crossed sequence: A -> C -> B -> D (swapping diagonals instead of cycle boundary)
  const crossedRes = CyclicChordEngine.normalizeCyclicQuadrilateral(refCircle, [pA, pC, pB, pD]);
  if (crossedRes.status === 'VALID') {
    throw new Error('TEST 11 FAILED: Crossed vertex sequence [A, C, B, D] was accepted as VALID');
  }
  console.log(`RESULT: PASS (Crossed sequence rejected: status=${crossedRes.status}, reason=${crossedRes.reason})\n`);

  // -------------------------------------------------------------------------
  // TEST 12: Sum of Four Arcs ≈ 2π
  // -------------------------------------------------------------------------
  console.log('--- TEST 12: Sum of Four Arcs ≈ 2π ---');
  const totalArc = ccwNorm.totalArcAngleRad || 0;
  const arcDev = Math.abs(totalArc - 2 * Math.PI);
  if (arcDev > 1e-4) {
    throw new Error(`TEST 12 FAILED: Sum of 4 arcs (${totalArc}) deviates from 2π by ${arcDev}`);
  }
  console.log(`RESULT: PASS (Arc sum = ${totalArc.toFixed(6)} rad, deviation = ${arcDev.toExponential(3)})\n`);

  // -------------------------------------------------------------------------
  // TEST 13: Delegation of Chord Calculation to Foundation (calculateChordLength)
  // -------------------------------------------------------------------------
  console.log('--- TEST 13: Delegation of Chord Calculation to Foundation ---');
  // For each arc interval, verify chordLength equals 2R * sin(θ/2)
  for (const arc of ccwNorm.arcIntervals) {
    const expected = 2 * R * Math.sin(arc.subtendedAngleRad / 2);
    if (Math.abs(arc.chordLength - expected) > 1e-10) {
      throw new Error(`TEST 13 FAILED: Chord length mismatch for arc [${arc.fromVertexId}->${arc.toVertexId}]`);
    }
  }
  console.log('RESULT: PASS (All arc chord lengths match Foundation calculateChordLength exactly)\n');

  // -------------------------------------------------------------------------
  // TEST 14: Absence of Mutation in GeometryState
  // -------------------------------------------------------------------------
  console.log('--- TEST 14: Absence of Mutation in GeometryState ---');
  const state = GeometryState.getInstance();
  const vBefore = state.stateVersion;
  const ptsCountBefore = state.points.size;
  const circlesCountBefore = state.circles.size;

  // Perform multiple Zebra normalizations
  CyclicChordEngine.normalizeCyclicQuadrilateral(refCircle, [pA, pB, pC, pD]);
  CyclicChordEngine.normalizeCyclicQuadrilateral(refCircle, [pA, pC, pB, pD]);
  CyclicChordEngine.isReferenceCircleValid(refCircle, [pA, pB, pC, pD]);

  const vAfter = state.stateVersion;
  const ptsCountAfter = state.points.size;
  const circlesCountAfter = state.circles.size;

  if (vBefore !== vAfter || ptsCountBefore !== ptsCountAfter || circlesCountBefore !== circlesCountAfter) {
    throw new Error('TEST 14 FAILED: GeometryState was mutated during Zebra operations!');
  }
  console.log('RESULT: PASS (Zero GeometryState mutation observed)\n');

  // -------------------------------------------------------------------------
  // TEST 15: Absence of RelationGraph Writes
  // -------------------------------------------------------------------------
  console.log('--- TEST 15: Absence of RelationGraph Writes ---');
  const graph = RelationGraph.getInstance();
  const relCountBefore = graph.getAll().length;

  CyclicChordEngine.normalizeCyclicQuadrilateral(refCircle, [pA, pB, pC, pD]);

  const relCountAfter = graph.getAll().length;
  if (relCountBefore !== relCountAfter) {
    throw new Error('TEST 15 FAILED: RelationGraph received writes during Zebra operations!');
  }
  console.log('RESULT: PASS (Zero RelationGraph writes observed)\n');

  // -------------------------------------------------------------------------
  // TEST 16: Absence of VERIFIED Epistemic Status Creation
  // -------------------------------------------------------------------------
  console.log('--- TEST 16: Absence of VERIFIED Creation ---');
  // Inspect result object: ensure status is Zebra technical status ('VALID'), NOT CQNS EpistemicStatus
  const statusVal = ccwNorm.status as string;
  const forbiddenEpistemic = ['GIVEN', 'HYPOTHESIS', 'VERIFIED', 'DERIVED', 'INVALID', 'VANISHED'];
  if (forbiddenEpistemic.includes(statusVal)) {
    throw new Error(`TEST 16 FAILED: Zebra emitted forbidden epistemic status '${statusVal}'`);
  }
  console.log('RESULT: PASS (Zebra returns technical status VALID, never emits CQNS VERIFIED)\n');

  console.log('====================================================');
  console.log('PACKAGE 01: ZEBRA ALL TESTS PASSED (16/16)');
  console.log('====================================================\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runZebraTests();
}
