# BASELINE AUDIT REPORT: Existing Geometry Reasoning Stand Architecture vs CQNS-001 Targets

**Document Status:** AUDIT COMPLETE — AWAITING EXTERNAL HUMAN REVIEW  
**Audit Scope:** `geometry-reasoning-stand-2` / `SOL-2-sol-for-agents` / Inscribed Triangle Stand Lineage  
**Target System:** `CQNS-001` (Cyclic Quadrilateral Normalization Stand)  
**Standard Classification:** `[OBSERVED]` | `[INFERRED]` | `[HYPOTHESIS]` | `[NOT FOUND]`  

---

## 1. Executive Summary

This baseline audit evaluates the existing codebase, architectural contracts, operational protocols, and engine modules of the Geometry Reasoning Stand lineage (`geometry-reasoning-stand-2`, `SOL-2-sol-for-agents`, Inscribed Triangle Stand) against the architectural invariants and canonical requirements of **CQNS-001** (*Cyclic Quadrilateral Normalization Stand*).

The central design doctrine governing this initiative is:
> **"Agent may be wrong. The Stand must not."**  
> *"Provenance ≠ Dependency" and "Reusable Component ≠ Architectural Authority".*

### Key Findings Summary
1. **State & Construction Invariant:** The existing stand contains a functional `GeometryState` (`src/engines/geometryState.ts`) and a construction trace (`src/engines/research/constructionTrace.ts`, `src/engines/geometryHistory.ts`), but they are currently semi-decoupled across classical coordinate definitions and episodic research snapshots. For CQNS-001, a unified, single-source-of-truth `GeometryState` coupled directly with a strict `Construction DAG` must be enforced.
2. **Deterministic Mathematical Core vs Verification Layer:** Mathematical calculation (`src/engines/constructionCore.ts`, `src/engines/invariants.ts`, `src/kernel/consistencyEngine.ts`) is well-developed with explicit numeric thresholds ($\epsilon = 10^{-7} \dots 10^{-4}$). In CQNS-001, epsilon isolation must be strictly encapsulated inside the Verification Layer and never leaked into high-level SOL semantic tokens or epistemic truth assertions.
3. **Relation Graph Discipline:** The existing `researchGraph.ts` / `derivedRelations.ts` modules store relational predicates, dependencies, and derivation traces. Crucially, they must remain an indexed epistemic storage of verified facts and hypotheses, rather than degrading into a parallel computational solver (*Relation Graph ≠ second Geometry Core*).
4. **Epistemic Model & Canonical Scope:** The target epistemic taxonomy (`GIVEN`, `HYPOTHESIS`, `VERIFIED`, `DERIVED`, `INVALID`, `VANISHED`) with orthogonal origin tracking (`CANONICAL`, `EXTENSION_SCENARIO`) is partially represented in `src/kernel/types.ts` and `src/engines/research/researchGraphTypes.ts`. The semantic difference between `INVALID` (failing geometric invariant under current point state) and `VANISHED` (destruction/loss of upstream DAG dependency) must be strictly implemented in CQNS-001.
5. **Canon Boundary:** CQNS-001 canon is strictly defined as $A, B, C, D \in Circle(O, R) \implies \text{CyclicQuadrilateral}(ABCD)$. Interior and exterior point modifications are strictly classified as future extensions (`EXTENSION_SCENARIO`).
6. **Overall Assessment:** **COMPATIBLE WITH ADAPTATION**. The foundational kernel, coordinate solvers, SOL grammar, and research graph patterns are fully viable for cyclic quadrilateral specialization, provided the required invariant adaptations and DAG unifications are systematically applied.

---

## 2. Repository Structure

### Directory and Module Mapping `[OBSERVED]`
The codebase architecture is structured around clear functional layers:

* **Kernel Layer (`src/kernel/`):**
  * `canonicalPaths.ts`: Canonical trajectory definitions and invariant verification paths.
  * `consistencyEngine.ts`: Epistemic consistency check across active facts and derived assertions.
  * `factIdentity.ts`: Deterministic hashing and identification of geometric propositions (e.g., $FactID(A, B, C)$).
  * `navigator.ts`: Step-by-step state navigation and history rollback.
  * `types.ts`: Kernel entity interfaces (`Fact`, `FactStatus`, `DerivationStep`, `EpistemicState`).
