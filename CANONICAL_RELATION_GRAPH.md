# CQNS-001 — CANONICAL RELATION GRAPH SPECIFICATION

**Document Version:** 1.0.0-PROMPT02-DRAFT  
**Status:** SPECIFICATION COMPLETE — AWAITING EXTERNAL HUMAN AUDIT  
**Phase:** Phase 2 (Canonical Relation Graph)  
**System Target:** CQNS-001 (Cyclic Quadrilateral Normalization Stand)  
**Core Invariants:**
* *"GeometryState remains the Single Source of Truth"*
* *"Geometry Core remains the Mathematical Authority"*
* *"Relation Graph is PASSIVE (Relation Graph ≠ second Geometry Core)"*
* *"Agent may be wrong. The Stand must not."*

---

## 1. Purpose

The **Canonical Relation Graph** is the central epistemic and relational ledger for **CQNS-001** (*Cyclic Quadrilateral Normalization Stand*). Its purpose is to store, index, and organize geometric relations, assertions, hypotheses, derivation traces, dependency links, and historical provenance within the canonical cyclic quadrilateral domain.

The Relation Graph is strictly **PASSIVE**:
* It **records** mathematical facts confirmed by the Geometry Core.
* It **tracks** dependencies between geometric entities and propositions.
* It **maintains** the epistemic status (`GIVEN`, `HYPOTHESIS`, `VERIFIED`, `DERIVED`, `INVALID`, `VANISHED`) and provenance (`CANONICAL`, `EXTENSION_SCENARIO`).
* It **does NOT compute**, prove, evaluate, or alter geometric truths on its own authority.

---

## 2. Graph Boundaries & Architectural Invariants

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              GEOMETRY STATE                                 │
│  - Single Source of Truth for geometric entities (O, R, A, B, C, D...)      │
│  - Owns numeric coordinates and topological primitive registrations         │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ (Entity IDs / References)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CANONICAL RELATION GRAPH                           │
│  - Passive relational and epistemic ledger                                  │
│  - Stores relation nodes, dependency edges, derivation links, provenance    │
│  - NO numerical calculations | NO theorem proving | NO epsilon tolerances   │
└───────────────▲─────────────────────────────────────────────▲───────────────┘
                │ (Verified Facts / Observations)             │ (Hypotheses / Commands)
