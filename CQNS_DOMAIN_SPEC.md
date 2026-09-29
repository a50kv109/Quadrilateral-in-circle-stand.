# CQNS-001 — CANONICAL DOMAIN MODEL & MATHEMATICAL SPECIFICATION

**Document Version:** 1.0.0-PROMPT01-DRAFT  
**Status:** SPECIFICATION COMPLETE — AWAITING EXTERNAL HUMAN AUDIT  
**Phase:** Phase 1 (Canonical Domain Model & Mathematical Objects)  
**System Target:** CQNS-001 (Cyclic Quadrilateral Normalization Stand)  
**Methodological Doctrine:** *"Agent may be wrong. The Stand must not."* | *"Provenance ≠ Dependency"* | *"Relation Graph ≠ second Geometry Core"*

---

## 1. Scope

### 1.1 Objective `[DESIGNED]`
The objective of this specification is to define the formal static mathematical domain model, structural entities, relations, preconditions, and epistemic boundaries for **CQNS-001** (*Cyclic Quadrilateral Normalization Stand*).

This document establishes:
* **WHAT** mathematical objects and relations exist in the system state.
* **WHAT** preconditions and structural invariants govern non-degeneracy.
* **HOW** geometric entities relate without delegating mathematical authority away from the Geometry Core.

### 1.2 Operational Boundaries `[DESIGNED]`
* **Pure Static Domain Model:** Describes entities in memory and their structural references. Contains **zero inference algorithms, zero theorem proving logic, and zero auto-verification methods**.
* **Strict Canon Isolation:** Restricted exclusively to 4 concyclic points on a single circumcircle.
* **No Numerical Tolerances in Semantics:** The parameter $\epsilon$ is strictly excluded from domain representations and encapsulated solely within the downstream Verification Layer.

---

## 2. Canonical Configuration

The canonical universe of discourse for CQNS-001 is rigorously defined as:

$$\mathcal{U}_{\text{Canon}} = \left\{ (O, R, A, B, C, D) \;\middle|\; O \in \mathbb{R}^2, \; R \in \mathbb{R}_{>0}, \; A, B, C, D \in \text{Circle}(O, R) \right\}$$

### 2.1 Canonical State Axioms `[DESIGNED]`
1. **Circumcircle Axiom:** There exists exactly one canonical reference circle $\mathcal{C} = \text{Circle}(O, R)$.
2. **Vertex Concyclicity Axiom:** All four primary vertices $\{A, B, C, D\}$ are incident to $\mathcal{C}$:
   $$\|A - O\|_2 = R, \quad \|B - O\|_2 = R, \quad \|C - O\|_2 = R, \quad \|D - O\|_2 = R$$
3. **Four-Point Planarity:** All entities reside in the Euclidean plane $\mathbb{E}^2$.

---

## 3. Entities (Domain Object Taxonomy)

All entities represent immutable or authoritative references within the unified `GeometryState`.

```
                        ┌──────────────┐
                        │    Point     │ (O, A, B, C, D, ...)
                        └──────┬───────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
       ┌──────────────┐                ┌──────────────┐
       │    Circle    │                │   Segment    │ (Base Chords,
       │ (Center, R)  │                │   (P1, P2)   │  Diagonals)
       └──────┬───────┘                └──────┬───────┘
              │                               │
              │         ┌───────────┐         │
              └────────►│   Angle   │◄────────┘
                        │ (P1,V,P2) │
                        └─────┬─────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
     ┌─────────────────┐             ┌─────────────────┐
     │  Quadrilateral  │             │ Auxiliary Views │ (Triangles
     │   (A, B, C, D)  │             │ (△ABC, △BCD...) │  over State)
     └────────┬────────┘             └─────────────────┘
              │
              ▼ (Subject to Verification Layer)
     ┌──────────────────────┐
     │ CyclicQuadrilateral  │
     │     (Canon Root)     │
     └──────────────────────┘
```

### 3.1 `Point` `[DESIGNED]`
* **Definition:** A 0-dimensional geometric primitive in $\mathbb{R}^2$.
* **Fields:**
  * `id`: Unique string identifier (e.g. `'O'`, `'A'`, `'B'`, `'C'`, `'D'`).
  * `coordinates`: Cartesian coordinate tuple $(x, y) \in \mathbb{R}^2$.
  * `role`: Semantic role tag (`'center'` | `'vertex'` | `'intersection'` | `'auxiliary'`).
* **Invariants:** Real finite coordinates ($\neg\text{NaN}$, $\neg\infty$).