* **Geometry Engine Layer (`src/engines/`):**
  * `geometryState.ts`: Mutable/immutable state management of geometric entities (points, lines, circles).
  * `constructionCore.ts`: Geometric construction primitives (circumcircle, perpendiculars, intersections, chords).
  * `invariants.ts`: Invariant mathematical testers (concyclicity, orthogonality, Thales theorem, collinearity).
  * `matrixEngine.ts` / `parametricAngleSolver.ts`: Trigonometric and affine algebraic matrix calculations.
  * `dependencyRecomputer.ts` / `geometryHistory.ts`: Forward recomputation of dependent entities upon point drag.
* **Research & Relational Graph Layer (`src/engines/research/`):**
  * `researchGraph.ts`: Epistemic graph representing propositions, hypotheses, verified observations, and edges.
  * `canonicalRules.ts` / `derivedRelations.ts`: Production rule catalog for deriving school/canonical relations.
  * `observationModel.ts` / `dynamicExperiment.ts`: Observation gathering over dynamic continuous variations.
  * `constructionTrace.ts`: Recorded chronological steps of constructed auxiliary elements.
* **Semantic & SOL Protocol Layer (`src/engines/semantic/`, `SOL-2`):**
  * `aamGateway.ts`: Agent-to-Architecture Messaging gateway.
  * `semanticCommandExecutor.ts`: Execution dispatcher parsing SOL commands into kernel operations.
  * `naturalLanguageAdapter.ts`: Mapping between structured ASTs and natural language reasoning tokens.
* **Educational & Presentation Layer (`src/presentation/`, `src/components/`):**
  * `CanvasStage.tsx`: Interactive SVG/HTML5 canvas for rendering points, circles, chords, and angles.
  * `RelationMap.tsx`, `TriangleStateTable.tsx`, `ArcChordTable.tsx`: UI inspection components for real-time state visualization.

---

## 3. GeometryState

### Current Implementation `[OBSERVED]`
* Located at `src/engines/geometryState.ts` and `src/types.ts`.
* Stores geometric primitives as typed dictionaries:
  * Points: `{ id: string; x: number; y: number; role?: PointRole; pinned?: boolean }`
  * Circles: `{ id: string; centerId: string; radius: number; elementIds: string[] }`
  * Lines / Segments: `{ id: string; p1: string; p2: string; type: 'line' | 'segment' | 'ray' }`
* State mutation occurs via explicit action dispatchers (`updatePoint`, `addPoint`, `addSegment`, `setCircumcircle`).

### CQNS-001 Invariant Analysis `[INFERRED]`
* In the existing stand, some state is split between `geometryState.ts` and UI state in `CanvasStage.tsx`.
* **Target Requirement:** In CQNS-001, `GeometryState` must be the **strictly unique single source of geometric truth**. All UI layers and Agent interfaces must be read-only consumers or dispatch actions strictly through the unified state manager.
* **Canon Target:** $Circle(O, R)$ with 4 cyclic vertices $A, B, C, D$ where $\forall P \in \{A,B,C,D\}: \|P - O\|_2 = R \pm \epsilon$.

---

## 4. Construction DAG

### Current Implementation `[OBSERVED]`
* Handled partially across `src/engines/geometryHistory.ts`, `src/engines/dependencyRecomputer.ts`, and `src/engines/research/constructionTrace.ts`.
* Dependent primitives (e.g. midpoint $M_{AB}$, intersection $P = L_1 \cap L_2$, perpendicular $H \perp AB$) retain parent identifiers in their metadata.

### Gaps & CQNS-001 Alignment `[INFERRED]`
* The existing DAG is implicit rather than an explicit First-Class Directed Acyclic Graph with deterministic topological sort validation.
* **Target Requirement:** In CQNS-001, every primitive must be registered as a node in a single **Construction DAG**.
* Construction operations (e.g., `ADD_DIAGONAL(AC)`, `CONSTRUCT_CIRCUMCIRCLE(A,B,C)`) must register explicit directed edges $parents \to child$.
* If an upstream parent node is removed or altered, the DAG must immediately trigger state recomputation and transition orphaned facts into `VANISHED`.

