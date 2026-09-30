/**
 * Pure Presentation Projection Engine
 * R2-05: Common Geometry Stand UI Shell
 * 
 * Maps UniversalGeometryState to renderable presentation models.
 * Strictly non-mutating, zero epistemic authority.
 */

import { UniversalGeometryState } from '../../kernel/state/geometryState';
import { CyclicInput, Point } from '../../types/geometry';
import { TopologyGuard, TopologyReport } from '../../kernel/topology/topologyGuard';
import { DisplayAngleMode, UIState } from '../types/uiTypes';

export interface PresentedVertex {
  readonly id: string;
  readonly index: number;
  readonly rawAngleRad: number;
  readonly normalizedAngleRad: number;
  readonly angleDeg: number;
  readonly formattedAngle: string;
  readonly cycleFraction: number; // u in [0, 1)
  readonly formattedCycleFraction: string;
  readonly cartesian: Point;
  readonly oppositeArcName: string;
}

export interface PresentedChord {
  readonly id: string;
  readonly p1: Point;
  readonly p2: Point;
  readonly startVertexId: string;
  readonly endVertexId: string;
  readonly angularGapRad: number;
  readonly angularGapDeg: number;
  readonly lengthMm: number;
  readonly arcFractionText: string;
  readonly strokeColor: string;
}

export interface PresentedDiagonal {
  readonly id: string;
  readonly p1: Point;
  readonly p2: Point;
  readonly startVertexId: string;
  readonly endVertexId: string;
  readonly lengthMm: number;
}

export interface PresentedInscribedAngle {
  readonly vertexId: string;
  readonly angleDeg: number;
  readonly subtendedArcDeg: number;
}

export interface DialTick {
  readonly angleDeg: number;
  readonly angleRad: number;
  readonly isMajor: boolean;
  readonly label: string | null;
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly labelX?: number;
  readonly labelY?: number;
}

export interface GeometryPresentationData {
  readonly center: Point;
  readonly radius: number;
  readonly diameter: number;
  readonly vertices: readonly PresentedVertex[];
  readonly chords: readonly PresentedChord[];
  readonly diagonals: readonly PresentedDiagonal[];
  readonly diagonalIntersection: Point | null;
  readonly inscribedAngles: readonly PresentedInscribedAngle[];
  readonly oppositeAngleSums: {
    readonly acSumDeg: number;
    readonly bdSumDeg: number;
  };
  readonly ptolemy: {
    readonly diagonalProduct: number;
    readonly oppositeProductSum: number;
    readonly matches: boolean;
  };
  readonly centerPosition: 'INSIDE' | 'ON CHORD' | 'OUTSIDE';
  readonly dialTicks: readonly DialTick[];
  readonly topologyReport: TopologyReport;
  readonly stateVersion: number;
  readonly provenance: string;
}

const VERTEX_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];
const CHORD_COLORS = [
  '#f59e0b', // Amber
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#ec4899', // Pink
];