### 3.2 `Circle` `[DESIGNED]`
* **Definition:** The 1-dimensional locus of points in $\mathbb{E}^2$ equidistant from center point $O$ by radius $R$.
* **Fields:**
  * `id`: Unique string identifier (e.g. `'circle_main'`).
  * `centerPointId`: Reference to `Point.id` of center $O$.
  * `radius`: Positive real scalar $R \in \mathbb{R}_{>0}$.
* **Invariants:** $R > 0$. Center point $O$ must exist in `GeometryState`.

### 3.3 `Segment` / `Chord` `[DESIGNED]`
* **Definition:** An undirected 1-dimensional line segment bounded by two distinct endpoints $P_1, P_2$.
* **Fields:**
  * `id`: Unique string identifier (e.g. `'seg_AB'`, `'diag_AC'`).
  * `p1Id`: Reference to `Point.id` of first endpoint.
  * `p2Id`: Reference to `Point.id` of second endpoint.
  * `segmentType`: Structural classification (`'side'` | `'diagonal'` | `'chord'` | `'secant_segment'`).
* **Invariants:** Endpoints must be strictly distinct: $p_1 \neq p_2$.

### 3.4 `Angle` `[DESIGNED]`
* **Definition:** The geometric configuration formed by two rays sharing a common vertex $V$, ordered as ray $(V \to P_1)$ and ray $(V \to P_2)$.
* **Fields:**
  * `id`: Unique identifier (e.g. `'angle_ABC'`).
  * `vertexId`: Reference to apex point $V$.
  * `ray1PointId`: Reference to first ray terminal point $P_1$.
  * `ray2PointId`: Reference to second ray terminal point $P_2$.
* **Invariants:** $P_1 \neq V$ and $P_2 \neq V$.

### 3.5 `Quadrilateral` (General) `[DESIGNED]`
* **Definition:** An ordered 4-tuple of vertices $(A, B, C, D)$ defining boundary segments $(AB, BC, CD, DA)$.
* **Fields:**
  * `id`: Unique identifier (e.g. `'quad_ABCD'`).
  * `vertexIds`: Ordered 4-tuple of point references `[A, B, C, D]`.
  * `boundarySegmentIds`: Array of 4 segment references `[seg_AB, seg_BC, seg_CD, seg_DA]`.
* **Invariants:** All 4 vertex IDs must be pairwise distinct.

### 3.6 `CyclicQuadrilateral` (Canonical Specialized Entity) `[DESIGNED]`
* **Definition:** A specialized quadrilateral whose four vertices are proven by the Verification Layer to be concyclic on a common circle $\mathcal{C} = \text{Circle}(O, R)$.
* **Fields:**
  * `id`: Unique identifier (e.g. `'cyclic_quad_ABCD'`).
  * `quadrilateralId`: Reference to parent `Quadrilateral.id`.
  * `circumcircleId`: Reference to `Circle.id` ($\mathcal{C}$).
  * `vertexIds`: `[A, B, C, D]`.
  * `epistemicStatus`: Epistemic status token (e.g. `VERIFIED` or `GIVEN`).
* **Crucial Invariant:** An entity of type `CyclicQuadrilateral` **cannot** be instantiated directly by the user or an LLM Agent asserting truth; it is instantiated or validated solely when the Geometry Core confirms concyclicity.

### 3.7 `Auxiliary Views` (Logical Projections) `[DESIGNED]`
* **Definition:** Logical views (e.g. inscribed sub-triangles $\triangle ABC, \triangle BCD, \triangle CDA, \triangle DAB$) constructed over existing entities.
* **Invariant:** Auxiliary views are **read-only logical projections** over the single unified `GeometryState`. They **never** instantiate secondary or isolated geometry states.

---

## 4. Relations (Structural and Relational Taxonomy)

Relations are typed relational records stored in the epistemic ledger (Relation Graph) representing verified observations or hypothesis claims.

