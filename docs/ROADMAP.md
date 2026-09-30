# Remix 2 Architectural Roadmap

**Status:** Living Development & Release Roadmap (v0.1)

---

## 1. Status Legend

* **FROZEN:** Fully implemented, verified against authoritative regression suites, and locked against breaking modifications.
* **IMPLEMENTED:** Fully coded in `remix2/src` with passing unit tests in `remix2/tests`.
* **OPEN / NON-BLOCKING:** Active capability enhancement identified; existing fallback paths are fully functional.
* **DEFERRED:** Formally specified but intentionally postponed to subsequent phases.
* **PLANNED:** Formalized in architectural blueprints; implementation scheduled.

---

## 2. Package Roadmap Matrix

| Package ID | Component Name | Factual Status | Implementation & Test Files |
| :--- | :--- | :--- | :--- |
| **R2-00** | **Foundation / Project Skeleton** | **FROZEN** | `remix2/src/index.ts`<br>`remix2/tests/foundation.test.ts` |
| **R2-01** | **Universal Geometry State** | **FROZEN** | `remix2/src/kernel/state/geometryState.ts`<br>`remix2/tests/geometryState.test.ts` |
| **R2-02** | **Domain Profile Contract** | **FROZEN** | `remix2/src/types/geometry.ts`<br>`remix2/tests/domainProfiles.test.ts` |
| **R2-03** | **Topology & Arc Guard** | **FROZEN** | `remix2/src/kernel/topology/topologyGuard.ts`<br>`remix2/tests/topologyGuard.test.ts` |
| **R2-04** | **Universal Arc/Chord Normalizer** | **FROZEN** | `remix2/src/kernel/arcChordNormalizer.ts`<br>`remix2/tests/arcChordNormalizer.test.ts` |
| **R2-05** | **UI Shell & Viewport Normalization** | **FROZEN** | `remix2/src/ui/`<br>`remix2/tests/uiShell.test.ts`<br>`remix2/tests/normalizationStep1.test.ts` |
| **R2-05.1** | **Canonical Geometry Stand Active Tools** | **FROZEN** | `remix2/src/ui/types/auxiliaryTypes.ts`<br>`remix2/src/ui/state/auxiliaryEngine.ts`<br>`remix2/tests/toolsAndAuxiliary.test.ts` |
| **R2-05.2** | **Semantic Command Dispatcher** | **FROZEN** | `remix2/src/ui/types/semanticCommands.ts`<br>`remix2/src/ui/state/commandDispatcher.ts`<br>`remix2/tests/commandDispatcher.test.ts` |
| **R2-05.3** | **Machine Angle Control & Topological DAG** | **FROZEN** | `remix2/tests/machineAngleControlRegression.test.ts` |
| **R2-06** | **State Snapshot Projection Layer** | **FROZEN** | `remix2/src/types/snapshot.ts`<br>`remix2/src/research/index.ts`<br>`remix2/tests/geometryStateSnapshotRegression.test.ts` |
| **R2-07** | **Reference Circle & Quadrilateral Area Metrics** | **FROZEN** | `remix2/tests/areaMeasurementRegression.test.ts` |
| **R2-08** | **Geometry Research Row Mapper** | **FROZEN** | `remix2/src/types/researchTable.ts`<br>`remix2/src/research/tableMapper.ts`<br>`remix2/tests/geometryResearchRowMapperRegression.test.ts` |
| **R2-09** | **Read-Only Geometry Research Table Component** | **FROZEN** | `remix2/src/ui/components/GeometryResearchTable.tsx`<br>`remix2/tests/geometryResearchTableRegression.test.ts` |
| **R2-10** | **Checkpoint Buffer v0.1 (3-Slot Return Memory)** | **FROZEN** | `remix2/src/research/checkpointBuffer.ts`<br>`remix2/tests/checkpointBufferRegression.test.ts` |
| **R2-11** | **Agent Observation Utilities v0.1** | **FROZEN** | `remix2/src/research/snapshotDiff.ts`<br>`remix2/tests/agentObservationUtilities.test.ts` |
| **R2-12** | **AAM Natural Language Gateway** | **PLANNED** | Integration layer for natural language semantic translation |
| **R2-13** | **Formal Verification Core & Rule Registry** | **PLANNED** | Classical theorems (VC-01..VC-14, Ptolemy, Simson, etc.) |
| **R2-14** | **Multi-Domain Adapters (Triangle, Pentagon)** | **PLANNED** | Adapters for $N=3, N=5, N=6$ polygons |
| **R2-15** | **Separator Mesh Partitioning** | **PLANNED** | Universal planar/circular partition mesh |
| **R2-16** | **End-to-End Multi-Domain Integration Suite** | **PLANNED** | Full integration test coverage across all domains |

---

## 3. Active Architectural Gaps

### GAP-B — Research Table Custom Construction Observables
- **Status:** OPEN / NON-BLOCKING
- **Description:** `GeometryResearchRow` v0.1 maps macro area metrics ($S_{circle}, S_{quad}, S_{gap}, K_{fill}, K_{gap}$). Arbitrary construction metrics (such as diagonal length $AC$) are accessible to agents via `GET_ENTITY_MEASUREMENT` and `Snapshot.constructions`, but are not yet mapped as configurable columns in the UI Research Table.

### GAP-E — High-Level Batch Exploration Semantic Command
- **Status:** OPEN / DEFERRED
- **Description:** Headless parametric sweeping exists as a pure TypeScript function `runParametricExploration(...)`. Encapsulating a full parametric sweep into a single command (`RUN_PARAMETRIC_EXPLORATION`) is scheduled for future agent automation workflows.

### GAP-INT — Dynamic Circle Intersections
- **Status:** OPEN / FUTURE CAPABILITY
- **Description:** `AuxiliaryEngine` currently recomputes intersections for `LINE × LINE`, `LINE × SEGMENT`, and `SEGMENT × SEGMENT`. Dynamic intersections for `LINE × CIRCLE` and `CIRCLE × CIRCLE` will be added in a dedicated geometry upgrade package.

### GAP-CP-01 — UI Project Lifecycle Binding
- **Status:** DEFERRED
- **Description:** `CheckpointBuffer` supports dependency injection via `CommandExecutionContext`, but the React UI shell currently uses the session-level buffer instance. Per-project lifecycle binding will be connected when multi-project workspace management is added to the UI.

---

## 4. Current Test Suite Status

All **16 of 16** test suites in Remix 2 execute cleanly:

```bash
npm run test:r2
# Result: 16 test suites passed (100% PASS)
```
