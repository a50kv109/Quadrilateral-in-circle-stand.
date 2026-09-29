/**
 * CQNS-001: Harmonic Research Module (Package 02: CQNS-PKG-02-HARMONIC)
 * Classification: RESEARCH / EXPERIMENTAL ONLY
 *
 * Implements N=4 Discrete Fourier Transform (DFT) spectral telemetry for 4-element arc sequences:
 * - Computes complex Fourier coefficients X_0, X_1, X_2, X_3
 * - Computes harmonic amplitudes and phase angles
 * - Enforces phase safety: PHASE_UNDEFINED on sub-threshold amplitudes
 * - Computes experimental harmonicResidual and spectralSymmetryIndex
 * - Supports bounded input models:
 *   - CYCLIC_ARC_SEQUENCE (via Package 01 Zebra)
 *   - ARBITRARY_TRIANGULATION_CIRCUMCIRCLE (strictly bounded: collinearity check + concyclicity check of D)
 *   - UNKNOWN
 *
 * STRICTLY NON-AUTHORITATIVE & READ-ONLY:
 * Zero GeometryState mutations, zero RelationGraph writes, zero VERIFIED creation.
 * Telemetry provider only. Does not serve as a proof of cyclicity.
 */

import { Point } from '../types/geometry';
import { GeometryCore } from './geometryCore';
import { GeometryState } from './geometryState';
import { CyclicChordEngine, ReferenceCircleInput } from './cyclicChordEngine';
import { VerificationLayer } from './verificationLayer';

export interface HarmonicSpectrumResult {
  harmonicAmplitudes: [number, number, number, number];
  harmonicPhases: [
    number | 'PHASE_UNDEFINED',
    number | 'PHASE_UNDEFINED',
    number | 'PHASE_UNDEFINED',
    number | 'PHASE_UNDEFINED'
  ];

  secondHarmonicDeltaPhi: number | 'PHASE_UNDEFINED';

  /** EXPERIMENTAL / OPEN: root-mean-square residual of non-zero harmonics relative to DC */
  harmonicResidual: number;
  /** EXPERIMENTAL / OPEN: ratio of second harmonic energy to total dynamic energy */
  spectralSymmetryIndex: number;

  inputModel:
    | 'CYCLIC_ARC_SEQUENCE'
    | 'ARBITRARY_TRIANGULATION_CIRCUMCIRCLE'
    | 'UNKNOWN';

  normalizationStatus:
    | 'VALID'
    | 'NORMALIZATION_UNAVAILABLE'
    | 'DEGENERATE';

  vertexOrder: string[];

  angularOrigin: number;

  orientation: 'CW' | 'CCW';

  referenceCircleId?: string;

  stateVersion: number;

  experimentalStatus: 'RESEARCH_ONLY';
}

export class HarmonicChordEngine {
  public static readonly AMPLITUDE_THRESHOLD = 1e-6;
  public static readonly COLLINEAR_EPSILON = 1e-4;
  public static readonly CIRCUMCIRCLE_DEV_EPSILON = VerificationLayer.EPSILON_DIST; // 1.0 px

  // =========================================================================
  // CORE N=4 DISCRETE FOURIER TRANSFORM
  // =========================================================================