---

## 5. Geometry Core & Verification Layer

### Mathematical Authority `[OBSERVED]`
* `src/engines/constructionCore.ts` and `src/engines/invariants.ts` act as the deterministic numerical solver.
* Evaluates exact Euclidean relations:
  * Inscribed angle invariance: $\angle ABC = \frac{1}{2} \angle AOC$
  * Opposite angle summation for cyclic quadrilaterals: $\angle A + \angle C = \pi$, $\angle B + \angle D = \pi$
  * Ptolemy's Theorem metric: $|AC| \cdot |BD| = |AB| \cdot |CD| + |BC| \cdot |AD|$
  * Power of a Point / Chord intersections: $|AP| \cdot |PC| = |BP| \cdot |PD|$

### Encapsulation of Epsilon ($\epsilon$) `[OBSERVED]`
* Numeric tolerances are defined as constants (`EPSILON = 1e-6`, `ANGLE_EPSILON = 1e-4` radians).
* **Target Invariant:** The $\epsilon$ threshold must remain strictly sealed within `src/engines/invariants.ts` (Verification Layer). Downstream consumers, including the Relation Graph, SOL protocol, and Agent communication payloads, must receive strictly boolean or symbolic verification tokens (`VERIFIED`, `VIOLATED`, `DEGENERATE`), never raw float delta comparisons.

---

## 6. Relation Graph

### Current Structure `[OBSERVED]`
* Defined in `src/engines/research/researchGraph.ts` and `src/engines/research/researchGraphTypes.ts`.
* Maintains:
  * Nodes: `RelationNode` (Predicate type, entity arguments, status, provenance).
  * Edges: `DerivationEdge` (Input premise IDs $\to$ conclusion rule ID $\to$ output relation ID).
* Does not perform ad-hoc numerical Euclidean computation; rather, it stores relations verified by the core.

### Guarding Against Second Geometry Core Anti-Pattern `[OBSERVED]`
* The Relation Graph delegates all geometric verification to `consistencyEngine.ts` and `invariants.ts`.
* It preserves the strict boundary:
  $$\text{Mathematical Core} \xrightarrow{\text{Verified Observation}} \text{Relation Graph} \xrightarrow{\text{Context}} \text{Agent}$$
* It acts strictly as an epistemic ledger of dependencies, derivations, and historical provenance.

---

## 7. SOL (Structural Operational Language) & Agent Interface

### Existing Operational Bridge `[OBSERVED]`
* Defined in `SOL-2-sol-for-agents` and `src/engines/semantic/`.
* Key principles:
  1. SOL is a thin operational grammar: `COMMAND(target, parameters)`.
  2. Agent dispatches commands (`ADD_CHORD`, `MEASURE_ANGLE`, `PROPOSE_HYPOTHESIS`, `CHECK_INVARIANT`).
  3. Stand returns deterministic response payloads: `ACK`, `VERIFIED_OBSERVATION`, `REJECTED_DEGENERATE`.
* **Non-Authority of Agent:** Hypotheses proposed by an LLM or automated Agent are tagged strictly with `status: HYPOTHESIS`. They cannot transition to `status: VERIFIED` until the Stand's Geometry Core independently validates the assertion across the current state and dynamic perturbances.

---

## 8. Existing Inscribed Triangle Stand

### Reusable Modules vs Triangle-Specific Logic `[OBSERVED]`
* **Reusable Architectural Framework:**
  * Coordinate normalization pipeline on the unit circle $S^1$.
  * Parametric angle manipulation and angular ordering solvers (`src/engines/parametricAngleSolver.ts`).
  * Arc-chord mapping tables and angular bisector reflection algebra.
  * Invariant verification runner across continuous parameter sweeps (`src/engines/temporalObserver.ts`, `dynamicExperiment.ts`).