| Relation Type | Arguments | Semantic Meaning | Prerequisite Entities |
| :--- | :--- | :--- | :--- |
| `point_on_circle` | $(P, \mathcal{C})$ | Point $P$ lies on circle $\mathcal{C}$ | `Point(P)`, `Circle(C)` |
| `chord_of` | $(S, \mathcal{C})$ | Segment $S = (P_1, P_2)$ is a chord of circle $\mathcal{C}$ | `Segment(S)`, `point_on_circle(P1, C)`, `point_on_circle(P2, C)` |
| `diameter_of` | $(S, \mathcal{C})$ | Chord $S$ passes through center $O$ of $\mathcal{C}$ ($P_1, O, P_2$ collinear) | `chord_of(S, C)`, `Point(O = C.center)` |
| `diagonal_of` | $(S, Q)$ | Segment $S = (A, C)$ or $(B, D)$ connects non-adjacent vertices of quad $Q$ | `Segment(S)`, `Quadrilateral(Q)` |
| `inscribed_angle` | $(\angle P_1 V P_2, \mathcal{C})$ | Angle with vertex $V \in \mathcal{C}$ subtended by chords $V P_1$ and $V P_2$ | `Angle(P1, V, P2)`, $V, P_1, P_2 \in \mathcal{C}$ |
| `opposite_angles` | $(\angle A, \angle C, Q)$ | Pair of opposite interior angles of quad $Q$ | `Quadrilateral(Q)`, `Angle(A)`, `Angle(C)` |
| `supplementary_angles`| $(\angle_1, \angle_2)$ | Angles whose measures sum to $\pi$ radians ($180^\circ$) | `Angle(1)`, `Angle(2)` |
| `same_arc_subtended` | $(\angle_1, \angle_2, \text{arc})$ | Two inscribed angles intercepting the exact same circular arc | `inscribed_angle(1)`, `inscribed_angle(2)` |
| `equal_inscribed_angles`| $(\angle_1, \angle_2)$ | Inscribed angles intercepting congruent arcs have equal measure | `same_arc_subtended(1, 2, arc)` |
| `ptolemy_metric_equality`| $(Q, \text{chords}, \text{diags})$ | Metric invariant: $\|AC\|\cdot\|BD\| = \|AB\|\cdot\|CD\| + \|BC\|\cdot\|AD\|$ | `CyclicQuadrilateral(Q)`, Registered Diagonals $AC, BD$ |

---

## 5. Preconditions & Non-Degeneracy Invariants

To prevent mathematical and numerical singularities, the canonical model defines strict non-degeneracy preconditions:

### 5.1 Vertex Distinctness (Pairwise Non-Coincidence) `[DESIGNED]`
$$\forall i, j \in \{A, B, C, D\}, \; i \neq j \implies \|P_i - P_j\|_2 > 0$$

### 5.2 Non-Collinearity of Any Three Vertices `[DESIGNED]`
No three vertices may be collinear:
$$\forall (P_i, P_j, P_k) \subset \{A, B, C, D\}: \quad \text{Area}(\triangle P_i P_j P_k) = \frac{1}{2}\left| x_i(y_j - y_k) + x_j(y_k - y_i) + x_k(y_i - y_j) \right| > 0$$
*(Note: on a non-degenerate circle with $R > 0$, three distinct points are strictly non-collinear; this invariant guards against numerical drift).*

### 5.3 Non-Degenerate Radius `[DESIGNED]`
$$R > 0, \quad R < +\infty$$

### 5.4 Explicit Construction of Diagonals (Anti-Automatic Invariant) `[DESIGNED]`
* Diagonals $AC$ and $BD$ do **not** exist automatically upon quadrilateral creation.
* A diagonal segment entity is registered in the state only via an explicit construction command:
  $$\text{ADD\_DIAGONAL}(AC) \implies \text{Register Segment}(AC, \text{type: diagonal})$$
* This preserves the distinction between intrinsic topological vertices and registered constructive objects.

---

## 6. Dependencies & Construction DAG Mapping

The Construction DAG records the structural lineage of every entity:

```
[Given: Circle(O, R)] ──────┬───────────────────────────────┐
                            ▼                               ▼
              [Construct: 4 Points on Circle]      [Center: Point O]
                    (A, B, C, D)
                            │
               ┌────────────┴────────────┐
               ▼                         ▼
    [Construct: Base Sides]    [Construct: Diagonals (Explicit)]
      (AB, BC, CD, DA)                     (AC, BD)
               │                         │
               ▼                         ▼
    [Compose: Quadrilateral]   [Derive: Intersections & Inscribed Angles]
               │                         │
               └────────────┬────────────┘
                            ▼
          [Verify: CyclicQuadrilateral ABCD]
```

### 6.1 Dependency Registration Rule `[DESIGNED]`
* If entity $E_2$ depends on entity $E_1$ (e.g. Segment $AB$ depends on Points $A, B$), the DAG registers directed edge $E_1 \to E_2$.
* If $E_1$ is modified or deleted, all downstream dependent entities $E_{\text{descendant}}$ are immediately scheduled for invalidation or status transition.