  /**
   * Deterministic N=4 Discrete Fourier Transform for real-valued 4-arc sequence [θ₀, θ₁, θ₂, θ₃].
   *
   * Coefficients:
   * X_k = Σ_{n=0..3} x_n * exp(-i * 2π * k * n / 4)
   *
   * X_0 = x_0 + x_1 + x_2 + x_3 (DC component = 2π for complete circle)
   * X_1 = (x_0 - x_2) - i * (x_1 - x_3)
   * X_2 = (x_0 + x_2) - (x_1 + x_3) (Real-valued)
   * X_3 = (x_0 - x_2) + i * (x_1 - x_3) = X_1* (Complex conjugate)
   */
  static computeDFT4(arcs: [number, number, number, number]): {
    re: [number, number, number, number];
    im: [number, number, number, number];
    amplitudes: [number, number, number, number];
    phases: [
      number | 'PHASE_UNDEFINED',
      number | 'PHASE_UNDEFINED',
      number | 'PHASE_UNDEFINED',
      number | 'PHASE_UNDEFINED'
    ];
    secondHarmonicDeltaPhi: number | 'PHASE_UNDEFINED';
    harmonicResidual: number;
    spectralSymmetryIndex: number;
  } {
    const [x0, x1, x2, x3] = arcs;

    // Real and imaginary components
    const re: [number, number, number, number] = [
      x0 + x1 + x2 + x3,
      x0 - x2,
      (x0 + x2) - (x1 + x3),
      x0 - x2,
    ];

    const im: [number, number, number, number] = [
      0,
      -(x1 - x3),
      0,
      x1 - x3,
    ];

    // Amplitudes: |X_k| = sqrt(Re^2 + Im^2)
    const amplitudes: [number, number, number, number] = [
      Math.sqrt(re[0] * re[0] + im[0] * im[0]),
      Math.sqrt(re[1] * re[1] + im[1] * im[1]),
      Math.sqrt(re[2] * re[2] + im[2] * im[2]),
      Math.sqrt(re[3] * re[3] + im[3] * im[3]),
    ];

    // Phases with strict threshold protection: PHASE_UNDEFINED on sub-threshold amplitudes
    const phases: [
      number | 'PHASE_UNDEFINED',
      number | 'PHASE_UNDEFINED',
      number | 'PHASE_UNDEFINED',
      number | 'PHASE_UNDEFINED'
    ] = [
      amplitudes[0] < HarmonicChordEngine.AMPLITUDE_THRESHOLD
        ? 'PHASE_UNDEFINED'
        : Math.atan2(im[0], re[0]),
      amplitudes[1] < HarmonicChordEngine.AMPLITUDE_THRESHOLD
        ? 'PHASE_UNDEFINED'
        : Math.atan2(im[1], re[1]),
      amplitudes[2] < HarmonicChordEngine.AMPLITUDE_THRESHOLD
        ? 'PHASE_UNDEFINED'
        : Math.atan2(im[2], re[2]),
      amplitudes[3] < HarmonicChordEngine.AMPLITUDE_THRESHOLD
        ? 'PHASE_UNDEFINED'
        : Math.atan2(im[3], re[3]),
    ];

    // Second harmonic phase difference: ΔΦ = (phase_2 - phase_1) mod 2π
    // If either phase is PHASE_UNDEFINED, result is strictly PHASE_UNDEFINED
    let secondHarmonicDeltaPhi: number | 'PHASE_UNDEFINED';
    if (phases[1] === 'PHASE_UNDEFINED' || phases[2] === 'PHASE_UNDEFINED') {
      secondHarmonicDeltaPhi = 'PHASE_UNDEFINED';
    } else {
      let delta = (phases[2] - phases[1]) % (2 * Math.PI);
      if (delta < 0) delta += 2 * Math.PI;
      secondHarmonicDeltaPhi = delta;
    }

    // EXPERIMENTAL / OPEN metrics:
    // harmonicResidual: root-sum-square of non-zero harmonic amplitudes relative to DC
    const sumHigherEnergy =
      amplitudes[1] * amplitudes[1] +
      amplitudes[2] * amplitudes[2] +
      amplitudes[3] * amplitudes[3];
    const harmonicResidual =
      amplitudes[0] > HarmonicChordEngine.AMPLITUDE_THRESHOLD
        ? Math.sqrt(sumHigherEnergy) / amplitudes[0]
        : 0;

    // spectralSymmetryIndex: fraction of second-harmonic energy relative to total dynamic energy
    const totalDynamicAmp = amplitudes[1] + amplitudes[2] + amplitudes[3];
    const spectralSymmetryIndex =
      totalDynamicAmp > HarmonicChordEngine.AMPLITUDE_THRESHOLD
        ? amplitudes[2] / totalDynamicAmp
        : 0;

    return {
      re,
      im,
      amplitudes,
      phases,
      secondHarmonicDeltaPhi,
      harmonicResidual,
      spectralSymmetryIndex,
    };
  }

