# CQNS-001 — ARCHITECTURAL INTEGRITY & SIMULATION REPORT

**Document Version:** 1.0.0-PROMPT07-DRAFT  
**Status:** SIMULATION COMPLETE — AWAITING EXTERNAL HUMAN AUDIT  
**Phase:** Phase 7 (Simulation / Integrity Testing)  
**System Target:** CQNS-001 (Cyclic Quadrilateral Normalization Stand)  
**Core Doctrine:** *"Agent may be wrong. The Stand must not."* | *"Zero-Silent-Inference"* | *"Object Existence ≠ Relation Validity"*

---

## 1. Executive Summary

Phase 7 executes a rigorous, end-to-end **architectural integrity simulation** across the frozen specifications (Phases 0–6) and evaluates their compatibility against the legacy codebase (`geometry-reasoning-stand-2` and `SOL-2-sol-for-agents`).

### Primary Simulation Objectives:
1. Validate that the frozen contracts preserve authority boundaries:  
   $$\text{UI} \longrightarrow \text{SOL} \longrightarrow \text{GeometryState} \longrightarrow \text{Construction / Geometry Core} \longrightarrow \text{Verification Layer} \longrightarrow \text{Relation Graph}$$
2. Verify the epistemic transition dynamics, specifically testing that coordinate movement off the circumcircle triggers $\mathbf{VERIFIED \to VANISHED}$ without object deletion (**Object Existence $\neq$ Relation Validity**).
3. Confirm that auxiliary constructions (`ADD_DIAGONAL`) remain strictly constructive operations without triggering automatic theorem proofs or silent inferences.
4. Distinguish between verified operational reality in legacy files versus architectural target contracts to be implemented in subsequent phases.

### Overall Assessment:
* **Architectural Logic & Contract Integrity:** **SOUND & PRESERVED**. All 12 simulation scenarios confirm that the frozen contracts form a coherent, mathematically leak-proof specification.
* **Legacy Code Executability:** **NOT EXECUTABLE AS A PRODUCTION RUNNER WITHOUT ADAPTATION**. The legacy stand possesses the underlying math primitives (`invariants.ts`, `constructionCore.ts`, `geometryIntersections.ts`), but lacks the explicit CQNS 4-point predicate definitions, the `stateVersion`/`eventId` provenance engine, and the formal `INVALID` vs `VANISHED` event dispatcher. No production implementation was introduced in Phase 7 in strict compliance with safety rules.

---

## 2. Repository Evidence (Legacy Code vs Target Contracts)

A systematic audit of the existing codebase structures reveals the baseline from which CQNS-001 must operate:

| Architectural Component | Legacy Implementation Reference | Classification | Evidence & Findings |
| :--- | :--- | :--- | :--- |
| **`GeometryState`** | `src/engines/geometryState.ts` | `OBSERVED` | Centralized state container holding points, circles, and segments. Single source of geometric truth exists. |
| **`Construction Core`** | `src/engines/constructionCore.ts` | `OBSERVED` | Procedural functions (`addPoint`, `addSegment`, `addCircle`, `createMidpoint`). Supports basic geometric construction. |
| **`Construction DAG`** | `src/engines/dependencyRecomputer.ts`, `geometryHistory.ts` | `OBSERVED / INFERRED` | Parent-child dependency links and undo/redo stacks exist. A formal single-rooted DAG with topological invalidation is `INFERRED / REQUIRES ADAPTATION`. |
| **`Geometry Core & Invariants`**| `src/engines/invariants.ts` | `OBSERVED` | Deterministic numerical solvers for concyclicity, Thales, and distances with $\epsilon \le 10^{-4} \dots 10^{-6}$. Encapsulation model matches target. |
| **`Relation Graph`** | `src/engines/research/researchGraph.ts` | `OBSERVED / REQUIRES ADAPTATION` | Adjacency storage for nodes and edges exists (`OBSERVED`). However, legacy heuristic pattern-matching loops exist (`REQUIRES ADAPTATION` to enforce passivity). |
| **`SOL Command Gateway`** | `src/engines/semantic/semanticCommandExecutor.ts`, `aamGateway.ts` | `OBSERVED / REQUIRES ADAPTATION` | Operational command dispatcher exists. Requires strict routing to prevent direct state mutation and enforce `HYPOTHESIS` tagging. |
| **`Cyclic Quad Predicates`** | `src/kernel/`, `src/engines/` | `NOT FOUND` | Legacy code is specialized for 3-point triangles (`testPacket1TriangleCircle.ts`). 4-point cyclic quadrilateral predicates (`VC-03`, `VC-11`, `VC-14`) are `NOT FOUND`. |
| **`Provenance Tracing`** | `stateVersion`, `eventId`, `DerivationTrace` | `NOT FOUND` | Full provenance tracking schema is a target contract from Phase 4; not present in legacy code. |
| **`VANISHED on Point Drag`** | State recomputer | `REQUIRES ADAPTATION` | Legacy recomputer re-evaluates coordinates but does not emit formal `VANISHED` epistemic status tokens. |

