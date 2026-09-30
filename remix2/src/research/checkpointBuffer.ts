/**
 * Headless Checkpoint Buffer v0.1
 * 
 * 3-Slot Operational Memory for Remix2 Research Projects.
 * 
 * Architecture Rules:
 * - Exactly 3 checkpoint slots: 1 | 2 | 3.
 * - Stores immutable capture of { geoState: UniversalGeometryState, auxState: AuxiliaryState }.
 * - Decoupled from external Snapshot DTOs (snapshots are unlimited, checkpoints are strictly 3).
 * - Headless, deterministic, zero browser/React/UI dependencies.
 */

import { UniversalGeometryState } from '../kernel/state/geometryState';
import { DomainProfile } from '../types/geometry';
import {
  AuxiliaryState,
  AuxiliaryPoint,
  AuxiliarySegment,
  AuxiliaryLine,
  AuxiliaryCircle,
  AuxiliaryMeasurement
} from '../ui/types/auxiliaryTypes';

export type CheckpointSlotId = 1 | 2 | 3;

export interface CheckpointRecord {
  readonly slot: CheckpointSlotId;
  readonly label?: string;
  readonly savedAtVersion: number;
  readonly domainProfile: DomainProfile;
  readonly provenance: string;
  readonly geoState: UniversalGeometryState;
  readonly auxState: AuxiliaryState;
}

export interface CheckpointSlotInfo {
  readonly slot: CheckpointSlotId;
  readonly isOccupied: boolean;
  readonly label?: string;
  readonly savedAtVersion?: number;
  readonly domainProfile?: DomainProfile;
  readonly provenance?: string;
}

/**
 * Pure deep cloning helper for AuxiliaryState to ensure zero shared mutable references.
 */
export function cloneAuxiliaryState(aux: AuxiliaryState): AuxiliaryState {
  const clonedPoints: AuxiliaryPoint[] = aux.points.map((p) => ({
    ...p,
    parentIds: p.parentIds ? [...p.parentIds] : undefined
  }));

  const clonedSegments: AuxiliarySegment[] = aux.segments.map((s) => ({
    ...s,
    parentIds: s.parentIds ? [...s.parentIds] : undefined
  }));

  const clonedLines: AuxiliaryLine[] = aux.lines.map((l) => ({
    ...l,
    anchorPoint: { ...l.anchorPoint },
    direction: { ...l.direction },
    equation: l.equation ? { ...l.equation } : undefined
  }));

  const clonedCircles: AuxiliaryCircle[] = aux.circles.map((c) => ({
    ...c
  }));

  const clonedMeasurements: AuxiliaryMeasurement[] = aux.measurements.map((m) => ({
    ...m
  }));

  return Object.freeze({
    points: Object.freeze(clonedPoints),
    segments: Object.freeze(clonedSegments),
    lines: Object.freeze(clonedLines),
    circles: Object.freeze(clonedCircles),
    measurements: Object.freeze(clonedMeasurements),
    selectedEntityId: aux.selectedEntityId,
    selectedEntityType: aux.selectedEntityType
  });
}

export class CheckpointBuffer {
  private readonly slots: Map<CheckpointSlotId, CheckpointRecord> = new Map();

  /**
   * Save current geometry and auxiliary state into specified slot (1, 2, or 3).
   * Overwrites slot if already occupied.
   */
  public save(
    slot: CheckpointSlotId,
    geoState: UniversalGeometryState,
    auxState: AuxiliaryState,
    label?: string
  ): CheckpointRecord {
    if (slot !== 1 && slot !== 2 && slot !== 3) {
      throw new Error(`Invalid checkpoint slot: ${slot}. Allowed slots are 1, 2, 3.`);
    }
    if (!geoState) {
      throw new Error("Cannot save checkpoint: UniversalGeometryState is undefined.");
    }
    if (!auxState) {
      throw new Error("Cannot save checkpoint: AuxiliaryState is undefined.");
    }

    const record: CheckpointRecord = {
      slot,
      label: label ? label.trim() : undefined,
      savedAtVersion: geoState.stateVersion,
      domainProfile: geoState.domainProfile,
      provenance: geoState.provenance,
      geoState, // UniversalGeometryState is frozen/immutable
      auxState: cloneAuxiliaryState(auxState)
    };

    this.slots.set(slot, Object.freeze(record));
    return record;
  }

  /**
   * Retrieve saved checkpoint record for given slot.
   */
  public get(slot: CheckpointSlotId): CheckpointRecord | null {
    if (slot !== 1 && slot !== 2 && slot !== 3) {
      return null;
    }
    return this.slots.get(slot) ?? null;
  }

  /**
   * Return metadata information for a given slot.
   */
  public getInfo(slot: CheckpointSlotId): CheckpointSlotInfo {
    const record = this.get(slot);
    if (!record) {
      return {
        slot,
        isOccupied: false
      };
    }
    return {
      slot,
      isOccupied: true,
      label: record.label,
      savedAtVersion: record.savedAtVersion,
      domainProfile: record.domainProfile,
      provenance: record.provenance
    };
  }

  /**
   * List metadata for all 3 slots.
   */
  public list(): readonly CheckpointSlotInfo[] {
    return Object.freeze([
      this.getInfo(1),
      this.getInfo(2),
      this.getInfo(3)
    ]);
  }

  /**
   * Clear specified checkpoint slot.
   */
  public clear(slot: CheckpointSlotId): boolean {
    if (slot !== 1 && slot !== 2 && slot !== 3) {
      return false;
    }
    return this.slots.delete(slot);
  }

  /**
   * Clear all 3 checkpoint slots.
   */
  public clearAll(): void {
    this.slots.clear();
  }

  /**
   * Total number of occupied slots (0..3).
   */
  public get occupiedCount(): number {
    return this.slots.size;
  }
}

/**
 * Factory function for creating a new independent CheckpointBuffer instance.
 */
export function createCheckpointBuffer(): CheckpointBuffer {
  return new CheckpointBuffer();
}

/**
 * Global default instance for session-scoped headless command dispatching.
 */
const defaultInstance = new CheckpointBuffer();

export function getDefaultCheckpointBuffer(): CheckpointBuffer {
  return defaultInstance;
}
