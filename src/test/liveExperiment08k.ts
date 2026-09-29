import { GeometryCore } from '../engines/geometryCore';
import { GeometryState } from '../engines/geometryState';
import { SOLGateway } from '../engines/solGateway';
import { VerificationLayer } from '../engines/verificationLayer';
import { RelationGraph } from '../engines/relationGraph';

const sol = SOLGateway.getInstance();
const state = GeometryState.getInstance();
const graph = RelationGraph.getInstance();

const toDeg = (rad: number) => (rad * 180) / Math.PI;

console.log('================================================================');
console.log('CQNS-001 PHASE 08K LIVE GEOMETRY EXPERIMENTAL RUN');
console.log('================================================================\n');

// E01: Opposite Angles
sol.resetToCanon();
console.log('--- E01: Opposite Angles of Cyclic Quadrilateral ---');
const anglesCalc = () => {
  const pA = state.points.get('pt_A')!;
  const pB = state.points.get('pt_B')!;
  const pC = state.points.get('pt_C')!;
  const pD = state.points.get('pt_D')!;
  const degA = toDeg(GeometryCore.angleAtVertex(pA, pD, pB));
  const degB = toDeg(GeometryCore.angleAtVertex(pB, pA, pC));
  const degC = toDeg(GeometryCore.angleAtVertex(pC, pB, pD));
  const degD = toDeg(GeometryCore.angleAtVertex(pD, pC, pA));
  return {
    A: `(${pA.x}, ${pA.y})`, B: `(${pB.x}, ${pB.y})`, C: `(${pC.x}, ${pC.y})`, D: `(${pD.x}, ${pD.y})`,
    degA: +degA.toFixed(3), degB: +degB.toFixed(3), degC: +degC.toFixed(3), degD: +degD.toFixed(3),
    sumAC: +(degA + degC).toFixed(3), sumBD: +(degB + degD).toFixed(3),
    resAC: +Math.abs(degA + degC - 180).toFixed(4), resBD: +Math.abs(degB + degD - 180).toFixed(4)
  };
};

console.log('Config 1 (Canonical):', anglesCalc());
sol.movePoint('pt_A', Math.round(160 * Math.cos(70 * Math.PI / 180)), Math.round(160 * Math.sin(70 * Math.PI / 180)));
console.log('Config 2 (Move A to 70 deg):', anglesCalc());
sol.movePoint('pt_B', Math.round(160 * Math.cos(150 * Math.PI / 180)), Math.round(160 * Math.sin(150 * Math.PI / 180)));
console.log('Config 3 (Move B to 150 deg):', anglesCalc());
sol.movePoint('pt_C', Math.round(160 * Math.cos(245 * Math.PI / 180)), Math.round(160 * Math.sin(245 * Math.PI / 180)));
console.log('Config 4 (Move C to 245 deg):', anglesCalc());
sol.movePoint('pt_D', Math.round(160 * Math.cos(330 * Math.PI / 180)), Math.round(160 * Math.sin(330 * Math.PI / 180)));
console.log('Config 5 (Move D to 330 deg):', anglesCalc());

// E02: Diameter -> Right Angle
console.log('\n--- E02: Diameter -> Right Angle (Thales) ---');
sol.resetToCanon();
// Set AC as exact diameter
sol.movePoint('pt_A', -160, 0); // 180 deg
sol.movePoint('pt_C', 160, 0);  // 0 deg
const thalesCalc = (name: string) => {
  const pA = state.points.get('pt_A')!;
  const pB = state.points.get('pt_B')!;
  const pC = state.points.get('pt_C')!;
  const pD = state.points.get('pt_D')!;
  const distAC = GeometryCore.distance(pA, pC);
  const angB = toDeg(GeometryCore.angleAtVertex(pB, pA, pC));
  const angD = toDeg(GeometryCore.angleAtVertex(pD, pA, pC));
  return {
    case: name,
    AC_length: +distAC.toFixed(2),
    is_2R: distAC === 320,
    B_pos: `(${pB.x}, ${pB.y})`,
    D_pos: `(${pD.x}, ${pD.y})`,
    angB: +angB.toFixed(3),
    resB: +Math.abs(angB - 90).toFixed(4),
    angD: +angD.toFixed(3),
    resD: +Math.abs(angD - 90).toFixed(4)
  };
};