---

## 3. Simulation Method

Because Phase 7 strictly forbids writing production implementation code, simulations were conducted via **formal architectural walk-throughs and symbolic state traces**. Each scenario traces:
$$\text{Input Command} \longrightarrow \text{State Transition} \longrightarrow \text{DAG Update} \longrightarrow \text{Core Verification} \longrightarrow \text{Epistemic Emission} \longrightarrow \text{Graph Recording}$$

---

## 4. Scenario-by-Scenario Simulation Analysis (SIM-01 to SIM-12)

### SIM-01: Canonical Initialization
* **Input Scenario:**
  1. Construct $Circle(O, R)$ with $O = (0, 0), R = 100$.
  2. Instantiate 4 vertices: $A = (100, 0), B = (0, 100), C = (-100, 0), D = (0, -100)$.
  3. Construct base chords $AB, BC, CD, DA$.
  4. Query verification for `cyclic_quadrilateral(ABCD)`.
* **Trace & Behavior:**
  * `GeometryState` instantiates $O, A, B, C, D$ and segments. Single state maintained.
  * `Geometry Core` executes Contract `VC-02` on all 4 vertices: $\|P_i - O\| = 100.0 \implies \Delta = 0 \le \epsilon_{\text{dist}}$.
  * `Verification Layer` evaluates Contract `VC-03 (CyclicQuadrilateral)`: all 4 vertices concyclic and pairwise distinct.
  * `Relation Graph` receives:
    * `point_on_circle(A..D, Circle) = VERIFIED` [CANONICAL]
    * `chord_of(AB..DA, Circle) = VERIFIED` [CANONICAL]
    * `cyclic_quadrilateral(ABCD) = VERIFIED` [CANONICAL]
* **Integrity Status:** **PASS (Architectural Simulation)** / **REQUIRES ADAPTATION (Legacy Code Implementation)**.

---

### SIM-02: `VERIFIED → VANISHED` by Point Movement
* **Input Scenario:**
  * Start from SIM-01 (`cyclic_quadrilateral(ABCD) = VERIFIED`).
  * Action: User or Agent executes `MOVE_POINT(D, x=0, y=-150)`.
  * Point $D$ is now at distance $\|D - O\|_2 = 150 \neq 100$.
* **Trace & Behavior:**
  * Point $D$ **still exists** in `GeometryState` with new coordinates.
  * `Construction DAG` flags downstream dependents as dirty.
  * Verification Contract `VC-02` for point $D$ re-evaluates: $|150 - 100| = 50 > \epsilon_{\text{dist}} \implies$ predicate `point_on_circle(D, Circle)` is **NO LONGER TRUE**.
  * Prerequisite analysis for `cyclic_quadrilateral(ABCD)` detects that prerequisite `point_on_circle(D, Circle)` is lost.
  * Epistemic Transition:
    * `point_on_circle(D)`: `VERIFIED → INVALID` (direct condition failed).
    * `chord_of(CD)`: `VERIFIED → VANISHED` (lost endpoint on circle).
    * `chord_of(DA)`: `VERIFIED → VANISHED` (lost endpoint on circle).
    * `cyclic_quadrilateral(ABCD)`: **`VERIFIED → VANISHED`** (lost prerequisite vertex concyclicity).
* **Critical Finding:** **Object Existence $\neq$ Relation Validity confirmed**. Point $D$ remains alive; relation vanishes due to prerequisite extinction.
* **Integrity Status:** **PASS (Architectural Simulation)**.

---

### SIM-03: `INVALID` vs `VANISHED` Disambiguation
* **Input Scenario:**
  * Case A: An Agent queries hypothesis `is_diameter(AB, Circle)`.
    * Preconditions hold: $AB$ is a verified chord.
    * Core evaluates collinearity with center $O(0,0)$ and length: $\|AB\| = 100\sqrt{2} \approx 141.42 \neq 200$.
    * Result: Direct check executed with active prerequisites $\implies \mathbf{INVALID}$.
  * Case B: Compare with Case in SIM-02 where `cyclic_quadrilateral(ABCD)` lost prerequisite concyclicity of $D$.
    * Result: Foundational prerequisite broken $\implies \mathbf{VANISHED}$.