┌───────────────┴─────────────────────────────┐ ┌─────────────┴───────────────┐
│        GEOMETRY CORE / VERIFICATION         │ │         AGENT / SOL         │
│  - Sole mathematical computing authority    │ │  - Proposes hypotheses      │
│  - Executes Euclidean checks & tolerances   │ │  - Requests constructions   │
│  - Encapsulates EPSILON (ε)                 │ │  - Zero truth authority     │
└─────────────────────────────────────────────┘ └─────────────────────────────┘
```

### Boundary Constraints:
1. **No Geometry Duplication:** The graph stores entity identifiers (e.g. `'pt_A'`, `'circle_main'`) referencing the unified `GeometryState`. It never maintains internal local coordinate replicas or private geometric universes.
2. **No Computational Logic:** If a relation predicate requires verification (e.g. concyclicity, angle summation, or Ptolemy metric equality), the graph delegates verification exclusively to the `Geometry Core`.
3. **No Automatic Theorem Proving:** Inserting four concyclic points into the graph does **not** trigger automatic graph-level generation of quadrilaterals, diagonals, or angle equality theorems. Every proposition requires explicit constructive registration or core verification.

---

## 3. Node & Entity Types

The graph consists of two primary node types: **Entity References** and **Relation Nodes**.

### 3.1 Entity Reference Nodes (`EntityRef`) `[DESIGNED]`
Lightweight graph representations pointing to entities in `GeometryState`:
* `point_ref`: References a `Point` ($O, A, B, C, D$).
* `circle_ref`: References a `Circle` ($\mathcal{C}$).
* `segment_ref`: References a `Segment` (Sides $AB, BC, CD, DA$ or Diagonals $AC, BD$).
* `angle_ref`: References an `Angle` ($\angle ABC, \angle ADC \dots$).
* `quadrilateral_ref`: References a `Quadrilateral` or verified `CyclicQuadrilateral`.

### 3.2 Relation Nodes (`RelationNode`) `[DESIGNED]`
Records describing a geometric proposition, observation, or hypothesis:
* `id`: Deterministic hash/identifier (e.g. `rel_concyclic_ABCD`, `rel_inscribed_angle_ABC`).
* `relationType`: Formal relation classifier (see Section 4).
* `subjectId`: Primary entity reference ID.
* `argumentIds`: Ordered list of entity reference IDs participating in the relation.
* `epistemicStatus`: `GIVEN` | `HYPOTHESIS` | `VERIFIED` | `DERIVED` | `INVALID` | `VANISHED`.
* `origin`: `CANONICAL` | `EXTENSION_SCENARIO`.
* `prerequisiteRelationIds`: Array of prerequisite `RelationNode.id`s required for semantic validity.
* `dependencyEntityIds`: Array of `EntityRef.id`s whose modification/deletion affects this relation.
* `derivation`: Optional formal derivation trace (see Section 10).

---

## 4. Relation Taxonomy

Relations are strictly classified into three fundamental geometric categories:

```
                                 Relation Types
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        ▼                              ▼                              ▼
┌────────────────┐             ┌────────────────┐             ┌────────────────┐
│   Structural   │             │    Angular /   │             │     Metric     │
│   Relations    │             │   Incidence    │             │   Relations    │
├────────────────┤             ├────────────────┤             ├────────────────┤
│ point_on_circle│             │ inscribed_angle│             │ segment_length │
│ chord_of       │             │ opposite_angles│             │ angle_measure  │
│ diameter_of    │             │ supplementary_ │             │ ptolemy_metric │
│ diagonal_of    │             │ angles         │             │ _equality      │
│ cyclic_quad    │             │ equal_inscribed│             │                │
│                │             │ _angles        │             │                │
└────────────────┘             └────────────────┘             └────────────────┘
```

### 4.1 Structural Relations `[DESIGNED]`

| Relation | Subject | Arguments | Semantic Meaning | Responsible Authority |
| :--- | :--- | :--- | :--- | :--- |
| `point_on_circle` | `Point(P)` | `Circle(C)` | Point $P$ lies on circumference of circle $\mathcal{C}$ | `Geometry Core` (Verified via distance equality $\|P-O\| = R$) |
| `chord_of` | `Segment(S)` | `Circle(C)` | Segment $S=(P_1, P_2)$ connects two points on $\mathcal{C}$ | `Geometry Core` (Requires `point_on_circle` for $P_1, P_2$) |
| `diameter_of` | `Segment(S)` | `Circle(C)` | Chord $S$ passes through center $O$ of $\mathcal{C}$ | `Geometry Core` (Requires collinearity of $P_1, O, P_2$) |
| `diagonal_of` | `Segment(S)` | `Quadrilateral(Q)` | Segment $S$ connects non-adjacent vertices of $Q$ | `Construction / DAG` (Explicit constructive registration) |
| `cyclic_quadrilateral` | `Quad(Q)` | `Circle(C)` | Vertices of $Q$ are mutually concyclic on $\mathcal{C}$ | `Geometry Core` (Verified across all 4 vertices) |

### 4.2 Angular & Incidence Relations `[DESIGNED]`

| Relation | Subject | Arguments | Semantic Meaning | Responsible Authority |
| :--- | :--- | :--- | :--- | :--- |
| `inscribed_angle` | `Angle(P1,V,P2)` | `Circle(C)` | Vertex $V \in \mathcal{C}$ and rays $VP_1, VP_2$ form chords | `Geometry Core` |
| `opposite_angles` | `Angle(A)` | `Angle(C)`, `Quad(Q)` | Angles $\angle A$ and $\angle C$ are opposite vertices in $Q$ | `Structural Projection` (Topological order in $Q$) |
| `supplementary_angles` | `Angle(A)` | `Angle(C)` | Measures sum to $\pi$ radians ($180^\circ$) | `Geometry Core` / `Derived Rule` |
| `same_arc_subtended` | `Angle(1)` | `Angle(2)`, `Arc` | Inscribed angles intercept the exact same arc of $\mathcal{C}$ | `Geometry Core` / `Structural Rule` |
| `equal_inscribed_angles` | `Angle(1)` | `Angle(2)` | Inscribed angles intercepting equal arcs have equal measure | `Derived Rule` (from `same_arc_subtended`) |

### 4.3 Metric Relations `[DESIGNED]`

| Relation | Subject | Arguments | Semantic Meaning | Responsible Authority |
| :--- | :--- | :--- | :--- | :--- |
| `segment_length` | `Segment(S)` | Scalar value | Measured Euclidean distance $\|P_1 - P_2\|_2$ | `Geometry Core` |
| `angle_measure` | `Angle(P1,V,P2)`| Scalar value (rad/deg) | Measured angle between rays | `Geometry Core` |
| `ptolemy_metric_equality` | `Quad(Q)` | Diags $(AC, BD)$, Sides $(AB, BC, CD, DA)$ | Invariant: $\|AC\|\cdot\|BD\| = \|AB\|\cdot\|CD\| + \|BC\|\cdot\|AD\|$ | `Geometry Core` (Metric verification over state) |

---

## 5. Critical Domain Distinctions

To avoid semantic conflation, the relation graph strictly enforces the following distinctions:

1. **`point_on_circle` $\neq$ `cyclic_quadrilateral`:**  
   Four individual `point_on_circle` relations establish point incidence only. A `cyclic_quadrilateral` relation requires an ordered polygon topology, non-degeneracy validation, and concyclicity verification of the composite quadrilateral object.
2. **`diagonal_of` $\neq$ `intersection_of_diagonals`:**  
   Registering `diagonal_of(AC, Q)` records the existence of a segment connecting vertices $A$ and $C$. It does **not** imply that $AC$ intersects $BD$, nor does it automatically instantiate an intersection point.
3. **`diameter_of` $\neq$ `chord_of`:**  
   A diameter is a specialized chord with the collinearity prerequisite $(P_1, O, P_2)$. A general chord has no center-incidence property.
4. **`center_position` $\neq$ `diameter_chord`:**  
   The relative topological position of center $O$ with respect to quadrilateral $Q$ (interior, boundary, exterior) is distinct from whether a specific side/diagonal is a diameter chord.

---

## 6. Dependency & Invalidation Model

The Relation Graph maintains directed dependency edges to guarantee deterministic status updates upon geometry modifications.

```
       [Point / Circle Entity in State]
                     │
                     ▼ (Direct Entity Dependency)
       [Atomic Relation: point_on_circle]
                     │
                     ▼ (Prerequisite Edge)
       [Composite Relation: cyclic_quadrilateral]
                     │
                     ▼ (Derivation Edge)
       [Derived Relation: supplementary_opposite_angles]
