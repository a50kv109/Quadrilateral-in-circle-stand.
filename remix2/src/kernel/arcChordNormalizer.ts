/**
 * Remix 2: R2-04 Arc/Chord Normalizer
 */

import { CyclicInput } from '../types/geometry';
import { ArcChordNormalizationResult, NormalizationStatus } from '../types/normalization';

const TWO_PI = 2 * Math.PI;
const NUMERICAL_TOLERANCE = 1e-6;

export class ArcChordNormalizer {
  public static normalize(input: CyclicInput, stateVersion: number): ArcChordNormalizationResult {
    const { referenceCircle, angles } = input;
    const vertexCount = angles.length;

    if (vertexCount < 3) {
      return this.createErrorResult(input, stateVersion, 'INVALID_INPUT');
    }

    // 1. Normalize angles to [0, 2π) while preserving original order
    const normalizedAngles = angles.map(angle => {
      let normalized = angle % TWO_PI;
      if (normalized < 0) normalized += TWO_PI;
      return normalized;
    });

    // 2. Compute Arc Gaps in canonical order
    const arcGaps: number[] = [];
    for (let i = 0; i < vertexCount; i++) {
      const current = normalizedAngles[i];
      const next = (i === vertexCount - 1) ? normalizedAngles[0] : normalizedAngles[i + 1];
      
      // Calculate clockwise modular difference between consecutive angles
      let gap = (next - current + TWO_PI) % TWO_PI;
      arcGaps.push(gap);
    }

    // 3. Compute Chord Lengths
    const { radius } = referenceCircle;
    const chordLengths = arcGaps.map(gap => 2 * radius * Math.sin(gap / 2));

    // 4. Validate Total Arc
    const totalArc = arcGaps.reduce((sum, gap) => sum + gap, 0);
    if (Math.abs(totalArc - TWO_PI) > NUMERICAL_TOLERANCE) {
      return this.createErrorResult(input, stateVersion, 'DEGENERATE');
    }

    return {
      profile: 'CYCLIC',
      vertexCount,
      normalizedAngles,
      arcGaps,
      chordLengths,
      totalArc,
      radius,
      stateVersion,
      inputProvenance: 'canonical_cyclic_input',
      status: 'SUCCESS',
    };
  }

  private static createErrorResult(input: CyclicInput, stateVersion: number, status: NormalizationStatus): ArcChordNormalizationResult {
    return {
      profile: 'CYCLIC',
      vertexCount: input.angles.length,
      normalizedAngles: [],
      arcGaps: [],
      chordLengths: [],
      totalArc: 0,
      radius: input.referenceCircle.radius,
      stateVersion,
      inputProvenance: 'canonical_cyclic_input',
      status,
    };
  }
}