console.log(thalesCalc('B at canonical 135 deg, D at canonical 315 deg'));
sol.movePoint('pt_B', Math.round(160 * Math.cos(60 * Math.PI / 180)), Math.round(160 * Math.sin(60 * Math.PI / 180)));
console.log(thalesCalc('B moved to 60 deg'));
sol.movePoint('pt_D', Math.round(160 * Math.cos(270 * Math.PI / 180)), Math.round(160 * Math.sin(270 * Math.PI / 180)));
console.log(thalesCalc('D moved to 270 deg (bottom)'));

// E03: Reverse Diameter Criterion
console.log('\n--- E03: Reverse Diameter Criterion ---');
const pA3 = { id: 'pA', name: 'A', x: -160, y: 0, role: 'vertex' as const };
const pB3 = { id: 'pB', name: 'B', x: 0, y: 160, role: 'vertex' as const };
const pC3 = { id: 'pC', name: 'C', x: 160, y: 0, role: 'vertex' as const };
const angB3 = toDeg(GeometryCore.angleAtVertex(pB3, pA3, pC3));
const midAC = { x: (pA3.x + pC3.x) / 2, y: (pA3.y + pC3.y) / 2 };
const rA = Math.hypot(pA3.x - midAC.x, pA3.y - midAC.y);
const rB = Math.hypot(pB3.x - midAC.x, pB3.y - midAC.y);
const rC = Math.hypot(pC3.x - midAC.x, pC3.y - midAC.y);
console.log('E03 Results:', {
  angB: +angB3.toFixed(3),
  midpointAC: midAC,
  distToA: rA, distToB: rB, distToC: rC,
  concyclicOnMidpointCircle: rA === rB && rB === rC,
  isDiameter: GeometryCore.distance(pA3, pC3) === 2 * rA
});

// E04: Cyclicity Criterion via Opposite Angles
console.log('\n--- E04: Cyclicity Criterion via Opposite Angles ---');
const testQuad = (pA: any, pB: any, pC: any, pD: any, label: string) => {
  const degA = toDeg(GeometryCore.angleAtVertex(pA, pD, pB));
  const degB = toDeg(GeometryCore.angleAtVertex(pB, pA, pC));
  const degC = toDeg(GeometryCore.angleAtVertex(pC, pB, pD));
  const degD = toDeg(GeometryCore.angleAtVertex(pD, pC, pA));
  const sumAC = degA + degC;
  const sumBD = degB + degD;
  const midAB = { x: (pA.x + pB.x)/2, y: (pA.y + pB.y)/2 };
  const dAB = { x: pB.x - pA.x, y: pB.y - pA.y };
  const midBC = { x: (pB.x + pC.x)/2, y: (pB.y + pC.y)/2 };
  const dBC = { x: pC.x - pB.x, y: pC.y - pB.y };
  const p1 = midAB, p2 = { x: midAB.x - dAB.y, y: midAB.y + dAB.x };
  const p3 = midBC, p4 = { x: midBC.x - dBC.y, y: midBC.y + dBC.x };
  const circumO = GeometryCore.lineIntersection(p1 as any, p2 as any, p3 as any, p4 as any)!;
  const circumR = Math.hypot(pA.x - circumO.x, pA.y - circumO.y);
  const distDToO = Math.hypot(pD.x - circumO.x, pD.y - circumO.y);
  const devD = Math.abs(distDToO - circumR);
  return {
    label,
    degA: +degA.toFixed(2),
    degB: +degB.toFixed(2),
    degC: +degC.toFixed(2),
    degD: +degD.toFixed(2),
    sumAC: +sumAC.toFixed(2),
    sumBD: +sumBD.toFixed(2),
    circumCenter: { x: +circumO.x.toFixed(2), y: +circumO.y.toFixed(2) },
    circumRadius: +circumR.toFixed(2),
    distDToO: +distDToO.toFixed(2),
    devD: +devD.toFixed(4),
    isCyclic: devD < 0.1
  };
};

