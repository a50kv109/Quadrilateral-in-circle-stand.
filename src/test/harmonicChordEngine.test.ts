/**
 * CQNS-001: Package 02 — Harmonic Research Module (Test Suite)
 * Classification: RESEARCH / EXPERIMENTAL ONLY
 *
 * Verifies all 21 mandatory test conditions:
 * 1. Correctness of N=4 DFT
 * 2. Uniform square / uniform arc sequence
 * 3. Asymmetric sequence
 * 4. Amplitude calculation
 * 5. Phase calculation
 * 6. PHASE_UNDEFINED on sub-threshold amplitude
 * 7. secondHarmonicDeltaPhi = PHASE_UNDEFINED
 * 8. Valid CYCLIC_ARC_SEQUENCE
 * 9. Invalid normalization (point off circle)
 * 10. Degenerate input
 * 11. ARBITRARY_TRIANGULATION_CIRCUMCIRCLE with non-collinear A,B,C and D concyclic
 * 12. A,B,C collinear -> DEGENERATE
 * 13. D outside circumcircle tolerance -> NORMALIZATION_UNAVAILABLE
 * 14. UNKNOWN input
 * 15. CW orientation
 * 16. CCW orientation
 * 17. Angular origin
 * 18. stateVersion fidelity
 * 19. Absence of GeometryState mutation
 * 20. Absence of RelationGraph writes
 * 21. Absence of VERIFIED creation (RESEARCH_ONLY status)
 */

import { HarmonicChordEngine } from '../engines/harmonicChordEngine';
import { GeometryState } from '../engines/geometryState';
import { SOLGateway } from '../engines/solGateway';
import { RelationGraph } from '../engines/relationGraph';
import { Point } from '../types/geometry';

