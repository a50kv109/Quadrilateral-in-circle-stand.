# Geometry Reasoning Stand 2 (Remix 2)

## Status

✨ **ACTIVE DEVELOPMENT / RESEARCH GEOMETRY STAND**

Geometry Reasoning Stand 2 (Remix 2) is an extensible, universal geometry reasoning, parametric exploration, and dynamic construction environment.

The system enforces strict architectural decoupling between:
- Geometric state representation (`UniversalGeometryState`);
- Structural topology and validation (`TopologyGuard`);
- Parametric arc and chord normalization (`ArcChordNormalizer`);
- Operational construction DAG and dynamic auxiliary entity recalculation (`AuxiliaryEngine`);
- Headless semantic command dispatching (`CommandDispatcher`);
- State snapshot projections (`GeometryStateSnapshot`);
- Read-only tabular research projection (`GeometryResearchTable`);
- Operational return memory (`CheckpointBuffer v0.1`);
- Fact observation utilities (`GET_ACTIVE_SNAPSHOT`, `GET_ENTITY_MEASUREMENT`, `diffGeometrySnapshots`);
- Autonomous Agent Module (AAM) translation gateway (planned);
- Presentation and interactive UI projection (`UI Shell`).

---

## Initial & Active Target Domain

- **Domain Target:** CQNS — Canonical Cyclic Quadrilateral Normalization Stand
- **Configuration:** $N = 4$ concyclic vertices on a reference circumcircle $S^1$
- **Future Targets (Planned):**
  - Triangle ($N = 3$)
  - General Quadrilateral (Cartesian, $N = 4$)
  - Regular & Inscribed Pentagon ($N = 5$)
  - Hexagon ($N = 6$)
  - Arbitrary Cyclic & Planar $N$-gon

---

## Core Constitutional Principle

> **AGENT MAY BE WRONG. THE STAND MUST NOT.**

The architecture enforces strict separation between:
1. **Mathematical Computation & Invariants:** Pure coordinate arithmetic, euclidean metric calculations, and invariant geometry (`GeometryCore`).
2. **Operational Construction:** Lineage tracking and relational parenting in the Construction DAG.
3. **Headless Semantic Dispatcher:** Central deterministic execution pipe for both human UI and autonomous agents (`CommandDispatcher`).
4. **Observation Layer:** Pure read-only state projections (`GeometryStateSnapshot`, `diffGeometrySnapshots`, `GET_ENTITY_MEASUREMENT`).
5. **Operational Memory:** 3-slot return points (`CheckpointBuffer v0.1`).
6. **Agent Analysis:** External hypothesis generation and exploration (never synthesized as fabricated stand facts).
7. **User Interface:** Pure projection of kernel and auxiliary states without independent mathematical authority.

---

## Active Architecture: Remix 2

The current working codebase is located in `/remix2`.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                               REMIX 2                                  │
│                   Universal Geometry Architecture                      │
│                                                                        │
│   [Human UI]           [Autonomous AI Agent]          [AAM Gateway]   │
│        │                         │                          │          │
│        └─────────────────────────┼──────────────────────────┘          │
│                                  ▼                                     │
│                     [SemanticCommand Protocol]                         │
│                                  │                                     │
│                                  ▼                                     │
│                       [CommandDispatcher]                              │
│                                  │                                     │
│                 ┌────────────────┴────────────────┐                    │
│                 ▼                                 ▼                    │
│     [UniversalGeometryState]          [AuxiliaryState / DAG]           │
│     - Immutable Kernel                - Straightedge & Compass         │
│     - Versioned & Frozen              - Dynamic Vertex Tracking        │
│     - TopologyGuard                   - Automatic Recomputation        │
│                 │                                 │                    │
│                 └────────────────┬────────────────┘                    │
│                                  ▼                                     │
│               [Observation & Operational Memory Layer]                 │
│               - 3-Slot Checkpoint Buffer (Return Points)               │
│               - GeometryStateSnapshot (Raw Observation DTO)            │
│               - GeometryResearchTable (Tabular Projection)             │
│               - Snapshot Diff Utility (DTO Comparison)                 │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Documentation Index

Foundational architecture, roadmap, decisions, and package documentation in `/docs`:

* [Architecture Overview (`docs/ARCHITECTURE.md`)](./docs/ARCHITECTURE.md) — Architectural hierarchy, authority models, observation layer, and epistemic boundaries.
* [Project Roadmap (`docs/ROADMAP.md`)](./docs/ROADMAP.md) — Implementation milestones from R2-00 to R2-16 with current factual statuses.
* [Architectural Decisions (`docs/DECISIONS.md`)](./docs/DECISIONS.md) — Architectural Decision Records (ADR-001 through ADR-014).
* [Remix 2 Implementation (`remix2/README.md`)](./remix2/README.md) — Codebase structure and test commands.

