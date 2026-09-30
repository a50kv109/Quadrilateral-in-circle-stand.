/**
 * Initial Canonical State & Domain Presets for N=4 Cyclic Quadrilateral
 * R2-05: Common Geometry Stand UI Shell
 */

import { UniversalGeometryState } from '../../kernel/state/geometryState';
import { PresetType } from '../types/uiTypes';

export const CANONICAL_CENTER = { id: 'O', x: 0, y: 0 };
export const CANONICAL_RADIUS = 100.0; // In millimeters / canonical units

/**
 * Creates the default initial cyclic quadrilateral state.
 * Angles: A=45°, B=135°, C=225°, D=315° (Square).
 */
export function createDefaultQuadrilateralState(): UniversalGeometryState {
  const degToRad = (deg: number) => (deg * Math.PI) / 180;
  const initialAngles = [45, 135, 225, 315].map(degToRad);

  return UniversalGeometryState.createCyclic(
    CANONICAL_CENTER,
    CANONICAL_RADIUS,
    initialAngles,
    "PRESET_SQUARE"
  );
}

/**
 * Generates an immutable state for standard quadrilateral presets.
 */
export function createPresetState(preset: PresetType): UniversalGeometryState {
  const degToRad = (deg: number) => (deg * Math.PI) / 180;
  let anglesDeg: number[];
  let provenance: string;

  switch (preset) {
    case 'SQUARE':
      anglesDeg = [45, 135, 225, 315];
      provenance = "PRESET_SQUARE";
      break;
    case 'RECTANGLE':
      anglesDeg = [30, 150, 210, 330];
      provenance = "PRESET_RECTANGLE";
      break;
    case 'TRAPEZOID':
      anglesDeg = [40, 140, 220, 320];
      provenance = "PRESET_ISOSCELES_TRAPEZOID";
      break;
    case 'GENERAL':
    default:
      anglesDeg = [35, 115, 205, 305];
      provenance = "PRESET_GENERAL_CYCLIC";
      break;
  }

  return UniversalGeometryState.createCyclic(
    CANONICAL_CENTER,
    CANONICAL_RADIUS,
    anglesDeg.map(degToRad),
    provenance
  );
}
