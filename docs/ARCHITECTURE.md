# Geometry Reasoning Stand 2 — Architecture

**Status:** Living Architectural Specification (v0.1)

---

## 1. General Architectural Hierarchy

Geometry Reasoning Stand 2 (Remix 2) is organized into five strictly decoupled horizontal layers:

```text
                      GEOMETRY REASONING STAND 2
                                   │
        ┌──────────────────────────┴──────────────────────────┐
        │                                                     │
  ┌─────▼─────────────────────────┐             ┌─────────────▼─────────────────┐
  │         COMMON KERNEL         │             │         DOMAIN LAYER          │
  │  - Universal Geometry State   │             │  - Cyclic Quad (CQNS N=4)     │
  │  - Domain Profile Contract    │             │  - Triangle Stand (N=3)       │
  │  - Topology Guard             │             │  - Planar Quadrilateral (N=4) │
  │  - Arc / Chord Normalizer     │             │  - Pentagon (N=5)             │
  │  - GeometryCore Invariants    │             │  - Hexagon / N-gon (Planned)  │
  └─────────────┬─────────────────┘             └─────────────┬─────────────────┘
                │                                             │
        ┌───────┴─────────────────────────────────────────────┘
        │
  ┌─────▼───────────────────────────────────────────────────────────────────────┐
  │                 HEADLESS SEMANTIC COMMAND DISPATCHER                        │
  │  - SemanticCommand Protocol (Unified interface for UI & AI Agents)          │
  │  - Deterministic Dispatcher with Topology Validation & Rollback             │
  │  - Dynamic Auxiliary State & Straightedge/Compass DAG Engine                │
  └─────────────┬─────────────────────────────────────────────┬─────────────────┘
                │                                             │
        ┌───────┴───────────────────┐                         │
        │                           │                         │
  ┌─────▼─────────────────────┐ ┌───▼─────────────────────────▼─────────────────┐
  │    OBSERVATION & MEMORY   │ │                   UI LAYER                    │
  │  - CheckpointBuffer (3-Slot)│ │  - Canvas Stage & Viewport Normalization    │
  │  - GeometryStateSnapshot  │ │  - GeometryResearchTable Component            │
  │  - Research Row Mapper    │ │  - Interactive Measurement Tools              │
  │  - Snapshot Diff Utility  │ │  - Pure Projection (Zero Math Authority)      │
  │  - Entity Measurements    │ └───────────────────────────────────────────────┘
  └───────────────────────────┘
```

---

## 2. Authority Model & Architectural Roles

To eliminate circular dependencies and prevent "epistemic drift," every subsystem has a strictly delineated authority:

| Component | Authority / Responsibility | Epistemic Constraint | Status in R2 |
| :--- | :--- | :--- | :--- |
| **`UniversalGeometryState`** | **Single Source of Truth** for canonical geometric primitives (points, circles, angular parameters). | Emits immutable versioned state (`stateVersion`); never performs proofs or theorem validation. | **FROZEN** |
| **`GeometryCore`** | **Mathematical Computation Authority** for pure arithmetic, line equations, canonical directions, and metrics. | Pure functions; strictly forbidden from issuing epistemic status tags or mutating state. | **FROZEN** |
| **`TopologyGuard`** | **Structural Integrity Authority** (validating non-degeneracy, non-coincidence, angle ordering). | Validates structural prerequisites; does not assert mathematical truth or theorem validity. | **FROZEN** |
| **`ArcChordNormalizer`** | **Parametric Indexing Authority** for angular intervals, wrap-around tracking, and arc/chord metrics. | Read-only calculation of arc intervals; preserves input array order without silent sorting. | **FROZEN** |
| **`AuxiliaryEngine`** | **Operational Construction DAG Authority** managing parent-child relations and dynamic geometry recomputation. | Lineage tracking and metric recalculation; construction existence does NOT establish theorem validity. | **FROZEN** |
| **`CommandDispatcher`** | **Central Operational Pipeline** executing semantic commands for both UI and Autonomous Agents. | Dispatches commands to state, validates topology, and recomputes DAG; zero theorem generation. | **FROZEN** |
| **`CheckpointBuffer`** | **Operational Return Memory Authority** managing strictly 3 isolated slots (`1 \| 2 \| 3`). | Pure return point storage; isolated from external snapshots and undo histories. | **FROZEN** |
| **`GeometryStateSnapshot`** | **Raw Observation DTO** capturing canonical inputs, coordinates, DAG entities, and area metrics. | Pure read-only projection; contains ZERO analysis or speculative hypotheses. | **FROZEN** |
| **`SnapshotDiff`** | **DTO Comparison Utility** computing mathematical deltas (`after - before`) between snapshots. | Pure subtraction of existing numeric values; zero formula duplication. | **FROZEN** |
| **`GeometryResearchTable`** | **Tabular Projection Layer** presenting parametric exploration datasets. | Pure read-only view; does not perform geometry calculations table-side. | **FROZEN** |
| **`AAM Gateway`** | **Natural Language Translation Gateway** converting human intent into structured `SemanticCommand`s. | Translation only; not a geometry engine, verification authority, or proof system. | **PLANNED** |
| **`User Interface (UI)`** | **Presentation & Interaction Layer** (SVG Canvas, Research Table, Inspection Cards). | Pure consumer of kernel and auxiliary states; strictly forbidden from independent mathematical truth assertions. | **FROZEN** |

---

## 3. Core Constitutional Principles

### A. The Prime Constitutional Axiom
> **AGENT MAY BE WRONG. THE STAND MUST NOT.**

The stand produces verified facts (coordinates, equations, lengths, areas, ratios). The agent consumes these facts and interprets them. The stand never accepts unproven agent assertions as factual geometry.

### B. Epistemic Separation Rules
1. **Mathematical Fact ≠ Software Action ≠ Research Interpretation:**
   - A *Mathematical Fact* is a deterministic coordinate or metric value computed by `GeometryCore`.
   - A *Software Action* is a command executed through `CommandDispatcher`.
   - A *Research Interpretation* is an analytical hypothesis formulated by an external agent.
2. **Construction ≠ Verification:**
   - Constructing a straightedge line, compass circle, or diagonal in `AuxiliaryEngine` records operational lineage. It does not prove that a geometric theorem holds.
3. **Object Existence ≠ Relation Validity:**
   - An entity (e.g. diagonal segment $AC$) may exist in the DAG, but its metric relationship must be evaluated explicitly.
4. **Snapshot ≠ Checkpoint:**
   - A **Snapshot** is a lightweight, read-only observation DTO produced in unlimited quantities for data collection and analysis.
   - A **Checkpoint** is an operational return point stored in one of strictly three memory slots (`1 | 2 | 3`).
5. **No Magic Geometry:**
   - Geometry must arise strictly through declared, explicit operations with recorded provenance and parent IDs.

---

## 4. Headless Semantic Command Pipeline

All modifications to the geometry stand pass through a single, deterministic pipeline:

$$\text{Human UI} \mathbin{/} \text{Autonomous AI Agent} \xrightarrow{\texttt{SemanticCommand}} \texttt{dispatchSemanticCommand()} \longrightarrow \begin{cases} \texttt{UniversalGeometryState.commitMutation()} \\ \texttt{AuxiliaryEngine.recomputeAuxiliaryGeometry()} \\ \texttt{CheckpointBuffer} \end{cases}$$

### Supported Command Catalog (v0.1)