---

## 7. Canon vs. Extension Boundary

| Dimension | Canon (CQNS-001 Phase 1 Scope) | Extension Scenarios (Future Extensions) |
| :--- | :--- | :--- |
| **Point Placement** | Strictly $A, B, C, D \in \text{Circle}(O, R)$ | Interior ($P \in \text{Int}(\mathcal{C})$) or Exterior ($P \in \text{Ext}(\mathcal{C})$) |
| **Circumcircle Count** | Exactly 1 canonical circle $\mathcal{C}$ | Multiple intersecting or tangent circles |
| **Polygon Topology** | 4-vertex cyclic quadrilateral | Arbitrary $n$-gons, self-intersecting complex quads |
| **Deformation Dynamics** | Static canonical snapshots | Continuous dragging with topology transitions |
| **Origin Tag** | `origin: CANONICAL` | `origin: EXTENSION_SCENARIO` |

---

## 8. Epistemic Boundaries & Status Taxonomy

The epistemic state of any fact or relation in the stand is strictly partitioned into a 6-state taxonomy with orthogonal provenance origin:

```
                          ┌─────────────────────┐
                          │     GIVEN (Input)   │
                          └──────────┬──────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    ▼                                 ▼
         ┌─────────────────────┐           ┌─────────────────────┐
         │     HYPOTHESIS      │           │      VERIFIED       │
         │  (Agent / Proposer) │           │   (Geometry Core)   │
         └──────────┬──────────┘           └──────────┬──────────┘
                    │ (Fails Check)                   │ (Chain of Proof)
                    ▼                                 ▼
         ┌─────────────────────┐           ┌─────────────────────┐
         │       INVALID       │           │       DERIVED       │
         │ (Contradicts State) │           │  (Proven Premise)   │
         └─────────────────────┘           └──────────┬──────────┘
                                                      │ (Parent Lost)
                                                      ▼
                                           ┌─────────────────────┐
                                           │       VANISHED      │
                                           │  (Missing Prereq)   │
                                           └─────────────────────┘
```

### 8.1 Status Definitions `[DESIGNED]`
* **`GIVEN`**: Axiomatic input primitives (e.g. $Circle(O, R)$ and canonical points $A, B, C, D$).
* **`HYPOTHESIS`**: Speculative claim formulated by an LLM Agent, user, or search heuristic. Has zero truth value until verified.
* **`VERIFIED`**: An atomic fact directly checked and validated by the deterministic `Geometry Core`.
* **`DERIVED`**: A composite fact logically deduced via formal inference rules from verified prerequisites.
* **`INVALID`**: An assertion whose geometric condition fails numerical/exact evaluation in the active coordinate state.
* **`VANISHED`**: A previously verified or derived fact whose upstream DAG dependencies have been deleted or modified.

### 8.2 Strict Distinction: `INVALID` vs `VANISHED` `[DESIGNED]`
* **`INVALID` $\implies$ State Contradiction:** The prerequisite objects exist, but the predicate evaluates to `false` (e.g., measuring opposite angles and finding $\angle A + \angle C = 150^\circ \neq 180^\circ$).
* **`VANISHED` $\implies$ Dependency Extinction:** The truth evaluation cannot even be performed because a necessary geometric prerequisite is no longer present in the `GeometryState` (e.g., Point $C$ was removed from the circle).

---

## 9. Verification Responsibilities & Architectural Isolation

### 9.1 Boundary Matrix `[DESIGNED]`

```
┌────────────────────────────────────────────────────────────────────────┐
│                              AGENT / SOL                               │
│  - Proposes Hypotheses (status: HYPOTHESIS)                            │
│  - Dispatches Constructive Commands (ADD_DIAGONAL, MEASURE_ANGLE)       │
│  - CANNOT assert mathematical truth or produce VERIFIED status         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (SOL Commands)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                           GEOMETRY CORE                                │
│  - Sole authoritative mathematical arbiter                             │
│  - Evaluates exact Euclidean relations and geometric invariants        │
│  - Contains the Verification Layer & encapsulates EPSILON (ε)          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (Verified Observations)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          RELATION GRAPH                                │
│  - Passive epistemic storage ledger                                    │
│  - Stores verified facts, derivation trees, and dependency links       │
│  - CANNOT perform independent geometric calculations or inference      │
└────────────────────────────────────────────────────────────────────────┘
```