```

### Dependency Invalidation Rules `[DESIGNED]`:
1. **Entity Deletion:** If an entity $E$ in `GeometryState` is deleted, all `RelationNode`s where $E \in \text{dependencyEntityIds}$ immediately transition to `VANISHED`.
2. **Entity Coordinate Mutation (Point Drag):** When coordinates of a point $P$ change:
   * All associated relations are marked as requiring re-verification.
   * `Geometry Core` re-evaluates the mathematical condition.
   * If condition holds $\implies$ retains `VERIFIED` / `DERIVED`.
   * If condition fails $\implies$ transitions to `INVALID`.

---

## 7. Epistemic Metadata & Status Lifecycle

The epistemic status of any relation node in the graph is strictly restricted to the canonical 6-state taxonomy:

```
                            ┌────────────────┐
                            │     GIVEN      │
                            └───────┬────────┘
                                    │
                  ┌─────────────────┴─────────────────┐
                  ▼                                   ▼
          ┌───────────────┐                   ┌───────────────┐
          │  HYPOTHESIS   │                   │   VERIFIED    │
          └───────┬───────┘                   └───────┬───────┘
                  │ (Fails Check)                     │ (Valid Derivation)
                  ▼                                   ▼
          ┌───────────────┐                   ┌───────────────┐
          │    INVALID    │                   │    DERIVED    │
          └───────────────┘                   └───────┬───────┘
                                                      │ (Upstream Lost)
                                                      ▼
                                              ┌───────────────┐
                                              │   VANISHED    │
                                              └───────────────┘