export function runHarmonicTests(): void {
  console.log('====================================================');
  console.log('PACKAGE 02: HARMONIC RESEARCH (DFT-4 TELEMETRY) TESTS');
  console.log('====================================================\n');

  // -------------------------------------------------------------------------
  // TEST 1: Correctness of N=4 DFT
  // -------------------------------------------------------------------------
  console.log('--- TEST 1: N=4 DFT Mathematical Correctness ---');
  // Input: [1, 2, 3, 4]
  // X0 = 10
  // X1 = (1-3) - i(2-4) = -2 + 2i => |X1| = sqrt(8) ≈ 2.828427
  // X2 = (1+3) - (2+4) = -2 => |X2| = 2
  // X3 = (1-3) + i(2-4) = -2 - 2i => |X3| = sqrt(8) ≈ 2.828427
  const dft1 = HarmonicChordEngine.computeDFT4([1, 2, 3, 4]);
  if (Math.abs(dft1.amplitudes[0] - 10) > 1e-9) {
    throw new Error(`TEST 1 FAILED: X0 amplitude mismatch, got ${dft1.amplitudes[0]}`);
  }
  if (Math.abs(dft1.amplitudes[1] - Math.sqrt(8)) > 1e-9) {
    throw new Error(`TEST 1 FAILED: X1 amplitude mismatch, got ${dft1.amplitudes[1]}`);
  }
  if (Math.abs(dft1.amplitudes[2] - 2) > 1e-9) {
    throw new Error(`TEST 1 FAILED: X2 amplitude mismatch, got ${dft1.amplitudes[2]}`);
  }
  if (Math.abs(dft1.amplitudes[3] - Math.sqrt(8)) > 1e-9) {
    throw new Error(`TEST 1 FAILED: X3 amplitude mismatch, got ${dft1.amplitudes[3]}`);
  }
  console.log('RESULT: PASS (DFT-4 coefficients match analytical values)\n');

  // -------------------------------------------------------------------------
  // TEST 2: Uniform Square / Uniform Arc Sequence
  // -------------------------------------------------------------------------
  console.log('--- TEST 2: Uniform Square Arc Sequence ---');
  const piHalf = Math.PI / 2;
  const uniformDft = HarmonicChordEngine.computeDFT4([piHalf, piHalf, piHalf, piHalf]);
  if (Math.abs(uniformDft.amplitudes[0] - 2 * Math.PI) > 1e-9) {
    throw new Error('TEST 2 FAILED: DC component does not equal 2π');
  }
  if (
    uniformDft.amplitudes[1] > 1e-9 ||
    uniformDft.amplitudes[2] > 1e-9 ||
    uniformDft.amplitudes[3] > 1e-9
  ) {
    throw new Error('TEST 2 FAILED: Higher harmonics must be 0 for uniform square');
  }
  if (uniformDft.harmonicResidual !== 0) {
    throw new Error(`TEST 2 FAILED: Expected residual 0, got ${uniformDft.harmonicResidual}`);
  }
  console.log('RESULT: PASS (Uniform square has zero higher harmonic energy)\n');

  // -------------------------------------------------------------------------
  // TEST 3: Asymmetric Arc Sequence
  // -------------------------------------------------------------------------
  console.log('--- TEST 3: Asymmetric Arc Sequence ---');
  const asymArcs: [number, number, number, number] = [1.0, 1.2, 1.8, 2 * Math.PI - 4.0];
  const asymDft = HarmonicChordEngine.computeDFT4(asymArcs);
  if (asymDft.amplitudes[1] <= 1e-4 || asymDft.harmonicResidual <= 1e-4) {
    throw new Error('TEST 3 FAILED: Asymmetric sequence expected non-zero higher harmonics');
  }
  console.log(`RESULT: PASS (Asymmetric sequence produced residual ${asymDft.harmonicResidual.toFixed(4)})\n`);

  // -------------------------------------------------------------------------
  // TEST 4: Amplitude Calculation
  // -------------------------------------------------------------------------
  console.log('--- TEST 4: Amplitude Calculation ---');
  for (let k = 0; k < 4; k++) {
    const expectedAmp = Math.sqrt(asymDft.re[k] * asymDft.re[k] + asymDft.im[k] * asymDft.im[k]);
    if (Math.abs(asymDft.amplitudes[k] - expectedAmp) > 1e-12) {
      throw new Error(`TEST 4 FAILED: Amplitude formula mismatch at harmonic ${k}`);
    }
  }
  console.log('RESULT: PASS (All amplitudes strictly equal sqrt(Re^2 + Im^2))\n');

  // -------------------------------------------------------------------------
  // TEST 5: Phase Calculation
  // -------------------------------------------------------------------------
  console.log('--- TEST 5: Phase Calculation ---');
  // For [1, 2, 3, 4], X1 = -2 + 2i => phase is atan2(2, -2) = 3*pi/4
  const expectedPhase1 = Math.atan2(2, -2);
  if (typeof dft1.phases[1] !== 'number' || Math.abs(dft1.phases[1] - expectedPhase1) > 1e-9) {
    throw new Error(`TEST 5 FAILED: Phase calculation mismatch at k=1, got ${dft1.phases[1]}`);
  }
  console.log(`RESULT: PASS (Phase k=1 equals ${dft1.phases[1].toFixed(4)} rad)\n`);

  // -------------------------------------------------------------------------
  // TEST 6: PHASE_UNDEFINED on Sub-Threshold Amplitude
  // -------------------------------------------------------------------------
  console.log('--- TEST 6: PHASE_UNDEFINED on Sub-Threshold Amplitudes ---');
  // Uniform square has A1 = A2 = A3 = 0 < AMPLITUDE_THRESHOLD
  if (
    uniformDft.phases[1] !== 'PHASE_UNDEFINED' ||
    uniformDft.phases[2] !== 'PHASE_UNDEFINED' ||
    uniformDft.phases[3] !== 'PHASE_UNDEFINED'
  ) {
    throw new Error('TEST 6 FAILED: Sub-threshold amplitudes did not return PHASE_UNDEFINED');
  }
  console.log('RESULT: PASS (Sub-threshold amplitudes safely assigned PHASE_UNDEFINED)\n');

  // -------------------------------------------------------------------------
  // TEST 7: secondHarmonicDeltaPhi = PHASE_UNDEFINED
  // -------------------------------------------------------------------------
  console.log('--- TEST 7: secondHarmonicDeltaPhi Safety ---');
  if (uniformDft.secondHarmonicDeltaPhi !== 'PHASE_UNDEFINED') {
    throw new Error('TEST 7 FAILED: Expected secondHarmonicDeltaPhi to be PHASE_UNDEFINED for uniform quad');
  }
  console.log('RESULT: PASS (secondHarmonicDeltaPhi is PHASE_UNDEFINED when phases are undefined)\n');

  // -------------------------------------------------------------------------
  // TEST 8: Valid CYCLIC_ARC_SEQUENCE
  // -------------------------------------------------------------------------
  console.log('--- TEST 8: Valid CYCLIC_ARC_SEQUENCE ---');
  const sol = SOLGateway.getInstance();
  const state = GeometryState.getInstance();
  sol.resetToCanon();

  const cyclicRes = HarmonicChordEngine.analyzeCyclicArcSequence(state, 'quad_ABCD');
  if (cyclicRes.normalizationStatus !== 'VALID' || cyclicRes.inputModel !== 'CYCLIC_ARC_SEQUENCE') {
    throw new Error(`TEST 8 FAILED: Expected VALID CYCLIC_ARC_SEQUENCE, got ${cyclicRes.normalizationStatus}`);
  }
  if (Math.abs(cyclicRes.harmonicAmplitudes[0] - 2 * Math.PI) > 1e-4) {
    throw new Error('TEST 8 FAILED: DC amplitude not equal to 2π on canon');
  }
  console.log(`RESULT: PASS (Canon quad analyzed, DC = ${cyclicRes.harmonicAmplitudes[0].toFixed(4)} rad)\n`);

  // -------------------------------------------------------------------------
  // TEST 9: Invalid Normalization (Point D moved off circle)
  // -------------------------------------------------------------------------
  console.log('--- TEST 9: Invalid Normalization (Point D Off Circle) ---');
  sol.setVertexMode('RESEARCH');
  
  // Directly modify coordinates of D to bypass SOL/UI drag constraints to test math validation
  const ptDRef = state.points.get('pt_D')!;
  const originalX = ptDRef.x;
  const originalY = ptDRef.y;
  ptDRef.x = 0;
  ptDRef.y = -250;

  const invalidCyclicRes = HarmonicChordEngine.analyzeCyclicArcSequence(state, 'quad_ABCD');
  
  // Restore original position
  ptDRef.x = originalX;
  ptDRef.y = originalY;

  if (invalidCyclicRes.normalizationStatus === 'VALID') {
    throw new Error('TEST 9 FAILED: Point off circle was incorrectly marked VALID');
  }
  console.log(`RESULT: PASS (Non-concyclic quad rejected with status: ${invalidCyclicRes.normalizationStatus})\n`);

  // -------------------------------------------------------------------------
  // TEST 10: Degenerate Input
  // -------------------------------------------------------------------------
  console.log('--- TEST 10: Degenerate Input ---');
  const pA_deg: Point = { id: 'A', name: 'A', x: 0, y: 0, role: 'vertex' };
  const pB_deg: Point = { id: 'B', name: 'B', x: 0, y: 0, role: 'vertex' }; // Coincident!
  const pC_deg: Point = { id: 'C', name: 'C', x: 100, y: 0, role: 'vertex' };
  const pD_deg: Point = { id: 'D', name: 'D', x: 0, y: 100, role: 'vertex' };

  const degenRes = HarmonicChordEngine.analyzeArbitraryTriangulation([pA_deg, pB_deg, pC_deg, pD_deg]);
  if (degenRes.normalizationStatus !== 'DEGENERATE') {
    throw new Error(`TEST 10 FAILED: Coincident points expected DEGENERATE, got ${degenRes.normalizationStatus}`);
  }
  console.log('RESULT: PASS (Coincident vertices return DEGENERATE)\n');

  // -------------------------------------------------------------------------
  // TEST 11: ARBITRARY_TRIANGULATION_CIRCUMCIRCLE with Concyclic Points
  // -------------------------------------------------------------------------
  console.log('--- TEST 11: ARBITRARY_TRIANGULATION_CIRCUMCIRCLE (Concyclic) ---');
  // Points on circle center (0,0) radius 100: A(100, 0), B(0, 100), C(-100, 0), D(0, -100)
  const pA_circ: Point = { id: 'pA', name: 'pA', x: 100, y: 0, role: 'vertex' };
  const pB_circ: Point = { id: 'pB', name: 'pB', x: 0, y: 100, role: 'vertex' };
  const pC_circ: Point = { id: 'pC', name: 'pC', x: -100, y: 0, role: 'vertex' };
  const pD_circ: Point = { id: 'pD', name: 'pD', x: 0, y: -100, role: 'vertex' };

  const triValidRes = HarmonicChordEngine.analyzeArbitraryTriangulation([pA_circ, pB_circ, pC_circ, pD_circ]);
  if (triValidRes.normalizationStatus !== 'VALID') {
    throw new Error(`TEST 11 FAILED: Concyclic 4 points expected VALID, got ${triValidRes.normalizationStatus}`);
  }
  console.log('RESULT: PASS (Valid triangulation circumcircle normalized and analyzed)\n');

  // -------------------------------------------------------------------------
  // TEST 12: A,B,C Collinear -> DEGENERATE
  // -------------------------------------------------------------------------
  console.log('--- TEST 12: A,B,C Collinear in Triangulation Model ---');
  const pA_col: Point = { id: 'pA', name: 'pA', x: 0, y: 0, role: 'vertex' };
  const pB_col: Point = { id: 'pB', name: 'pB', x: 50, y: 50, role: 'vertex' };
  const pC_col: Point = { id: 'pC', name: 'pC', x: 100, y: 100, role: 'vertex' }; // Collinear!
  const pD_col: Point = { id: 'pD', name: 'pD', x: 20, y: 80, role: 'vertex' };

  const colRes = HarmonicChordEngine.analyzeArbitraryTriangulation([pA_col, pB_col, pC_col, pD_col]);
  if (colRes.normalizationStatus !== 'DEGENERATE') {
    throw new Error(`TEST 12 FAILED: Collinear points expected DEGENERATE, got ${colRes.normalizationStatus}`);
  }
  console.log('RESULT: PASS (Collinear A,B,C strictly returns DEGENERATE)\n');

  // -------------------------------------------------------------------------
  // TEST 13: Point D Outside Circumcircle Tolerance -> NORMALIZATION_UNAVAILABLE
  // -------------------------------------------------------------------------
  console.log('--- TEST 13: Point D Outside Circumcircle Tolerance ---');
  // A, B, C on circle R=100; D at (300, 300) far outside
  const pD_far: Point = { id: 'pD_far', name: 'pD_far', x: 300, y: 300, role: 'vertex' };
  const nonConcyclicRes = HarmonicChordEngine.analyzeArbitraryTriangulation([pA_circ, pB_circ, pC_circ, pD_far]);
  if (nonConcyclicRes.normalizationStatus !== 'NORMALIZATION_UNAVAILABLE') {
    throw new Error(`TEST 13 FAILED: D off circumcircle expected NORMALIZATION_UNAVAILABLE, got ${nonConcyclicRes.normalizationStatus}`);
  }
  if (nonConcyclicRes.harmonicAmplitudes[0] !== 0) {
    throw new Error('TEST 13 FAILED: Synthetic spectral data was generated for non-concyclic input!');
  }
  console.log('RESULT: PASS (Point D outside circumcircle tolerance strictly rejected without arc generation)\n');

  // -------------------------------------------------------------------------
  // TEST 14: UNKNOWN Input
  // -------------------------------------------------------------------------
  console.log('--- TEST 14: UNKNOWN Input Model ---');
  const unknownRes = HarmonicChordEngine.analyzeUnknown('UNKNOWN', 5);
  if (unknownRes.inputModel !== 'UNKNOWN' || unknownRes.normalizationStatus !== 'NORMALIZATION_UNAVAILABLE') {
    throw new Error('TEST 14 FAILED: UNKNOWN model did not return NORMALIZATION_UNAVAILABLE');
  }
  console.log('RESULT: PASS (UNKNOWN input returns safe default telemetry)\n');

  // -------------------------------------------------------------------------
  // TEST 15 & 16: CW and CCW Orientation Support
  // -------------------------------------------------------------------------
  console.log('--- TEST 15 & 16: CW and CCW Orientations ---');
  // CCW: pA(100,0) -> pB(0,100) -> pC(-100,0) -> pD(0,-100)
  const ccwRes = HarmonicChordEngine.analyzeArbitraryTriangulation([pA_circ, pB_circ, pC_circ, pD_circ]);
  if (ccwRes.orientation !== 'CCW') {
    throw new Error(`TEST 15 FAILED: Expected CCW orientation, got ${ccwRes.orientation}`);
  }

  // CW: pA(100,0) -> pD(0,-100) -> pC(-100,0) -> pB(0,100)
  const cwRes = HarmonicChordEngine.analyzeArbitraryTriangulation([pA_circ, pD_circ, pC_circ, pB_circ]);
  if (cwRes.orientation !== 'CW') {
    throw new Error(`TEST 16 FAILED: Expected CW orientation, got ${cwRes.orientation}`);
  }
  console.log('RESULT: PASS (Both CCW and CW orientations validated)\n');

  // -------------------------------------------------------------------------
  // TEST 17: Angular Origin
  // -------------------------------------------------------------------------
  console.log('--- TEST 17: Angular Origin ---');
  if (typeof ccwRes.angularOrigin !== 'number' || !Number.isFinite(ccwRes.angularOrigin)) {
    throw new Error('TEST 17 FAILED: Angular origin is not a finite number');
  }
  console.log(`RESULT: PASS (Angular origin = ${ccwRes.angularOrigin.toFixed(4)} rad)\n`);

  // -------------------------------------------------------------------------
  // TEST 18: stateVersion Fidelity
  // -------------------------------------------------------------------------
  console.log('--- TEST 18: stateVersion Fidelity ---');
  sol.resetToCanon();
  const canonState = GeometryState.getInstance();
  const canonHarmonic = HarmonicChordEngine.analyzeCyclicArcSequence(canonState, 'quad_ABCD');
  if (canonHarmonic.stateVersion !== canonState.stateVersion) {
    throw new Error(`TEST 18 FAILED: stateVersion mismatch (${canonHarmonic.stateVersion} !== ${canonState.stateVersion})`);
  }
  console.log(`RESULT: PASS (stateVersion ${canonHarmonic.stateVersion} strictly preserved)\n`);

  // -------------------------------------------------------------------------
  // TEST 19: Absence of Mutation in GeometryState
  // -------------------------------------------------------------------------
  console.log('--- TEST 19: Absence of GeometryState Mutation ---');
  const vBefore = canonState.stateVersion;
  const ptsCountBefore = canonState.points.size;
  const circCountBefore = canonState.circles.size;

  HarmonicChordEngine.analyzeCyclicArcSequence(canonState, 'quad_ABCD');
  HarmonicChordEngine.analyzeArbitraryTriangulation([pA_circ, pB_circ, pC_circ, pD_circ]);
  HarmonicChordEngine.analyzeUnknown('UNKNOWN', vBefore);

  if (
    canonState.stateVersion !== vBefore ||
    canonState.points.size !== ptsCountBefore ||
    canonState.circles.size !== circCountBefore
  ) {
    throw new Error('TEST 19 FAILED: GeometryState was mutated during Harmonic telemetry operations!');
  }
  console.log('RESULT: PASS (Zero GeometryState mutation observed)\n');

  // -------------------------------------------------------------------------
  // TEST 20: Absence of RelationGraph Writes
  // -------------------------------------------------------------------------
  console.log('--- TEST 20: Absence of RelationGraph Writes ---');
  const graph = RelationGraph.getInstance();
  const relCountBefore = graph.getAll().length;

  HarmonicChordEngine.analyzeCyclicArcSequence(canonState, 'quad_ABCD');
  HarmonicChordEngine.analyzeArbitraryTriangulation([pA_circ, pB_circ, pC_circ, pD_circ]);

  if (graph.getAll().length !== relCountBefore) {
    throw new Error('TEST 20 FAILED: RelationGraph received writes during Harmonic operations!');
  }
  console.log('RESULT: PASS (Zero RelationGraph writes observed)\n');

  // -------------------------------------------------------------------------
  // TEST 21: Absence of VERIFIED Creation (Strict RESEARCH_ONLY status)
  // -------------------------------------------------------------------------
  console.log('--- TEST 21: Strict RESEARCH_ONLY Status (No VERIFIED) ---');
  if (canonHarmonic.experimentalStatus !== 'RESEARCH_ONLY') {
    throw new Error(`TEST 21 FAILED: Expected RESEARCH_ONLY, got ${canonHarmonic.experimentalStatus}`);
  }
  const forbiddenEpistemic = ['GIVEN', 'HYPOTHESIS', 'VERIFIED', 'DERIVED', 'INVALID', 'VANISHED'];
  if (forbiddenEpistemic.includes(canonHarmonic.experimentalStatus as string)) {
    throw new Error('TEST 21 FAILED: Harmonic module emitted a CQNS epistemic status!');
  }
  console.log('RESULT: PASS (Output status is strictly RESEARCH_ONLY, zero epistemic status emitted)\n');

  console.log('====================================================');
  console.log('PACKAGE 02: HARMONIC RESEARCH ALL TESTS PASSED (21/21)');
  console.log('====================================================\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runHarmonicTests();
}