---

## Current Implementation State (v0.1)

| Package / Milestone | Component Name | Factual Status | Files / Tests |
| :--- | :--- | :--- | :--- |
| **R2-00** | **Foundation / Skeleton** | **FROZEN** | `remix2/src/index.ts`<br>`remix2/tests/foundation.test.ts` |
| **R2-01** | **Universal Geometry State** | **FROZEN** | `remix2/src/kernel/state/geometryState.ts`<br>`remix2/tests/geometryState.test.ts` |
| **R2-02** | **Domain Profile Contract** | **FROZEN** | `remix2/src/types/geometry.ts`<br>`remix2/tests/domainProfiles.test.ts` |
| **R2-03** | **Topology & Arc Guard** | **FROZEN** | `remix2/src/kernel/topology/topologyGuard.ts`<br>`remix2/tests/topologyGuard.test.ts` |
| **R2-04** | **Universal Arc/Chord Normalizer** | **FROZEN** | `remix2/src/kernel/arcChordNormalizer.ts`<br>`remix2/tests/arcChordNormalizer.test.ts` |
| **R2-05** | **UI Shell & Headless Projection** | **FROZEN** | `remix2/src/ui/`<br>`remix2/tests/uiShell.test.ts` |
| **R2-05.1** | **Canonical Tools & Dynamic DAG** | **FROZEN** | `remix2/src/ui/state/auxiliaryEngine.ts`<br>`remix2/tests/toolsAndAuxiliary.test.ts` |
| **R2-05.2** | **Semantic Command Dispatcher** | **FROZEN** | `remix2/src/ui/state/commandDispatcher.ts`<br>`remix2/tests/commandDispatcher.test.ts` |
| **Step 1 Normalization** | **Geometry vs Viewport Decoupling** | **FROZEN** | `remix2/src/kernel/dag/geometryCore.ts`<br>`remix2/tests/normalizationStep1.test.ts` |
| **Machine Control** | **Machine Angle Control & DAG** | **FROZEN** | `remix2/tests/machineAngleControlRegression.test.ts` |
| **Snapshot Layer** | **GeometryStateSnapshot DTO** | **FROZEN** | `remix2/src/types/snapshot.ts`<br>`remix2/tests/geometryStateSnapshotRegression.test.ts` |
| **Area Metrics** | **Reference Circle & Area Metrics** | **FROZEN** | `remix2/tests/areaMeasurementRegression.test.ts` |
| **Research Table** | **Row Mapper & Read-Only Table** | **FROZEN** | `remix2/src/research/tableMapper.ts`<br>`remix2/src/ui/components/GeometryResearchTable.tsx` |
| **Checkpoint Buffer** | **3-Slot Operational Return Memory** | **FROZEN** | `remix2/src/research/checkpointBuffer.ts`<br>`remix2/tests/checkpointBufferRegression.test.ts` |
| **Observation Utils** | **Agent Observation Utilities** | **FROZEN** | `remix2/src/research/snapshotDiff.ts`<br>`remix2/tests/agentObservationUtilities.test.ts` |
| **AAM Gateway** | **Autonomous Agent NLP Gateway** | **PLANNED** | Integration layer for natural language semantic translation |

---

## Active Gaps & Deferred Items

- **GAP-B (Custom Construction Observables):** Research Table v0.1 currently projects macro area metrics ($S_{circle}, S_{quad}, S_{gap}, K_{fill}, K_{gap}$). Arbitrary construction lengths (e.g. `diag_A_C`) are accessible to agents via `GET_ENTITY_MEASUREMENT` and `Snapshot.constructions`, but not yet mapped as customizable table columns (*Status: OPEN / NON-BLOCKING*).
- **GAP-E (High-Level Batch Exploration Command):** Batch exploration exists as pure headless function `runParametricExploration(...)`. Encapsulating the full sweep into a single high-level `SemanticCommand` is deferred (*Status: OPEN / DEFERRED*).
- **GAP-INT (Circle Intersections):** Dynamic recomputation currently supports `LINE × LINE`, `LINE × SEGMENT`, and `SEGMENT × SEGMENT`. `LINE × CIRCLE` and `CIRCLE × CIRCLE` are not yet implemented (*Status: OPEN / FUTURE CAPABILITY*).
- **GAP-CP-01 (UI Project Lifecycle Binding):** `CheckpointBuffer` supports dependency injection via `CommandExecutionContext`, but React UI shell currently uses session-level buffer (*Status: DEFERRED*).