  // =========================================================================
  // MODEL 1: CYCLIC_ARC_SEQUENCE (via Package 01 Zebra)
  // =========================================================================

  /**
   * Reads a read-only snapshot of the specified quadrilateral from GeometryState.
   * Delegates normalization strictly to Package 01 Zebra (CyclicChordEngine).
   * Does NOT mutate state or invent alternative normalization.
   */
  static analyzeCyclicArcSequence(
    state: GeometryState,
    quadId: string = 'quad_ABCD'
  ): HarmonicSpectrumResult {
    const quad = state.quadrilaterals.get(quadId);
    const circle = state.circles.get('circle_main');
    const center = state.points.get('pt_O');
    const stateVersion = state.stateVersion;

    if (!quad || !circle || !center) {
      return this.createEmptyResult(
        'CYCLIC_ARC_SEQUENCE',
        'NORMALIZATION_UNAVAILABLE',
        stateVersion,
        []
      );
    }

    const vertices: Point[] = [];
    for (const vId of quad.vertexIds) {
      const pt = state.points.get(vId);
      if (pt) vertices.push(pt);
    }

    if (vertices.length !== 4) {
      return this.createEmptyResult(
        'CYCLIC_ARC_SEQUENCE',
        'NORMALIZATION_UNAVAILABLE',
        stateVersion,
        quad.vertexIds
      );
    }

    const refCircle: ReferenceCircleInput = {
      center,
      radius: circle.radius,
    };

    // Delegate normalization strictly to Package 01 Zebra
    const zebraResult = CyclicChordEngine.normalizeCyclicQuadrilateral(
      refCircle,
      vertices,
      HarmonicChordEngine.CIRCUMCIRCLE_DEV_EPSILON
    );

    if (zebraResult.status !== 'VALID' || !zebraResult.arcIntervals || zebraResult.arcIntervals.length !== 4) {
      return this.createEmptyResult(
        'CYCLIC_ARC_SEQUENCE',
        zebraResult.status,
        stateVersion,
        quad.vertexIds,
        circle.id
      );
    }

    const arcValues: [number, number, number, number] = [
      zebraResult.arcIntervals[0].subtendedAngleRad,
      zebraResult.arcIntervals[1].subtendedAngleRad,
      zebraResult.arcIntervals[2].subtendedAngleRad,
      zebraResult.arcIntervals[3].subtendedAngleRad,
    ];

    const dft = this.computeDFT4(arcValues);
    const angularOrigin = zebraResult.normalizedAngles?.[0]?.angleRad ?? 0;

    return {
      harmonicAmplitudes: dft.amplitudes,
      harmonicPhases: dft.phases,
      secondHarmonicDeltaPhi: dft.secondHarmonicDeltaPhi,
      harmonicResidual: dft.harmonicResidual,
      spectralSymmetryIndex: dft.spectralSymmetryIndex,
      inputModel: 'CYCLIC_ARC_SEQUENCE',
      normalizationStatus: 'VALID',
      vertexOrder: quad.vertexIds,
      angularOrigin,
      orientation: zebraResult.orientation ?? 'CCW',
      referenceCircleId: circle.id,
      stateVersion,
      experimentalStatus: 'RESEARCH_ONLY',
    };
  }

  // =========================================================================
  // MODEL 2: ARBITRARY_TRIANGULATION_CIRCUMCIRCLE (Strictly Bounded)
  // =========================================================================