```

### 7.1 Epistemic Status Definitions `[DESIGNED]`
* **`GIVEN`**: Axiomatically asserted input facts (e.g. $Circle(O, R)$, initial vertex concyclicity).
* **`HYPOTHESIS`**: Speculative assertion submitted by Agent or user. Carries zero truth value.
* **`VERIFIED`**: Fact independently evaluated and confirmed true by `Geometry Core` in the current geometric state.
* **`DERIVED`**: Fact produced by applying an authorized inference rule to verified prerequisite relations.
* **`INVALID`**: Fact whose mathematical condition is false in the active state coordinates.
* **`VANISHED`**: Previously verified or derived fact that lost one or more required upstream dependencies.

### 7.2 Semantic Disambiguation: `INVALID` vs `VANISHED` `[DESIGNED]`
* **`INVALID` $\implies$ State Contradiction:** Prerequisite entities exist, but the predicate evaluates to `false` (e.g. $\angle A + \angle C = 150^\circ \neq 180^\circ$).
* **`VANISHED` $\implies$ Missing Prerequisites:** The predicate cannot be evaluated because an essential geometric entity was removed from the state.

### 7.3 Diagnostic Handling (No `CONFLICT` Status) `[DESIGNED]`
* There is **no** epistemic status named `CONFLICT`.
* If a hypothesis contradicts a verified fact, the hypothesis receives status `INVALID`, and the graph records a diagnostic log referencing the contradictory verified relation ID.

---

## 8. Provenance Model

Every relation node possesses an immutable `origin` property:

* **`origin: CANONICAL`**: Refers to facts, entities, and relations strictly belonging to the canonical 4-point concyclic configuration ($A, B, C, D \in Circle(O,R)$).
* **`origin: EXTENSION_SCENARIO`**: Reserved for future experimental scenarios (e.g. interior/exterior points, multiple circles, dynamic topological transitions). Extension nodes are isolated from canonical evaluation.

---

## 9. Formal Derivation Chains (`DERIVED` Relations)

A `DERIVED` relation represents a structured deduction step with verifiable provenance.

### Derivation Structure Schema `[DESIGNED]`:
```typescript
interface DerivationTrace {
  ruleId: string;                     // e.g. "RULE_INSCRIBED_QUAD_OPPOSITE_ANGLES"
  ruleName: string;                   // Human-readable rule description
  premiseRelationIds: string[];       // Must all have status: VERIFIED | DERIVED | GIVEN
  authorizedBy: "GEOMETRY_CORE" | "FORMAL_RULE_CATALOG";
  timestamp: number;
}
```

### Invariant:
* The Relation Graph **stores** the `DerivationTrace`.
* The derivation rule is evaluated by the external **Rule / Verification Layer**, not by internal graph logic.

---

## 10. Research Graph Compatibility Analysis (RISK-01 Assessment)

In Phase 0, **`RISK-01 — Research Graph authority`** was flagged regarding the existing `src/engines/research/researchGraph.ts`.

### Audit Findings on Existing `researchGraph.ts` `[OBSERVED / INFERRED]`:
1. **Passive Storage Structure:** The existing implementation stores nodes (`RelationNode`) and edges (`DerivationEdge`), functioning primarily as an adjacency ledger.
2. **Heuristic Risk Areas:** Certain helper methods in the older research module attempted to run pattern-matching loops that inferred relations directly upon state snapshot ingestion.
3. **Verdict:** **`COMPATIBLE WITH ADAPTATION`**.
   * *Required Adaptation:* Strip any implicit inference routines from `researchGraph.ts`.
   * Ensure that every node creation or status mutation is triggered strictly by an external caller (`Geometry Core`, `SemanticCommandExecutor`, or `ConsistencyEngine`).

---

## 11. Open Questions (Analysis & Scope Containment)

### 11.1 `[OPEN QUESTION-01]` Vertex Ordering and Convexity Criterion `[OPEN QUESTION]`
* **Status:** **UNRESOLVED (Carried to Phase 3 — Verification Contracts)**.
* **Impact on Relation Graph:**
  * Angular relations such as `opposite_angles(A, C, Q)` rely on the ordered sequence of vertices in $Q = [A, B, C, D]$.
  * If vertices are self-intersecting (e.g. crossed quadrilateral $ABDC$), $\angle A$ and $\angle C$ may not be opposite interior angles.
  * *Graph Contract:* The Relation Graph stores vertex order as declared in `quadrilateral_ref`. The formal mathematical determination of whether a given ordering is convex or crossed belongs to the `Verification Layer` (Phase 3).

### 11.2 `[OPEN QUESTION-02]` Diagonal Intersection Registration `[OPEN QUESTION]`
* **Status:** **UNRESOLVED (Carried to Phase 3 / Construction Contracts)**.
* **Impact on Relation Graph:**
  * Constructing diagonals $AC$ and $BD$ registers two `diagonal_of` relation nodes.
  * The graph **does not automatically infer** an intersection node $P = AC \cap BD$.
  * An intersection relation `intersects(AC, BD, Point(P))` will be added to the graph only when explicitly generated via an authorized construction or verification step.

### 11.3 `[OPEN QUESTION-03]` Ptolemy's Theorem Epistemic Role `[OPEN QUESTION]`
* **Status:** **RESOLVED AS DERIVED METRIC INVARIANT** (Criterion semantics carried to Phase 3).
* **Impact on Relation Graph:**
  * `ptolemy_metric_equality` is modeled strictly as a **derived metric property** of a confirmed `CyclicQuadrilateral`.
  * The graph does not use Ptolemy's formula as the definition of concyclicity.
  * If used as a converse verification path, the verification contract must handle it in Phase 3.

---

## 12. Canonical Example (Step-by-Step Derivation Chain)

The canonical derivation chain from input primitives to cyclic quadrilateral relations is represented as follows:

```
[Step 1: Axiomatic Given]
Entity: Circle(O, R), Points: A, B, C, D
├── Rel 1: point_on_circle(A, Circle)  [GIVEN, CANONICAL]
├── Rel 2: point_on_circle(B, Circle)  [GIVEN, CANONICAL]
├── Rel 3: point_on_circle(C, Circle)  [GIVEN, CANONICAL]
└── Rel 4: point_on_circle(D, Circle)  [GIVEN, CANONICAL]
            │
            ▼