console.log('Case 1 (Arbitrary Non-cyclic in R2):', testQuad({x: 100, y: 120, id: 'a', name: 'A', role: 'vertex'} as any, {x: -110, y: 100, id: 'b', name: 'B', role: 'vertex'} as any, {x: -100, y: -120, id: 'c', name: 'C', role: 'vertex'} as any, {x: 80, y: -220, id: 'd', name: 'D', role: 'vertex'} as any, 'Arbitrary non-cyclic'));
console.log('Case 2 (Rectangle 200x120 in R2):', testQuad({x: 100, y: 60, id: 'a', name: 'A', role: 'vertex'} as any, {x: -100, y: 60, id: 'b', name: 'B', role: 'vertex'} as any, {x: -100, y: -60, id: 'c', name: 'C', role: 'vertex'} as any, {x: 100, y: -60, id: 'd', name: 'D', role: 'vertex'} as any, 'Rectangle 200x120'));

// E05: Ptolemy Invariant
console.log('\n--- E05: Ptolemy Invariant Tracking (5 Configurations) ---');
sol.resetToCanon();
sol.addBothDiagonals('quad_ABCD');
const ptolemyCalc = (confName: string) => {
  const pA = state.points.get('pt_A')!;
  const pB = state.points.get('pt_B')!;
  const pC = state.points.get('pt_C')!;
  const pD = state.points.get('pt_D')!;
  const ab = GeometryCore.distance(pA, pB);
  const bc = GeometryCore.distance(pB, pC);
  const cd = GeometryCore.distance(pC, pD);
  const da = GeometryCore.distance(pD, pA);
  const ac = GeometryCore.distance(pA, pC);
  const bd = GeometryCore.distance(pB, pD);
  const L = ac * bd;
  const R = ab * cd + bc * da;
  const residual = Math.abs(L - R);
  const rel = graph.get('rel_ptolemy_metric');
  return {
    conf: confName,
    AC: +ac.toFixed(2), BD: +bd.toFixed(2),
    AB: +ab.toFixed(2), BC: +bc.toFixed(2), CD: +cd.toFixed(2), DA: +da.toFixed(2),
    L: +L.toFixed(2), R: +R.toFixed(2),
    residual: +residual.toFixed(4),
    status: rel?.status
  };
};

console.log('Ptolemy 1 (Canonical):', ptolemyCalc('Canonical'));
sol.movePoint('pt_A', Math.round(160 * Math.cos(45 * Math.PI / 180)), Math.round(160 * Math.sin(45 * Math.PI / 180)));
console.log('Ptolemy 2 (A=45 deg):', ptolemyCalc('A at 45 deg'));
sol.movePoint('pt_B', Math.round(160 * Math.cos(120 * Math.PI / 180)), Math.round(160 * Math.sin(120 * Math.PI / 180)));
console.log('Ptolemy 3 (B=120 deg):', ptolemyCalc('B at 120 deg'));
sol.movePoint('pt_C', Math.round(160 * Math.cos(210 * Math.PI / 180)), Math.round(160 * Math.sin(210 * Math.PI / 180)));
console.log('Ptolemy 4 (C=210 deg):', ptolemyCalc('C at 210 deg'));
sol.movePoint('pt_D', Math.round(160 * Math.cos(300 * Math.PI / 180)), Math.round(160 * Math.sin(300 * Math.PI / 180)));
console.log('Ptolemy 5 (D=300 deg):', ptolemyCalc('D at 300 deg'));

// Ptolemy Break: Move D off circle
sol.setVertexMode('RESEARCH');
sol.movePoint('pt_D', 0, -250);
console.log('Ptolemy Break (D off circle to (0, -250)):', ptolemyCalc('D off circle'));
// Return D
sol.movePoint('pt_D', 113, -113);
console.log('Ptolemy Returned D (before explicit verify):', ptolemyCalc('D returned'));
sol.syncEvaluation();
console.log('Ptolemy After Explicit Verify:', ptolemyCalc('D returned & verified'));

// E06: Circumcenter from Perpendicular Bisectors
console.log('\n--- E06: Circumcenter from Perpendicular Bisectors ---');
sol.resetToCanon();
const pA6 = state.points.get('pt_A')!;
const pB6 = state.points.get('pt_B')!;
const pC6 = state.points.get('pt_C')!;
const pD6 = state.points.get('pt_D')!;
// Bisector 1 of chord AB:
const mAB = { x: (pA6.x + pB6.x)/2, y: (pA6.y + pB6.y)/2 };
const dAB = { x: pB6.x - pA6.x, y: pB6.y - pA6.y };
const bisAB_p1 = mAB;
const bisAB_p2 = { x: mAB.x - dAB.y, y: mAB.y + dAB.x };