export function formatAngle(rad: number, mode: DisplayAngleMode): string {
  const normRad = ((rad % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const deg = (normRad * 180) / Math.PI;

  switch (mode) {
    case 'RADIANS':
      return `${normRad.toFixed(2)} rad`;
    case 'FRACTIONS': {
      const u = normRad / (2 * Math.PI);
      return `u = ${u.toFixed(2)} (${Math.round(u * 100)}%)`;
    }
    case 'DEGREES':
    default:
      return `${deg.toFixed(1)}°`;
  }
}

export function projectGeometryState(
  state: UniversalGeometryState,
  uiState: UIState
): GeometryPresentationData {
  const topologyReport = TopologyGuard.validate(state);
  const isCyclic = state.domainProfile === 'CYCLIC';

  let center: Point = { id: 'O', x: 0, y: 0 };
  let radius = 160.0;
  const presentedVertices: PresentedVertex[] = [];

  if (isCyclic) {
    const cyclicInput = state.canonicalInputs as CyclicInput;
    center = cyclicInput.referenceCircle.center;
    radius = cyclicInput.referenceCircle.radius;
    const anglesRad = [...cyclicInput.angles];
    const N = anglesRad.length;

    for (let i = 0; i < N; i++) {
      const rawAngle = anglesRad[i];
      const normAngle = ((rawAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const deg = (normAngle * 180) / Math.PI;
      const u = normAngle / (2 * Math.PI);
      const id = VERTEX_LABELS[i] || `V${i + 1}`;

      const x = center.x + radius * Math.cos(normAngle);
      const y = center.y + radius * Math.sin(normAngle);

      presentedVertices.push({
        id,
        index: i,
        rawAngleRad: rawAngle,
        normalizedAngleRad: normAngle,
        angleDeg: deg,
        formattedAngle: formatAngle(normAngle, uiState.displayAngleMode),
        cycleFraction: u,
        formattedCycleFraction: `u = ${u.toFixed(2)} (${Math.round(u * 100)}% цикла)`,
        cartesian: { id, x, y },
        oppositeArcName: `противоположная дуга ${VERTEX_LABELS[(i + 1) % N]}${VERTEX_LABELS[(i + 2) % N]}${VERTEX_LABELS[(i + 3) % N]}`
      });
    }
  } else {
    // CARTESIAN profile (Research Mode / General polygons)
    const cartVertices = state.getDerivedCartesianVertices();
    const N = cartVertices.length;

    for (let i = 0; i < N; i++) {
      const v = cartVertices[i];
      const id = v.id || VERTEX_LABELS[i] || `V${i + 1}`;
      const rawAngle = Math.atan2(v.y - center.y, v.x - center.x);
      const normAngle = ((rawAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const deg = (normAngle * 180) / Math.PI;
      const u = normAngle / (2 * Math.PI);

      presentedVertices.push({
        id,
        index: i,
        rawAngleRad: rawAngle,
        normalizedAngleRad: normAngle,
        angleDeg: deg,
        formattedAngle: formatAngle(normAngle, uiState.displayAngleMode),
        cycleFraction: u,
        formattedCycleFraction: `u = ${u.toFixed(2)} (${Math.round(u * 100)}% цикла)`,
        cartesian: { id, x: v.x, y: v.y },
        oppositeArcName: `противоположная дуга ${VERTEX_LABELS[(i + 1) % N]}${VERTEX_LABELS[(i + 2) % N]}${VERTEX_LABELS[(i + 3) % N]}`
      });
    }
  }

  const N = presentedVertices.length;

  // Chords
  const presentedChords: PresentedChord[] = [];
  let maxGapDeg = 0;

  for (let i = 0; i < N; i++) {
    const v1 = presentedVertices[i];
    const v2 = presentedVertices[(i + 1) % N];

    let gapRad = v2.normalizedAngleRad - v1.normalizedAngleRad;
    if (gapRad <= 0) gapRad += 2 * Math.PI;
    const gapDeg = (gapRad * 180) / Math.PI;
    if (gapDeg > maxGapDeg) maxGapDeg = gapDeg;

    const length = 2 * radius * Math.sin(gapRad / 2);
    const chordId = `${v1.id}${v2.id}`;
    const fractionOfCircle = (gapDeg / 360).toFixed(2);

    presentedChords.push({
      id: chordId,
      p1: v1.cartesian,
      p2: v2.cartesian,
      startVertexId: v1.id,
      endVertexId: v2.id,
      angularGapRad: gapRad,
      angularGapDeg: gapDeg,
      lengthMm: Math.abs(length),
      arcFractionText: `${gapDeg.toFixed(1)}° (${fractionOfCircle} круга)`,
      strokeColor: CHORD_COLORS[i % CHORD_COLORS.length]
    });
  }

  // Diagonals AC and BD
  const presentedDiagonals: PresentedDiagonal[] = [];
  let intersectionP: Point | null = null;

  if (N >= 4) {
    const vA = presentedVertices[0];
    const vB = presentedVertices[1];
    const vC = presentedVertices[2];
    const vD = presentedVertices[3];

    const lenAC = Math.hypot(vC.cartesian.x - vA.cartesian.x, vC.cartesian.y - vA.cartesian.y);
    const lenBD = Math.hypot(vD.cartesian.x - vB.cartesian.x, vD.cartesian.y - vB.cartesian.y);

    presentedDiagonals.push({
      id: 'AC',
      p1: vA.cartesian,
      p2: vC.cartesian,
      startVertexId: 'A',
      endVertexId: 'C',
      lengthMm: lenAC
    });

    presentedDiagonals.push({
      id: 'BD',
      p1: vB.cartesian,
      p2: vD.cartesian,
      startVertexId: 'B',
      endVertexId: 'D',
      lengthMm: lenBD
    });

    // Compute intersection P of segments AC and BD
    const x1 = vA.cartesian.x, y1 = vA.cartesian.y;
    const x2 = vC.cartesian.x, y2 = vC.cartesian.y;
    const x3 = vB.cartesian.x, y3 = vB.cartesian.y;
    const x4 = vD.cartesian.x, y4 = vD.cartesian.y;

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) > 1e-9) {
      const px = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / denom;
      const py = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / denom;
      intersectionP = { id: 'P', x: px, y: py };
    }
  }

  // Inscribed Angles
  const inscribedAngles: PresentedInscribedAngle[] = [];
  if (N === 4) {
    // Inscribed angle = 1/2 of opposite arc
    // Angle at A subtends arc BCD = arc BC + arc CD
    const arcAB = presentedChords[0].angularGapDeg;
    const arcBC = presentedChords[1].angularGapDeg;
    const arcCD = presentedChords[2].angularGapDeg;
    const arcDA = presentedChords[3].angularGapDeg;

    const angleA = (arcBC + arcCD) / 2;
    const angleB = (arcCD + arcDA) / 2;
    const angleC = (arcDA + arcAB) / 2;
    const angleD = (arcAB + arcBC) / 2;

    inscribedAngles.push({ vertexId: 'A', angleDeg: angleA, subtendedArcDeg: arcBC + arcCD });
    inscribedAngles.push({ vertexId: 'B', angleDeg: angleB, subtendedArcDeg: arcCD + arcDA });
    inscribedAngles.push({ vertexId: 'C', angleDeg: angleC, subtendedArcDeg: arcDA + arcAB });
    inscribedAngles.push({ vertexId: 'D', angleDeg: angleD, subtendedArcDeg: arcAB + arcBC });
  }

  const oppositeAngleSums = {
    acSumDeg: inscribedAngles.length === 4 ? inscribedAngles[0].angleDeg + inscribedAngles[2].angleDeg : 180,
    bdSumDeg: inscribedAngles.length === 4 ? inscribedAngles[1].angleDeg + inscribedAngles[3].angleDeg : 180
  };

  // Ptolemy's Theorem: AC * BD vs AB * CD + BC * DA
  let ptolemy = {
    diagonalProduct: 0,
    oppositeProductSum: 0,
    matches: false
  };

  if (presentedDiagonals.length === 2 && presentedChords.length >= 4) {
    const ac = presentedDiagonals[0].lengthMm;
    const bd = presentedDiagonals[1].lengthMm;
    const ab = presentedChords[0].lengthMm;
    const bc = presentedChords[1].lengthMm;
    const cd = presentedChords[2].lengthMm;
    const da = presentedChords[3].lengthMm;

    const diagProd = ac * bd;
    const oppProd = ab * cd + bc * da;
    ptolemy = {
      diagonalProduct: diagProd,
      oppositeProductSum: oppProd,
      matches: Math.abs(diagProd - oppProd) < 0.01
    };
  }

  // Center position relative to polygon
  let centerPosition: 'INSIDE' | 'ON CHORD' | 'OUTSIDE' = 'INSIDE';
  if (Math.abs(maxGapDeg - 180) < 1e-4) {
    centerPosition = 'ON CHORD';
  } else if (maxGapDeg > 180) {
    centerPosition = 'OUTSIDE';
  }

  // Dial Ticks
  const dialTicks: DialTick[] = [];
  for (let deg = 0; deg < 360; deg += 10) {
    const rad = (deg * Math.PI) / 180;
    const isMajor = deg % 30 === 0;
    const rInner = radius;
    const rOuter = isMajor ? radius + 10 : radius + 5;
    const rLabel = radius + 22;

    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    dialTicks.push({
      angleDeg: deg,
      angleRad: rad,
      isMajor,
      label: isMajor ? `${deg}°` : null,
      x1: center.x + rInner * cos,
      y1: center.y + rInner * sin,
      x2: center.x + rOuter * cos,
      y2: center.y + rOuter * sin,
      labelX: isMajor ? center.x + rLabel * cos : undefined,
      labelY: isMajor ? center.y + rLabel * sin : undefined
    });
  }

  return {
    center,
    radius,
    diameter: 2 * radius,
    vertices: presentedVertices,
    chords: presentedChords,
    diagonals: presentedDiagonals,
    diagonalIntersection: intersectionP,
    inscribedAngles,
    oppositeAngleSums,
    ptolemy,
    centerPosition,
    dialTicks,
    topologyReport,
    stateVersion: state.stateVersion,
    provenance: state.provenance
  };
}