### 9.2 Encapsulation of Epsilon ($\epsilon$) `[DESIGNED]`
* Floating-point comparison thresholds ($\epsilon_{\text{dist}} = 10^{-6}$, $\epsilon_{\text{angle}} = 10^{-4}$) reside exclusively inside `Verification Layer` functions.
* Downstream components (Domain Types, Relation Graph, SOL tokens, UI) receive purely symbolic statuses (`VERIFIED`, `INVALID`, `DEGENERATE`).

---

## 10. Non-Goals (Explicit Phase 1 Exclusions)

1. **No Code Implementation:** No production TypeScript/JavaScript classes or execution logic are written in Phase 1.
2. **No Second Geometry State:** No secondary state containers for auxiliary views or sub-triangles.
3. **No Automatic Theorem Proving:** No automated inference engines running in the domain definition layer.
4. **No Exterior/Interior Point Logic:** Complete omission of non-concyclic point topologies.
5. **No Fe3uni Runtime Coupling:** Zero runtime imports or tensor transformations from external Fe3uni packages.

---

## 11. Open Questions for External Audit

The following mathematical and structural questions are explicitly designated as `[OPEN QUESTION]` for external review:

1. **`[OPEN QUESTION-01]` Vertex Ordering and Convexity Criterion:**  
   *Question:* Should the canonical `CyclicQuadrilateral` strictly require non-self-intersecting cyclic ordering (e.g. vertices in strict counter-clockwise or clockwise order along the circumference: $\theta_A < \theta_B < \theta_C < \theta_D$), thereby rejecting crossed/butterfly quadrilaterals (e.g. $ABDC$) as non-canonical?  
   *Proposed Default:* Enforce strictly convex cyclic angular ordering on $S^1$ for the Canon.
2. **`[OPEN QUESTION-02]` Diagonal Intersection Registration:**  
   *Question:* When both diagonals $AC$ and $BD$ are constructed, should the intersection point $P = AC \cap BD$ be automatically registered as a child node in the Construction DAG, or must it require an explicit operational command `INTERSECT(AC, BD)`?  
   *Proposed Default:* Require explicit constructive registration to preserve deterministic DAG transparency.
3. **`[OPEN QUESTION-03]` Ptolemy's Theorem Epistemic Role:**  
   *Question:* Is Ptolemy's equality ($\|AC\|\|BD\| = \|AB\|\|CD\| + \|BC\|\|AD\|$) treated purely as a derived metric invariant, or can it be invoked as an alternate verification path for concyclicity?  
   *Proposed Default:* Treat strictly as a derived metric property of an already established `CyclicQuadrilateral`.

---

## 12. Traceability to Existing Stand

| CQNS-001 Requirement | Existing Repository Source | Status | Traceability Assessment |
| :--- | :--- | :--- | :--- |
| Single Geometry State | `src/engines/geometryState.ts` | `[OBSERVED]` | Base state container directly adaptable to 4-vertex quadrilateral schema |
| Deterministic Invariants | `src/engines/invariants.ts` | `[OBSERVED]` | Contains concyclicity and Thales testers; requires Ptolemy & opposite angle addition |
| Fact Identity Hash | `src/kernel/factIdentity.ts` | `[OBSERVED]` | Usable for canonical hashing of quadrilateral facts ($FactID(A,B,C,D)$) |
| Relational Graph Storage | `src/engines/research/researchGraph.ts` | `[OBSERVED]` | Verified to be relational storage; must retain passive ledger role |
| SOL Gateway | `src/engines/semantic/aamGateway.ts` | `[OBSERVED]` | Operational bridge candidate; authority must remain non-mathematical |
| Construction History | `src/engines/constructionCore.ts` | `[OBSERVED]` | History logging exists; requires formal single Construction DAG interface |

---

## 13. Self-Check & Phase Invariant Verification

- [x] **Canon strictly restricted to 4 concyclic points on 1 circle.**
- [x] **Zero production code written.**
- [x] **No second GeometryState introduced.**
- [x] **Geometry Core confirmed as sole mathematical authority.**
- [x] **Relation Graph confirmed as passive ledger (zero computational authority).**
- [x] **SOL protocol confirmed as thin operational bridge.**
- [x] **Epsilon ($\epsilon$) strictly isolated from domain model.**
- [x] **`INVALID` strictly distinguished from `VANISHED`.**
- [x] **Diagonals require explicit construction (anti-automatic invariant).**
- [x] **Ptolemy modeled as metric invariant, not cyclicity definition.**
- [x] **Extension scenarios clearly isolated from Canon.**
- [x] **Open questions explicitly documented.**