1. **Selection & Editing:** `SELECT`, `ERASE_ENTITY`.
2. **Canonical Parameters:** `SET_CANONICAL_VERTEX_ANGLE`, `SHIFT_CANONICAL_VERTEX_ANGLE`.
3. **Construction DAG:** `CONSTRUCT_POINT`, `CONSTRUCT_SEGMENT`, `CONSTRUCT_DIAGONAL`, `CONSTRUCT_LINE`, `CONSTRUCT_CIRCLE`, `CONSTRUCT_PARALLEL`, `CONSTRUCT_PERPENDICULAR`, `CONSTRUCT_ANGLE_BISECTOR`, `CONSTRUCT_INTERSECTION`, `CONSTRUCT_COMPASS`.
4. **Measurements:** `MEASURE_DISTANCE`.
5. **Operational Memory:** `SAVE_CHECKPOINT`, `RESTORE_CHECKPOINT`, `CLEAR_CHECKPOINT`, `GET_CHECKPOINT_INFO`.
6. **Observation Layer:** `GET_ACTIVE_SNAPSHOT`, `GET_ENTITY_MEASUREMENT`.

---

## 5. Checkpoint Buffer Architecture (v0.1)

The **Checkpoint Buffer** provides a 3-slot operational return memory for parametric research:

- **Slots:** Exactly three slots: `1 | 2 | 3`.
- **Recommended Usage:**
  - `Slot 1`: **BASELINE** (initial geometry and base constructions).
  - `Slot 2`: **INTERMEDIATE / CONTROL** (critical extremum or reference state).
  - `Slot 3`: **BRANCH** (alternative construction line).
- **Immutability & Isolation:**
  - Universal geometry state is captured via frozen instances.
  - Auxiliary state is cloned via `cloneAuxiliaryState(...)` ensuring zero shared mutable references.
- **Monotonic Restore:**
  - Restoring a checkpoint does **not** roll back `stateVersion`.
  - It commits a restore mutation onto the active state ($v_{restore} > v_{live} > v_{saved}$), preserves provenance (`RESTORE_CHECKPOINT_1_FROM_V1`), and dynamically recomputes dependent auxiliary entities.

---

## 6. Canonical Autonomous Research Workflow

```text
[ 1. OPEN / LOAD ] ──────► Initialize canonical geometry state (e.g. Cyclic N=4)
        │
        ▼
[ 2. BASELINE ] ─────────► Construct essential auxiliary lines/diagonals
        │
        ▼
[ 3. CHECKPOINT ] ───────► SAVE_CHECKPOINT(1, "baseline")
        │
        ▼
[ 4. PARAMETER STEP ] ───► SET_CANONICAL_VERTEX_ANGLE(θ_A = 50°)
        │
        ▼
[ 5. RECOMPUTE ] ────────► Automatic dynamic DAG recomputation in AuxiliaryEngine
        │
        ▼
[ 6. OBSERVE ] ──────────► GET_ENTITY_MEASUREMENT("diag_A_C") or GET_ACTIVE_SNAPSHOT
        │
        ▼
[ 7. SNAPSHOT ] ─────────► Collect Snapshot S_i into agent observation dataset
        │
        ▼
[ 8. COMPARE ] ──────────► diffGeometrySnapshots(S_baseline, S_i)
        │
        ▼
[ 9. RESTORE ] ──────────► RESTORE_CHECKPOINT(1) (Return to baseline with monotonic v_next)
        │
        ▼
[ 10. REPEAT / BRANCH ] ─► Explore next parameter or alternative hypothesis branch
```

---

## 7. Autonomous Agent Safety Boundaries

- **The Agent MAY:**
  - Dispatch semantic commands through `dispatchSemanticCommand`.
  - Capture snapshots and inspect entity measurements.
  - Manage checkpoint slots and restore previous baselines.
  - Calculate deltas and analyze data externally.
- **The Agent MUST NOT:**
  - Directly mutate `GeometryState` or `AuxiliaryState` objects.
  - Weaken `TopologyGuard` constraints or alter mathematical definitions in `GeometryCore`.
  - Inject fabricated facts into the system without explicit construction lineage.
  - Treat speculative hypotheses as verified stand truths.