// Bisector 2 of chord BC:
const mBC = { x: (pB6.x + pC6.x)/2, y: (pB6.y + pC6.y)/2 };
const dBC = { x: pC6.x - pB6.x, y: pC6.y - pB6.y };
const bisBC_p1 = mBC;
const bisBC_p2 = { x: mBC.x - dBC.y, y: mBC.y + dBC.x };

// Bisector 3 of chord CD:
const mCD = { x: (pC6.x + pD6.x)/2, y: (pC6.y + pD6.y)/2 };
const dCD = { x: pD6.x - pC6.x, y: pD6.y - pC6.y };
const bisCD_p1 = mCD;
const bisCD_p2 = { x: mCD.x - dCD.y, y: mCD.y + dCD.x };

const centerO = GeometryCore.lineIntersection(bisAB_p1 as any, bisAB_p2 as any, bisBC_p1 as any, bisBC_p2 as any)!;
const distOA = GeometryCore.distance(pA6, centerO as any);
const distOB = GeometryCore.distance(pB6, centerO as any);
const distOC = GeometryCore.distance(pC6, centerO as any);
const distOD = GeometryCore.distance(pD6, centerO as any);
console.log('E06 Bisectors Intersection O (bisAB ∩ bisBC):', {
  centerO: { x: +centerO.x.toFixed(4), y: +centerO.y.toFixed(4) },
  OA: +distOA.toFixed(4),
  OB: +distOB.toFixed(4),
  OC: +distOC.toFixed(4),
  OD: +distOD.toFixed(4),
  diffOA_OB: +Math.abs(distOA - distOB).toFixed(4),
  diffOB_OC: +Math.abs(distOB - distOC).toFixed(4),
  diffOC_OD: +Math.abs(distOC - distOD).toFixed(4)
});

// E08: Dynamic Dependencies & DAG
console.log('\n--- E08: Dynamic Dependencies & Living DAG Test ---');
sol.resetToCanon();
sol.addBothDiagonals('quad_ABCD');
sol.constructIntersection('diag_AC', 'diag_BD');
const parRes = sol.constructParallel('pt_P', 'seg_AB');
const compassRes = sol.constructCompass('pt_P', 'pt_A', 'pt_B');
console.log('E08 Initial Setup:', {
  parLineId: parRes.entityId,
  compassCircleId: compassRes.entityId,
  pointsCount: state.points.size,
  segmentsCount: state.segments.size,
  circlesCount: state.circles.size
});

// Move A
const compassBefore = state.circles.get(compassRes.entityId!)!;
const rBefore = compassBefore.radius;
sol.movePoint('pt_A', 100, 125);
const compassAfter = state.circles.get(compassRes.entityId!)!;
const rAfter = compassAfter.radius;
const ptP = state.points.get('pt_P')!;
console.log('E08 After Move(A):', {
  newCenterP: { x: ptP.x, y: ptP.y },
  compassRadiusBefore: rBefore,
  compassRadiusAfter: rAfter,
  sameCircleId: compassAfter.id === compassRes.entityId,
  sameCenterId: compassAfter.centerId === 'pt_P'
});

// E09: INVALID vs VANISHED Lifecycle
console.log('\n--- E09: INVALID vs VANISHED Lifecycle ---');
sol.resetToCanon();
console.log('Step 1 (Canonical):', graph.get('rel_cyclic_quad_ABCD')?.status);
sol.setVertexMode('RESEARCH');
sol.movePoint('pt_D', 0, -250);
console.log('Step 2 (Move D off circle):', graph.get('rel_cyclic_quad_ABCD')?.status);
sol.movePoint('pt_D', 113, -113);
console.log('Step 3 (Return D onto circle without verify):', graph.get('rel_cyclic_quad_ABCD')?.status);
sol.syncEvaluation();
console.log('Step 4 (Explicit Verify via syncEvaluation):', graph.get('rel_cyclic_quad_ABCD')?.status);
