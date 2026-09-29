/**
 * Remix 2: R2-04 Arc/Chord Normalizer Types
 */

import { CyclicInput } from './geometry';

export type NormalizationStatus = 'SUCCESS' | 'INVALID_INPUT' | 'DEGENERATE';

export interface ArcChordNormalizationResult {
  readonly profile: 'CYCLIC';
  readonly vertexCount: number;
  readonly normalizedAngles: readonly number[];
  readonly arcGaps: readonly number[];
  readonly chordLengths: readonly number[];
  readonly totalArc: number;
  readonly radius: number;
  readonly stateVersion: number;
  readonly inputProvenance: string;
  readonly status: NormalizationStatus;
}