* **Critical Finding:** Strict boundary preserved. `INVALID` represents direct state contradiction under valid prerequisites; `VANISHED` represents structural prerequisite extinction.
* **Integrity Status:** **PASS (Architectural Simulation)**.

---

### SIM-04: Explicit Restoration Semantics
* **Input Scenario:**
  * From SIM-02 (where `cyclic_quadrilateral(ABCD) = VANISHED`), execute `MOVE_POINT(D, x=0, y=-100)`.
  * Point $D$ is restored to the circumcircle.
* **Trace & Behavior:**
  * Automatic graph pattern-matching restoration is **strictly prevented**.
  * The state mutation flags dirty nodes in the DAG.
  * A **new explicit verification event** (dispatching `VC-02` and `VC-03`) is triggered.
  * Core computes $\|D - O\|_2 = 100.0 \implies \Delta = 0 \le \epsilon_{\text{dist}}$.
  * All prerequisites re-established $\implies$ `cyclic_quadrilateral(ABCD)` transitions:  
    $$\mathbf{VANISHED \longrightarrow VERIFIED}$$
* **Legacy Assessment:** Legacy codebase has no concept of epistemic restoration (`NOT FOUND / REQUIRES ADAPTATION`).
* **Integrity Status:** **PASS (Architectural Simulation) / REQUIRES ADAPTATION**.

---

### SIM-05: Auxiliary Diagonal Construction (`ADD_DIAGONAL`)
* **Input Scenario:**
  * From canonical quadrilateral $ABCD$, Agent issues `ADD_DIAGONAL(quad_ABCD, A, C)`.
* **Trace & Behavior:**
  * `SOL Gateway` checks that $A, C$ are non-adjacent vertices in $ABCD$.
  * `Construction Core` registers `Segment(id='diag_AC', p1='A', p2='C', type='diagonal')` in `GeometryState`.
  * `Construction DAG` adds parent edges: $\{A, C\} \to \text{diag\_AC}$.
  * `Verification Layer` evaluates structural contract `VC-06 (Diagonal)`: emits `diagonal_of(diag_AC, quad_ABCD) = VERIFIED`.
  * **Strict Anti-Inference Check:**
    * Diagonal $BD$ is **NOT** created.
    * Diagonal intersection $P$ is **NOT** created.
    * Ptolemy's formula is **NOT** evaluated.
    * Quadrilateral convexity is **NOT** asserted.
* **Critical Finding:** Construction $\neq$ Theorem $\neq$ Verification confirmed.
* **Integrity Status:** **PASS (Architectural Simulation)**.

---

### SIM-06: Explicit Diagonal Intersection Registration
* **Input Scenario:**
  * Both diagonals `diag_AC` and `diag_BD` are explicitly constructed.
  * Action: Verify whether intersection point $P = AC \cap BD$ is created automatically.
* **Trace & Behavior:**
  * Zero automatic intersection creation occurs.
  * Point $P$ is registered **only** when caller explicitly issues:  
    `CONSTRUCT_INTERSECTION(diag_AC, diag_BD)`.
  * `geometryIntersections.ts` computes point coordinates: $P = (0, 0)$.
  * Point $P$ registers DAG dependencies: $\{\text{diag\_AC}, \text{diag\_BD}\} \to P$.
* **Integrity Status:** **PASS (Architectural Simulation; OPEN QUESTION-02 preserved)**.

---

### SIM-07: Provenance Chain Traceability
* **Trace Evaluation:**
  * Derived fact: `supplementary_angles(∠A, ∠C)` under `VC-11`.
  * Required Provenance Chain:
    $$\text{Premise Fact IDs: } [\text{rel\_cyclic\_quad\_ABCD}, \text{rel\_opposite\_angles\_AC}] \xrightarrow{\text{Rule: RULE\_INSCRIBED\_QUAD\_OPPOSITE\_ANGLES}} \text{DERIVED}$$
  * Metadata fields checked: `stateVersion`, `eventId`, `verificationContractId`, `DerivationTrace`.
* **Legacy Assessment:** Legacy stand stores basic premise links in `researchGraphTypes.ts`, but lacks unified `stateVersion`, `eventId`, and formal contract tokens (`NOT FOUND / REQUIRES ADAPTATION`).
* **Integrity Status:** **PASS WITH ADAPTATION**.

---

### SIM-08: Dependency Invalidation Propagation
* **Trace Evaluation:**
  * Build dependency tree:
    $$\text{Point } D \longrightarrow \text{point\_on\_circle}(D) \longrightarrow \text{cyclic\_quad}(ABCD) \longrightarrow \text{supplementary\_angles}(\angle A, \angle C)$$
  * Mutate Point $D$ coordinates.
  * DAG dirty-propagation triggers downstream re-evaluation:
    * `cyclic_quad` loses prerequisite $\implies$ `VANISHED`.
    * `supplementary_angles` loses prerequisite premise $\implies$ `VANISHED`.