* **Triangle-Specific Artifacts (To be generalized for Quadrilaterals):**
  * Fixed 3-point tuples $(A, B, C)$ in `TriangleStateTable.tsx` and `thalesCardTemplate.ts`.
  * Simson line and Euler line presets specific to 3-point orthic configurations.

---

## 9. External Context & Fe3uni Provenance Layer

### Findings on Fe3uni Integration `[OBSERVED]`
* References to Fe3uni / Harmonic Analytics exist as historical conceptual roots in `docs/HISTORY_MAP.md` and `docs/PRIMITIVE_EXTRACTION_METHOD.md`.
* **Zero Dependency Invariant:** There are **no hard runtime imports or architectural dependencies** on Fe3uni packages in the operational engine code (`package.json`, `src/kernel/`, `src/engines/`).
* Fe3uni primitives remain solely contextual *provenance* and must **not** be integrated as runtime dependencies or complex tensor abstractions for CQNS-001.

---

## 10. Reusable Components for CQNS-001

The following components from the existing repository can be directly reused or specialized for CQNS-001:

| Component | Path | Reusability Classification | Function in CQNS-001 |
| :--- | :--- | :--- | :--- |
| `geometryState.ts` | `src/engines/geometryState.ts` | **Direct Reuse with Type Extension** | Core entity state storage |
| `invariants.ts` | `src/engines/invariants.ts` | **Specialization** | Concyclicity, Ptolemy, cyclic angle checks |
| `factIdentity.ts` | `src/kernel/factIdentity.ts` | **Direct Reuse** | Deterministic canonical fact hashing |
| `researchGraph.ts` | `src/engines/research/researchGraph.ts` | **Direct Reuse** | Epistemic ledger and derivation DAG |
| `temporalObserver.ts`| `src/engines/temporalObserver.ts` | **Direct Reuse** | Dynamic perturbation verification |
| `aamGateway.ts` | `src/engines/semantic/aamGateway.ts` | **Direct Reuse** | Agent SOL communication interface |
| `CanvasStage.tsx` | `src/components/CanvasStage.tsx` | **Adaptation** | 4-point cyclic quadrilateral rendering |

---

## 11. CQNS-001 Compatibility Matrix

| Architectural Invariant | Current Stand State | Target CQNS-001 State | Gap / Adaptation Required |
| :--- | :--- | :--- | :--- |
| **Single GeometryState** | `[OBSERVED]` Implemented in `geometryState.ts` | Strictly authoritative single state | Ensure zero parallel states in UI components |
| **Construction DAG** | `[INFERRED]` Implicit in history & dependencies | Explicit DAG with topological sorting | Standardize parent-child edge registration |
| **Deterministic Core** | `[OBSERVED]` Classical Euclidean solver | Pure deterministic mathematical core | Add canonical cyclic quadrilateral invariants |
| **Epsilon Isolation** | `[OBSERVED]` Sealed in `invariants.ts` | Encapsulated in Verification Layer | Maintain zero float leakage to SOL/Graph |
| **Relation Graph Boundary** | `[OBSERVED]` Storage & derivation only | Strict non-computational ledger | Prevent any solver calculations inside Graph |
| **Epistemic States** | `[OBSERVED]` Partial in `types.ts` | Full 6-state taxonomy + origin flag | Implement `INVALID` vs `VANISHED` distinction |
| **SOL Operational Bridge**| `[OBSERVED]` Implemented in `SOL-2` | Thin operational command gateway | Define CQNS-001 SOL command vocabulary |
| **4-Point Canon Boundary**| `[NOT FOUND]` (Prior stand was 3-point) | Strict $A,B,C,D \in Circle(O,R)$ | Enforce strict 4-point concyclic canon |

---

## 12. Architectural Conflicts

1. **Explicit vs Implicit Construction Registration:**  
   *Conflict:* In the older stand, adding segments or chords was sometimes performed directly in the canvas view without registering an explicit operation in the Construction DAG.  
   *Resolution for CQNS-001:* `ADD_DIAGONAL` and `ADD_CHORD` must be formal constructive operations that register dependencies in the DAG before generating any visual or epistemic entities.
