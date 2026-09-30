# Remix 2 Implementation

This directory contains the second-generation implementation of the **Geometry Reasoning Stand** universal architecture.

The codebase is completely decoupled from legacy implementations, providing a domain-agnostic common kernel, headless semantic command execution, dynamic construction DAGs, snapshot projections, 3-slot operational return memory, and fact observation utilities for autonomous AI agents.

---

## Directory Layout

```text
remix2/
├── index.html                  # Standalone Vite HTML entry point for Remix 2
├── vite.config.ts              # Dedicated build & dev server configuration
├── tsconfig.json               # Strict TypeScript configuration
├── src/
│   ├── index.ts                # Core entry point & version export
│   ├── kernel/                 # Domain-agnostic common kernel
│   │   ├── state/              # R2-01: UniversalGeometryState (immutable, frozen, versioned)
│   │   ├── topology/           # R2-03: TopologyGuard (non-degeneracy & cyclic winding)
│   │   ├── arcChordNormalizer.ts # R2-04: ArcChordNormalizer (parametric order preservation)
│   │   └── dag/                # GeometryCore & mathematical invariant functions
│   ├── types/                  # Discriminated union type definitions
│   │   ├── geometry.ts         # DomainProfile (CARTESIAN, CYCLIC) & point types
│   │   ├── snapshot.ts         # GeometryStateSnapshot raw observation DTO
│   │   └── researchTable.ts    # GeometryResearchRow & table mapping contracts
│   ├── research/               # Isolated research & observation sandbox
│   │   ├── checkpointBuffer.ts # 3-Slot Operational Return Memory (v0.1)
│   │   ├── snapshotDiff.ts     # Pure DTO Snapshot Diff Utility
│   │   ├── tableMapper.ts      # Pure Read-Only Snapshot -> Research Row Mapper
│   │   └── index.ts            # Research namespace exports & exploration runner
│   └── ui/                     # Presentation & interactive execution layer
│       ├── types/
│       │   ├── auxiliaryTypes.ts   # Auxiliary entity definitions (points, lines, circles, measurements)
│       │   └── semanticCommands.ts # SemanticCommand union & tool mapping
│       ├── state/
│       │   ├── auxiliaryEngine.ts  # Dynamic Straightedge/Compass DAG & recomputation
│       │   └── commandDispatcher.ts # Headless Semantic Command Dispatcher
│       └── components/
│           ├── CanvasStage.tsx          # SVG Geometry Canvas & normalized rendering
│           └── GeometryResearchTable.tsx # Pure Read-Only Exploration Table
└── tests/                      # 16 Standalone regression test suites (tsx)
    ├── foundation.test.ts
    ├── geometryState.test.ts
    ├── domainProfiles.test.ts
    ├── topologyGuard.test.ts
    ├── arcChordNormalizer.test.ts
    ├── uiShell.test.ts
    ├── toolsAndAuxiliary.test.ts
    ├── commandDispatcher.test.ts
    ├── normalizationStep1.test.ts
    ├── machineAngleControlRegression.test.ts
    ├── geometryStateSnapshotRegression.test.ts
    ├── areaMeasurementRegression.test.ts
    ├── geometryResearchRowMapperRegression.test.ts
    ├── geometryResearchTableRegression.test.ts
    ├── checkpointBufferRegression.test.ts
    └── agentObservationUtilities.test.ts
```

---

## Implemented Components & Subsystems

* **R2-00 Foundation (`src/index.ts`, `tests/foundation.test.ts`):** Universal architecture exports and test harness.
* **R2-01 Universal Geometry State (`src/kernel/state/`, `tests/geometryState.test.ts`):** Immutable versioned state store, deep freezing, provenance tracking.
* **R2-02 Domain Profile Contract (`src/types/geometry.ts`, `tests/domainProfiles.test.ts`):** Strict discriminated union support for `CARTESIAN` and `CYCLIC` profiles.
* **R2-03 Topology & Arc Guard (`src/kernel/topology/`, `tests/topologyGuard.test.ts`):** Mathematical integrity validation for Cyclic and Cartesian domains.
* **R2-04 Arc/Chord Normalizer (`src/kernel/arcChordNormalizer.ts`, `tests/arcChordNormalizer.test.ts`):** Angular circular interval calculations preserving array order.
* **R2-05 UI Shell & Viewport Normalization (`src/ui/`, `tests/uiShell.test.ts`, `tests/normalizationStep1.test.ts`):** Viewport-independent geometry calculation with presentation projection.
* **R2-05.1 Canonical Geometry Tools & DAG (`src/ui/state/auxiliaryEngine.ts`, `tests/toolsAndAuxiliary.test.ts`):** Interactive straightedge, compass, ruler, bisector, parallel, and dynamic intersection recomputation.
* **R2-05.2 Headless Semantic Command Dispatcher (`src/ui/state/commandDispatcher.ts`, `tests/commandDispatcher.test.ts`):** Single execution pipe for UI tools and AI agents.
* **R2-05.3 Machine Angle Control (`tests/machineAngleControlRegression.test.ts`):** Precision vertex angle mutation with topology rollback protection.
* **R2-06 State Snapshot Projection (`src/types/snapshot.ts`, `src/research/index.ts`, `tests/geometryStateSnapshotRegression.test.ts`):** Pure read-only export of raw geometric observations.
* **R2-07 Area Metrics (`tests/areaMeasurementRegression.test.ts`):** Deterministic evaluation of $S_{circle}, S_{quad}, S_{gap}, K_{fill}, K_{gap}$.
* **R2-08 & R2-09 Geometry Research Table (`src/research/tableMapper.ts`, `src/ui/components/GeometryResearchTable.tsx`, `tests/geometryResearchRowMapperRegression.test.ts`, `tests/geometryResearchTableRegression.test.ts`):** Pure read-only tabular presentation of snapshot series.
* **R2-10 Checkpoint Buffer v0.1 (`src/research/checkpointBuffer.ts`, `tests/checkpointBufferRegression.test.ts`):** 3-slot operational return memory with monotonic restore semantics.
* **R2-11 Agent Observation Utilities v0.1 (`src/research/snapshotDiff.ts`, `tests/agentObservationUtilities.test.ts`):** `GET_ACTIVE_SNAPSHOT`, `GET_ENTITY_MEASUREMENT`, and `diffGeometrySnapshots`.

---

## Standalone Commands

```bash
# Run all 16 Remix 2 test suites
npm run test:r2

# Run TypeScript type check on Remix 2
npm run lint:r2

# Build production bundle for Remix 2
npm run build:r2
```