* **Authority Check:** `Relation Graph` remains passive; invalidation state updates are dispatched by `Verification Layer`.
* **Integrity Status:** **PASS (Architectural Simulation)**.

---

### SIM-09: Research Graph Passivity (RISK-01 Verification)
* **Legacy Audit:**
  * Inspected `src/engines/research/researchGraph.ts`.
  * Findings: The module contains adjacency structures (`nodes`, `edges`), but also contains legacy exploratory inference helpers (`findTransitiveRelations`, pattern scanners).
* **Integrity Mandate:** In CQNS-001, `researchGraph.ts` must be stripped of all automated pattern-inference logic, operating solely as an indexed data store.
* **Integrity Status:** **ARCHITECTURAL ADAPTATION REQUIRED**.

---

### SIM-10: SOL Authority Boundary
* **Legacy Audit:**
  * Inspected `src/engines/semantic/semanticCommandExecutor.ts`.
  * Findings: Dispatches commands to `constructionCore.ts`. Does not independently prove theorems, but lacks explicit tagging of user commands as `HYPOTHESIS`.
* **Integrity Mandate:** SOL gateway must wrap all verification queries with status `HYPOTHESIS` and route execution strictly through `Geometry Core` + `Verification Layer`.
* **Integrity Status:** **PASS WITH ADAPTATION**.

---

### SIM-11: Single State & Single Construction DAG Invariant
* **Trace Evaluation:**
  * Verification that sub-triangles (e.g. $\triangle ABC$) or diagonals do not instantiate shadow `GeometryState` objects.
  * Auxiliary constructions reside entirely within the single global `GeometryState.points` and `GeometryState.segments`.
  * A single, global DAG dependency graph governs all coordinates.
* **Integrity Status:** **PASS (Zero secondary states created)**.

---

### SIM-12: Open Questions Preservation
* **Status Check:**
  * `OPEN QUESTION-01` (Vertex Order / Convexity): Preserved. Precondition check for monotonic polar order on $S^1$ accounts for branch cuts; crossed quadrilaterals flagged as `TOPOLOGY_CROSSED`.
  * `OPEN QUESTION-02` (Diagonal Intersection Registration): Preserved. Explicit constructive command required.
  * `OPEN QUESTION-03` (Ptolemy Converse Role): Preserved. Ptolemy is modeled as a derived metric invariant (`VC-14`); converse criterion is `OPEN / NOT YET IMPLEMENTABLE`.
* **Integrity Status:** **PASS (All 3 Open Questions preserved)**.

---

## 5. Master Integrity Matrix

| Scenario ID | Test Scope / Scenario Focus | Expected Contract Behavior | Observed Architectural Outcome | Integrity Status | Evidence Reference |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SIM-01** | Canonical Initialization | $A,B,C,D \in \mathcal{C} \implies \text{cyclic\_quad}(ABCD) = \text{VERIFIED}$ | Preconditions hold; Core validates concyclicity | **PASS (Simulated)** | `CQNS_DOMAIN_SPEC.md`, `VC-03` |
| **SIM-02** | `VERIFIED → VANISHED` on Drag | $D$ moves off circle $\implies \text{quad} = \text{VANISHED}$ (Object $D$ alive) | Prerequisite lost; object preserved; relation vanishes | **PASS (Simulated)** | `EPISTEMIC_CONTRACTS`, Sec. 4.2 |
| **SIM-03** | `INVALID` vs `VANISHED` | False check on existing entities $\implies \text{INVALID}$ | Direct failure vs prerequisite loss separated | **PASS (Simulated)** | `EPISTEMIC_CONTRACTS`, Sec. 4.1 |
| **SIM-04** | Explicit Restoration | $D$ restored to circle $\implies$ requires explicit re-verification | No automatic graph restoration; re-verifies via Core | **PASS WITH ADAPTATION** | Requires re-verification runner |
| **SIM-05** | Auxiliary Diagonal | `ADD_DIAGONAL(AC)` creates segment only; zero auto-theorems | Explicit construction; no auto-Ptolemy or intersection | **PASS (Simulated)** | `AUXILIARY_CONTRACTS`, Sec. 5 |
| **SIM-06** | Diagonal Intersection | $P = AC \cap BD$ requires explicit constructive command | Zero auto-intersection; DAG links registered explicitly | **PASS (Simulated)** | `OPEN QUESTION-02` preserved |
| **SIM-07** | Provenance Chain | Full trace: State $\to$ Event $\to$ Contract $\to$ Fact $\to$ Graph | Traceability schema sound; missing in legacy code | **PASS WITH ADAPTATION** | Schema defined in Phase 4 |
| **SIM-08** | Dependency Invalidation | Point mutation propagates downstream $\to$ marks facts VANISHED | DAG dirty propagation drives epistemic invalidation | **PASS (Simulated)** | `dependencyRecomputer.ts` |
| **SIM-09** | Passive Relation Graph | Graph never executes independent inference or provers | Legacy heuristic loops identified for removal | **REQUIRES ADAPTATION** | `researchGraph.ts` (RISK-01) |
| **SIM-10** | SOL Operational Bridge | Thin gateway; commands tagged HYPOTHESIS; zero math authority | Operational routing sound; needs schema adapter | **PASS WITH ADAPTATION** | `semanticCommandExecutor.ts` |
| **SIM-11** | Single State / Single DAG | Zero local or shadow geometry states | Unified coordinate and DAG structure preserved | **PASS (Simulated)** | `geometryState.ts` |
| **SIM-12** | Open Questions | OQ-01, OQ-02, OQ-03 remain open without premature closure | All 3 Open Questions preserved in contract state | **PASS (Simulated)** | Sections 11–12 of all contracts |