2. **Epistemic Distinction between `INVALID` and `VANISHED`:**  
   *Conflict:* The older codebase occasionally treated failed verification and missing upstream entities uniformly as invalid.  
   *Resolution for CQNS-001:* Distinctly separate `INVALID` (the geometric predicate fails numerical verification for active entities) from `VANISHED` (an upstream prerequisite point or circle was deleted/moved, invalidating the derivation chain).

---

## 13. Missing Components (To Be Designed in Subsequent Phases)

1. `CyclicQuadrilateralCore`: Specialized geometric engine for cyclic quad properties (Brahmagupta formula, Ptolemy equality, orthodiagonal properties, diagonal intersection angles).
2. `CQNS Canonical Rule Table`: Epistemic derivation rules mapping from 4 concyclic points to cyclic quadrilateral theorems.
3. `Ptolemy Invariant Validator`: Verification module specifically checking metric product equalities under dynamic vertex dragging.
4. `SOL Quadrilateral Vocabulary`: Formal SOL command set (`ADD_DIAGONAL(AC)`, `VERIFY_CYCLIC_ORDER(A,B,C,D)`, `CHECK_PTOLEMY`).

---

## 14. Identified Risks

1. **Risk of Over-Abstraction:** Introducing generic n-gon tensor abstractions prematurely before solidifying the 4-point cyclic quadrilateral canon.  
   *Mitigation:* Keep the canon strictly restricted to 4 concyclic points ($A,B,C,D \in Circle(O,R)$).
2. **Risk of Computational Graph Leakage:** Attempting to perform geometric calculations inside the Relation Graph rather than delegating to the Geometry Core.  
   *Mitigation:* Retain Relation Graph as a strict epistemic ledger of facts and derivation links.
3. **Floating Point Degeneracy:** Vertex coincidence ($A \to B$) during dynamic interactive exploration leading to division-by-zero in angle calculation.  
   *Mitigation:* Guard invariants with explicit collinearity/coincidence precondition checks in the Verification Layer.

---

## 15. Open Questions for External Audit

1. Should cyclic vertex ordering $(A, B, C, D)$ along the circumcircle perimeter be strictly enforced orientation-wise (e.g. counter-clockwise) in the Canon, or should self-intersecting / crossed quadrilaterals (e.g. $ABDC$) be rejected by the validation layer as non-canonical?
2. Should diagonal intersection point $P = AC \cap BD$ be auto-registered into the Construction DAG upon `ADD_DIAGONAL(AC)` + `ADD_DIAGONAL(BD)`, or must it require an explicit constructive command `INTERSECT(AC, BD)`?

---

## 16. Recommended Next Step

Upon completion and review of this Baseline Audit:
1. Conduct external human architectural review.
2. Freeze the baseline audit findings.
3. Formulate **PROMPT_01: Canonical Mathematical Model for Cyclic Quadrilateral (CQNS-001)** detailing the formal mathematical contracts, state structures, and epistemic transitions before initiating production code writing.

---

## 17. Final Compatibility Verdict

$$\mathbf{COMPATIBLE\ WITH\ ADAPTATION}$$

**Justification:** The existing Geometry Reasoning Stand architecture (`geometry-reasoning-stand-2`, `SOL-2`, `kernel/`, `researchGraph/`) provides solid, battle-tested foundations for deterministic geometric reasoning, epistemic state management, and agent-stand operational separation. Specialization to CQNS-001 requires targeted adaptations (4-point concyclic canon, explicit DAG construction, epsilon sealing, and Ptolemy invariants) without requiring any fundamental paradigm rewrites.

---

### Explicit Stop Condition Checklist
- [x] Baseline audit completed across all required architectural dimensions.
- [x] Strict observation classification applied (`[OBSERVED]`, `[INFERRED]`, `[HYPOTHESIS]`, `[NOT FOUND]`).
- [x] No production code or CQNS implementation written.
- [x] Fe3uni treated strictly as provenance, zero hard dependencies introduced.
- [x] Execution paused to await external human audit review.