[Step 2: Constructive Registration]
Entity: Quadrilateral(ABCD, sides=[AB, BC, CD, DA])
├── Rel 5: chord_of(AB, Circle)        [VERIFIED, CANONICAL] (via Geometry Core)
├── Rel 6: chord_of(BC, Circle)        [VERIFIED, CANONICAL] (via Geometry Core)
├── Rel 7: chord_of(CD, Circle)        [VERIFIED, CANONICAL] (via Geometry Core)
└── Rel 8: chord_of(DA, Circle)        [VERIFIED, CANONICAL] (via Geometry Core)
            │
            ▼
[Step 3: Concyclicity Verification]
Entity: CyclicQuadrilateral(ABCD)
└── Rel 9: cyclic_quadrilateral(ABCD, Circle) [VERIFIED, CANONICAL]
    ├── Responsible Authority: Geometry Core
    └── Premises: [Rel 1, Rel 2, Rel 3, Rel 4]
            │
            ▼
[Step 4: Formal Angle Derivation]
Entity: Angles: ∠DAB (∠A), ∠BCD (∠C)
├── Rel 10: opposite_angles(∠A, ∠C, Quad ABCD) [VERIFIED, CANONICAL]
└── Rel 11: supplementary_angles(∠A, ∠C)      [DERIVED, CANONICAL]
    ├── Premise: [Rel 9, Rel 10]
    ├── Rule: "RULE_INSCRIBED_QUAD_OPPOSITE_ANGLES"
    └── Derivation Authority: Geometry Core / Catalog
```

---

## 13. Explicit Non-Responsibilities of the Relation Graph

To maintain architectural integrity, the Relation Graph shall **NEVER**:
1. **Compute Euclidean Coordinates:** No distance, angle, dot product, or determinant calculations.
2. **Hold Epsilon ($\epsilon$) Values:** No numerical thresholds or floating-point comparison margins.
3. **Execute Independent Inference:** No autonomous background theorem provers creating facts without Core verification.
4. **Mutate GeometryState:** The graph is read-only with respect to geometry coordinates and primitives.
5. **Grant Mathematical Authority to Agents:** Hypotheses proposed by external agents remain `status: HYPOTHESIS` until validated by `Geometry Core`.

---

## 14. Self-Check & Invariant Verification

- [x] **GeometryState remains the strictly singular Source of Truth.**
- [x] **Geometry Core confirmed as sole mathematical computing authority.**
- [x] **Relation Graph confirmed as passive ledger (zero computational authority).**
- [x] **Canon remains strictly 4 concyclic points on 1 circle.**
- [x] **Distinct separations maintained:** `point_on_circle` vs `cyclic_quadrilateral`, `diagonal_of` vs `intersects`, `diameter_of` vs `chord_of`.
- [x] **Diagonals are not treated as automatic constructions.**
- [x] **Epsilon ($\epsilon$) strictly excluded from graph semantics.**
- [x] **Epistemic taxonomy strictly adheres to 6 canonical states (no `CONFLICT` status).**
- [x] **`INVALID` and `VANISHED` clearly separated.**
- [x] **RISK-01 (Research Graph authority) explicitly analyzed.**
- [x] **Open questions documented without premature invention.**
- [x] **Zero production code written.**