  /**
   * Bounded Research Normalization Model for 4 points [A, B, C, D].
   *
   * Strict Correction Rules:
   * 1. If A, B, C are collinear (cross product < COLLINEAR_EPSILON):
   *    normalizationStatus = 'DEGENERATE' and stops immediately.
   * 2. If circumcircle(A,B,C) is valid, used ONLY as explicit experimental frame.
   * 3. Point D is strictly checked against circumcircle(A,B,C).
   * 4. If D deviates > CIRCUMCIRCLE_DEV_EPSILON:
   *    normalizationStatus = 'NORMALIZATION_UNAVAILABLE', zero arc sequence created.
   * 5. Does NOT fabricate reference circles to force non-cyclic points to be cyclic.
   */
  static analyzeArbitraryTriangulation(
    points: Point[],
    stateVersion: number = 0
  ): HarmonicSpectrumResult {
    const vIds = points ? points.map((p) => p.id || 'unknown') : [];

    if (!points || points.length !== 4) {
      return this.createEmptyResult(
        'ARBITRARY_TRIANGULATION_CIRCUMCIRCLE',
        'NORMALIZATION_UNAVAILABLE',
        stateVersion,
        vIds
      );
    }

    const [pA, pB, pC, pD] = points;

    // Check finite coordinates
    for (const p of points) {
      if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) {
        return this.createEmptyResult(
          'ARBITRARY_TRIANGULATION_CIRCUMCIRCLE',
          'DEGENERATE',
          stateVersion,
          vIds
        );
      }
    }

    // Rule 1: Collinearity check of A, B, C (cross product of AB and AC)
    const abX = pB.x - pA.x;
    const abY = pB.y - pA.y;
    const acX = pC.x - pA.x;
    const acY = pC.y - pA.y;
    const crossABC = abX * acY - abY * acX;

    if (Math.abs(crossABC) < HarmonicChordEngine.COLLINEAR_EPSILON) {
      return this.createEmptyResult(
        'ARBITRARY_TRIANGULATION_CIRCUMCIRCLE',
        'DEGENERATE',
        stateVersion,
        vIds
      );
    }

    // Rule 2: Compute circumcircle of triangle (A, B, C)
    const circum = this.computeTriangleCircumcircle(pA, pB, pC);
    if (!circum || !Number.isFinite(circum.radius) || circum.radius <= 0) {
      return this.createEmptyResult(
        'ARBITRARY_TRIANGULATION_CIRCUMCIRCLE',
        'DEGENERATE',
        stateVersion,
        vIds
      );
    }

    // Rule 3 & 4: Strictly verify D against circumcircle(A, B, C)
    const devD = GeometryCore.radialDeviation(pD, circum.center, circum.radius);
    if (devD > HarmonicChordEngine.CIRCUMCIRCLE_DEV_EPSILON) {
      // D is outside experimental circumcircle tolerance -> NORMALIZATION_UNAVAILABLE
      return this.createEmptyResult(
        'ARBITRARY_TRIANGULATION_CIRCUMCIRCLE',
        'NORMALIZATION_UNAVAILABLE',
        stateVersion,
        vIds
      );
    }

    // Normalize 4 concyclic points using Package 01 Zebra
    const refCircle: ReferenceCircleInput = {
      center: circum.center,
      radius: circum.radius,
    };

    const zebraResult = CyclicChordEngine.normalizeCyclicQuadrilateral(
      refCircle,
      points,
      HarmonicChordEngine.CIRCUMCIRCLE_DEV_EPSILON
    );

    if (zebraResult.status !== 'VALID' || !zebraResult.arcIntervals || zebraResult.arcIntervals.length !== 4) {
      return this.createEmptyResult(
        'ARBITRARY_TRIANGULATION_CIRCUMCIRCLE',
        zebraResult.status,
        stateVersion,
        vIds
      );
    }

    const arcValues: [number, number, number, number] = [
      zebraResult.arcIntervals[0].subtendedAngleRad,
      zebraResult.arcIntervals[1].subtendedAngleRad,
      zebraResult.arcIntervals[2].subtendedAngleRad,
      zebraResult.arcIntervals[3].subtendedAngleRad,
    ];