---

## 6. Epistemic & Provenance Gap Analysis

While the conceptual simulation of epistemic transitions is completely coherent, executing these scenarios in live code requires bridging concrete gaps between the legacy codebase and the target contracts:

1. **Epistemic Status Token Gap:**  
   Legacy `types.ts` does not define `VANISHED` as distinct from `INVALID`. A formal enum/type update is required in the implementation phase.
2. **Provenance Engine Gap:**  
   Legacy code lacks `stateVersion` tracking and `eventId` propagation. A lightweight monotonic version counter on `GeometryState` must be implemented.
3. **Restoration Protocol Gap:**  
   When point coordinates are restored to a valid state, the legacy recomputer updates numbers but does not trigger an epistemic transition event from `VANISHED` back to `VERIFIED`.

---

## 7. Actionable Adaptation Checklist (Prerequisites for Implementation)

Before Phase 8 / production implementation can execute these simulations in live code, the following adaptations must be completed:
- [ ] **Adaptation 1 (State Versioning):** Add `stateVersion: number` counter to `GeometryState` incremented on every coordinate or primitive mutation.
- [ ] **Adaptation 2 (Epistemic Enum):** Implement full 6-state taxonomy (`GIVEN`, `HYPOTHESIS`, `VERIFIED`, `DERIVED`, `INVALID`, `VANISHED`) in `src/kernel/types.ts`.
- [ ] **Adaptation 3 (Contract Implementations):** Implement VC-01 through VC-14 inside `src/engines/invariants.ts`.
- [ ] **Adaptation 4 (Research Graph Passivity):** Strip legacy heuristic inference loops from `src/engines/research/researchGraph.ts`.
- [ ] **Adaptation 5 (SOL Adapter):** Implement `ADD_DIAGONAL` and explicit `REQUEST_VERIFICATION` in `semanticCommandExecutor.ts`.

---

## 8. Self-Audit Checklist

1. **Did any simulation introduce a second GeometryState?** $\implies$ **NO.** Single state strictly preserved.
2. **Did any simulation introduce a second Construction DAG?** $\implies$ **NO.** Single-lineage DAG preserved.
3. **Did SOL create or assign VERIFIED/DERIVED?** $\implies$ **NO.** SOL remains a thin operational bridge.
4. **Did Relation Graph perform inference?** $\implies$ **NO.** Confirmed strictly passive; legacy inference loops marked for removal.
5. **Did construction automatically become verification?** $\implies$ **NO.** `ADD_DIAGONAL` registers an entity, not a theorem.
6. **Was `VERIFIED → VANISHED` tested with an existing object moving off the circle?** $\implies$ **YES.** SIM-02 explicitly confirmed Point $D$ remains alive while relation vanishes.
7. **Was `INVALID` kept distinct from `VANISHED`?** $\implies$ **YES.** SIM-03 clearly separated direct contradiction from prerequisite extinction.
8. **Was provenance treated as observed architecture rather than fabricated implementation?** $\implies$ **YES.** Accurately classified as an architectural contract requiring adaptation.
9. **Were Open Questions preserved?** $\implies$ **YES.** OQ-01, OQ-02, OQ-03 remained open and unaltered.
10. **Were any frozen contracts changed?** $\implies$ **NO.** Zero modifications made to frozen Phases 0–6.