    const dft = this.computeDFT4(arcValues);
    const angularOrigin = zebraResult.normalizedAngles?.[0]?.angleRad ?? 0;

    return {
      harmonicAmplitudes: dft.amplitudes,
      harmonicPhases: dft.phases,
      secondHarmonicDeltaPhi: dft.secondHarmonicDeltaPhi,
      harmonicResidual: dft.harmonicResidual,
      spectralSymmetryIndex: dft.spectralSymmetryIndex,
      inputModel: 'ARBITRARY_TRIANGULATION_CIRCUMCIRCLE',
      normalizationStatus: 'VALID',
      vertexOrder: vIds,
      angularOrigin,
      orientation: zebraResult.orientation ?? 'CCW',
      referenceCircleId: 'experimental_circumcircle_ABC',
      stateVersion,
      experimentalStatus: 'RESEARCH_ONLY',
    };
  }

  // =========================================================================
  // MODEL 3: UNKNOWN INPUT
  // =========================================================================

  /**
   * For unknown or unvalidated structures: returns NORMALIZATION_UNAVAILABLE with safe defaults.
   * Does NOT generate synthetic spectral data.
   */
  static analyzeUnknown(
    inputModel: 'UNKNOWN' = 'UNKNOWN',
    stateVersion: number = 0
  ): HarmonicSpectrumResult {
    return this.createEmptyResult(inputModel, 'NORMALIZATION_UNAVAILABLE', stateVersion, []);
  }

  // =========================================================================
  // PURE HELPER METHODS (Non-authoritative)
  // =========================================================================

  /**
   * Compute Euclidean circumcircle of 3 non-collinear points.
   */
  private static computeTriangleCircumcircle(
    a: Point,
    b: Point,
    c: Point
  ): { center: Point; radius: number } | null {
    const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
    if (Math.abs(d) < 1e-7) {
      return null; // Collinear
    }

    const aSq = a.x * a.x + a.y * a.y;
    const bSq = b.x * b.x + b.y * b.y;
    const cSq = c.x * c.x + c.y * c.y;

    const ux = (aSq * (b.y - c.y) + bSq * (c.y - a.y) + cSq * (a.y - b.y)) / d;
    const uy = (aSq * (c.x - b.x) + bSq * (a.x - c.x) + cSq * (b.x - a.x)) / d;

    const center: Point = {
      id: 'pt_circum_center',
      name: 'CircumCenter',
      x: ux,
      y: uy,
      role: 'auxiliary',
    };

    const radius = GeometryCore.distance(a, center);
    return { center, radius };
  }

  /**
   * Creates empty research telemetry result for unnormalized/failed pipelines.
   */
  private static createEmptyResult(
    inputModel: 'CYCLIC_ARC_SEQUENCE' | 'ARBITRARY_TRIANGULATION_CIRCUMCIRCLE' | 'UNKNOWN',
    normalizationStatus: 'VALID' | 'NORMALIZATION_UNAVAILABLE' | 'DEGENERATE',
    stateVersion: number,
    vertexOrder: string[],
    referenceCircleId?: string
  ): HarmonicSpectrumResult {
    return {
      harmonicAmplitudes: [0, 0, 0, 0],
      harmonicPhases: [
        'PHASE_UNDEFINED',
        'PHASE_UNDEFINED',
        'PHASE_UNDEFINED',
        'PHASE_UNDEFINED',
      ],
      secondHarmonicDeltaPhi: 'PHASE_UNDEFINED',
      harmonicResidual: 0,
      spectralSymmetryIndex: 0,
      inputModel,
      normalizationStatus,
      vertexOrder,
      angularOrigin: 0,
      orientation: 'CCW',
      referenceCircleId,
      stateVersion,
      experimentalStatus: 'RESEARCH_ONLY',
    };
  }
}
