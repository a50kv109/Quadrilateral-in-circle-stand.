# CQNS-001 — VERIFICATION CONTRACTS SPECIFICATION

**Document Version:** 1.0.0-PROMPT03-DRAFT  
**Status:** SPECIFICATION COMPLETE — AWAITING EXTERNAL HUMAN AUDIT  
**Phase:** Phase 3 (Verification Contracts & Mathematical Invariants)  
**System Target:** CQNS-001 (Cyclic Quadrilateral Normalization Stand)  
**Core Invariants:**
* *"UI → GeometryState → Geometry Core → Verification Layer → Relation Graph"*
* *"Geometry Core + Verification Layer is the SOLE Mathematical Authority"*
* *"Relation Graph is strictly PASSIVE (Relation Graph ≠ second Geometry Core)"*
* *"UI is strictly an INTERACTION and VISUALIZATION layer"*
* *"Epsilon (ε) is strictly encapsulated within the Verification Layer"*

---

## 1. Architectural Authority & Pipeline

The verification architecture of CQNS-001 follows a strict, unidirectional authority pipeline:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                     UI                                      │
│  - Dispatches interactive commands (MOVE_POINT, CONSTRUCT_DIAGONAL)        │
│  - Renders visual primitives and formats verified facts                     │
│  - CANNOT compute truth, CANNOT verify geometry, CANNOT mutate epistemic map │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ (User Mutations / Queries)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                               GEOMETRY STATE                                │
│  - Single authoritative storage of coordinates and registered primitives    │
│  - Evaluates topological updates and triggers recomputation                 │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ (Entity Coordinates & DAG Links)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                GEOMETRY CORE                                │
│  - Pure deterministic Euclidean arithmetic and algebraic solver             │
│  - Computes exact distances, circle parameters, angles, and intersections   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ (Exact Numeric Properties)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             VERIFICATION LAYER                              │
│  - Applies formal Verification Contracts (VC-01 ... VC-14)                  │
│  - Encapsulates EPSILON (ε) numerical tolerances                            │
│  - Emits symbolic Epistemic Assertions (VERIFIED, INVALID, DEGENERATE)      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ (Authorized Verified Observations)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                               RELATION GRAPH                                │
│  - Passive epistemic ledger indexing relations, dependencies, & provenance  │
│  - Updates statuses to VERIFIED, DERIVED, INVALID, or VANISHED              │
│  - CANNOT perform independent math or inference                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Canonical Domain Boundary

The canonical verification domain is strictly bounded to the 4-point concyclic configuration:

$$\mathcal{U}_{\text{Canon}} = \left\{ (O, R, A, B, C, D) \;\middle|\; O \in \mathbb{R}^2, \; R \in \mathbb{R}_{>0}, \; A, B, C, D \in \text{Circle}(O, R) \right\} \implies \text{CyclicQuadrilateral}(ABCD)$$

* **Canon Scope:** Concyclicity of four non-coincident vertices on a single non-degenerate circle.
* **Extension Scenarios:** Points interior ($P \in \text{Int}(\mathcal{C})$), points exterior ($P \in \text{Ext}(\mathcal{C})$), multiple circles, or dynamic non-concyclic deformations remain tagged as `origin: EXTENSION_SCENARIO` and are strictly excluded from canonical verification paths.

---

## 3. Numerical Tolerance & Epsilon ($\epsilon$) Encapsulation

The numerical threshold $\epsilon$ is an implementation detail of the **Verification Layer** and is completely sealed within its internal evaluation methods.

### 3.1 Tolerance Standards `[OBSERVED / DESIGNED]`
Inherited from the verified arithmetic kernel of `src/engines/invariants.ts`:
* Distance / Radial Tolerance: $\epsilon_{\text{dist}} = 1.0 \times 10^{-6}$
* Angular Tolerance: $\epsilon_{\text{angle}} = 1.0 \times 10^{-4}\text{ rad} \approx 0.0057^\circ$
* Degeneracy / Coincidence Floor: $\epsilon_{\text{collinear}} = 1.0 \times 10^{-7}$

### 3.2 Invariant Boundary Rule
* Epsilon values **never appear** in domain models, SOL semantic tokens, Relation Graph nodes, or UI state.
* Downstream layers receive only discrete, symbolic truth verdicts:
  $$\text{Predicate Result} \in \{ \text{TRUE}, \text{FALSE}, \text{DEGENERATE}, \text{PRECONDITION\_FAILED} \}$$

---

## 4. Epistemic Statuses & Lifecycle Contracts

The Verification Layer emits state updates governed by the canonical 6-state epistemic taxonomy:

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

### 4.1 Strict Disambiguation: `INVALID` vs `VANISHED` `[DESIGNED]`

| Dimension | `INVALID` | `VANISHED` |
| :--- | :--- | :--- |
| **Trigger** | Mathematical predicate evaluates to `false` in current state. | One or more upstream prerequisite entities/relations were removed or destroyed. |
| **Prerequisites** | All prerequisite entities exist in `GeometryState`. | Prerequisites are missing, deleted, or unresolvable in the DAG. |
| **Example** | Vertex $D$ is dragged off the circle ($\|D - O\| \neq R$). `cyclic_quadrilateral` becomes `INVALID`. | Point $D$ is deleted from `GeometryState`. Dependent chord $CD$ and `cyclic_quadrilateral` become `VANISHED`. |
| **State Mutation** | All geometric primitives remain intact. | Primitives deleted/altered in state; dependent facts deactivated. |
| **Provenance** | Provenance retained with failure diagnostic record. | Provenance retained; record marked as extinct due to dependency loss. |

---

## 5. State Change Verification Flow

When the `GeometryState` changes (e.g. `MOVE_POINT`, `CHANGE_RADIUS`, `CONSTRUCT_POINT`, `REMOVE_CONSTRUCTION`):

```
       [User Interaction / Agent Command]
                       │
                       ▼
            [GeometryState Mutated]
                       │
                       ▼
     [Construction DAG Identifies Impacted Nodes]
                       │
                       ▼
      [Verification Layer Re-evaluates Contracts]
        ├── Preconditions Missing ─────────► Set Status: VANISHED
        ├── Numeric Check Fails (Δ > ε) ───► Set Status: INVALID
        └── Numeric Check Holds (Δ ≤ ε) ───► Retain / Set Status: VERIFIED
                       │
                       ▼
        [Relation Graph Ledger Updated]
```

### Restoration Semantics (`VANISHED` / `INVALID` $\to$ `VERIFIED`)
* If an `INVALID` relation's preconditions and invariant become numerically true again (e.g. point dragged back onto circle), the Verification Layer re-authorizes status `VERIFIED`.
* If a `VANISHED` relation has its prerequisites re-constructed, it is treated as a fresh proposition requiring re-verification.

---

## 6. Detailed Verification Contracts (VC-01 to VC-14)

### VC-01: Common Circumcircle
* **Target:** `Circle(O, R)`
* **Preconditions:** Three non-collinear distinct points $A, B, C \in \mathbb{R}^2$ ($\text{Area}(\triangle ABC) > \epsilon_{\text{collinear}}$).
* **Evidence:** Center $O$ is the unique circumcenter satisfying $\|A-O\| = \|B-O\| = \|C-O\| = R$, with $R > 0$.
* **Authority:** `Geometry Core` circumcenter solver.
* **Result:** `VERIFIED` (if non-degenerate) or `INVALID`/`DEGENERATE` (if collinear).

---

### VC-02: Point-on-Circle
* **Target:** `point_on_circle(P, Circle(O, R))`
* **Preconditions:** Point $P$ exists; `Circle(O, R)` is a valid non-degenerate circle.
* **Evidence:** Radial distance deviation:
  $$\big| \|P - O\|_2 - R \big| \le \epsilon_{\text{dist}}$$
* **Authority:** `Geometry Core` distance calculation.
* **Result:** `VERIFIED` (if on circle) or `INVALID` (if off circle).

---

### VC-03: CyclicQuadrilateral
* **Target:** `cyclic_quadrilateral(Quad(ABCD), Circle(O, R))`
* **Preconditions:**
  1. Points $A, B, C, D$ exist and are pairwise distinct ($\forall i \neq j: \|P_i - P_j\| > \epsilon_{\text{dist}}$).
  2. Four base chords $AB, BC, CD, DA$ are registered.
  3. `Circle(O, R)` exists with $R > 0$.
* **Evidence:** Mutual concyclicity of all 4 vertices:
  $$\max_{P \in \{A, B, C, D\}} \big| \|P - O\|_2 - R \big| \le \epsilon_{\text{dist}}$$
* **Authority:** `Geometry Core` + `Verification Layer`.
* **Result:** `VERIFIED` (all 4 on circle), `INVALID` (at least 1 point violates tolerance), or `VANISHED` (if any vertex is deleted).

---

### VC-04: Chord
* **Target:** `chord_of(Segment(P1, P2), Circle(O, R))`
* **Preconditions:** $P_1 \neq P_2$; `point_on_circle(P1, Circle)` and `point_on_circle(P2, Circle)` both hold.
* **Evidence:** Both endpoints satisfy VC-02.
* **Authority:** `Verification Layer` (Structural composition).
* **Result:** `VERIFIED` or `INVALID`.

---

### VC-05: Diameter
* **Target:** `diameter_of(Segment(P1, P2), Circle(O, R))`
* **Preconditions:** `chord_of(Segment(P1, P2), Circle)` is `VERIFIED`. Center $O$ exists.
* **Evidence:**
  1. Length equals double radius: $\big| \|P_1 - P_2\|_2 - 2R \big| \le \epsilon_{\text{dist}}$
  2. Collinearity with center: $\text{Distance}(O, \text{Line}(P_1, P_2)) \le \epsilon_{\text{dist}}$
* **Authority:** `Geometry Core` metric & collinearity evaluator.
* **Result:** `VERIFIED` or `INVALID`. *(Critical distinction: a chord does NOT automatically become a diameter without meeting this contract).*

---

### VC-06: Diagonal
* **Target:** `diagonal_of(Segment(P1, P2), Quad(ABCD))`
* **Preconditions:** $(P_1, P_2)$ are non-adjacent vertices of $Quad(ABCD)$ (i.e. $(A, C)$ or $(B, D)$).
* **Evidence:** Explicit constructive registration in the Construction DAG connecting the two non-adjacent vertices.
* **Authority:** `Construction DAG` / `Verification Layer`.
* **Result:** `VERIFIED` (if constructed) or `NOT_FOUND` (if not constructed). *(Critical distinction: diagonals do not exist automatically).*

---

### VC-07: Inscribed Angle
* **Target:** `inscribed_angle(Angle(P1, V, P2), Circle(O, R))`
* **Preconditions:** $V, P_1, P_2 \in \text{Circle}(O, R)$ ($P_1 \neq V, P_2 \neq V$).
* **Evidence:** Apex $V$ and terminal points $P_1, P_2$ satisfy VC-02.
* **Authority:** `Geometry Core` ray/arc evaluator.
* **Result:** `VERIFIED` or `INVALID`.

---

### VC-08: Opposite Angles
* **Target:** `opposite_angles(Angle(A), Angle(C), Quad(ABCD))`
* **Preconditions:** `Quad(ABCD)` is registered. Angles $\angle A = \angle DAB$ and $\angle C = \angle BCD$ are registered.
* **Evidence:** Vertices $A$ and $C$ are non-adjacent index positions in cyclic vertex tuple $(A, B, C, D)$.
* **Authority:** `Structural Model` (Topology).
* **Result:** `VERIFIED` or `INVALID`.

---

### VC-09: Same Arc Subtended
* **Target:** `same_arc_subtended(Angle(1), Angle(2), Arc(P1, P2))`
* **Preconditions:** Both angles are verified inscribed angles on $\text{Circle}(O, R)$ sharing base endpoints $(P_1, P_2)$ on the same orientation of the circular arc.
* **Evidence:** $\text{sign}(\text{CrossProduct}(V_1 - P_1, P_2 - P_1)) = \text{sign}(\text{CrossProduct}(V_2 - P_1, P_2 - P_1))$.
* **Authority:** `Geometry Core` orientation tester.
* **Result:** `VERIFIED` or `INVALID`.

---

### VC-10: Equal Inscribed Angles
* **Target:** `equal_inscribed_angles(Angle(1), Angle(2))`
* **Preconditions:** `same_arc_subtended(Angle(1), Angle(2), Arc)` is `VERIFIED`.
* **Evidence:** Inscribed Angle Theorem: angles intercepting identical circular arcs are equal.
  $$\big| \text{measure}(\angle_1) - \text{measure}(\angle_2) \big| \le \epsilon_{\text{angle}}$$
* **Authority:** `Geometry Core` + Formal Rule `RULE_INSCRIBED_ANGLE_ARC_EQUALITY`.
* **Result:** `DERIVED` (from VC-09).

---

### VC-11: Supplementary Opposite Angles
* **Target:** `supplementary_angles(Angle(A), Angle(C))`
* **Preconditions:** `cyclic_quadrilateral(Quad(ABCD), Circle)` is `VERIFIED`; `opposite_angles(Angle(A), Angle(C), Quad(ABCD))` is `VERIFIED`.
* **Evidence:** Inscribed Quadrilateral Theorem: opposite interior angles sum to $\pi$ radians ($180^\circ$).
  $$\big| (\text{measure}(\angle A) + \text{measure}(\angle C)) - \pi \big| \le \epsilon_{\text{angle}}$$
* **Authority:** `Geometry Core` + Formal Rule `RULE_INSCRIBED_QUAD_OPPOSITE_ANGLES`.
* **Result:** `DERIVED` (from VC-03 and VC-08).

---

### VC-12: Segment Length
* **Target:** `segment_length(Segment(P1, P2), L)`
* **Preconditions:** Points $P_1, P_2$ exist with finite coordinates.
* **Evidence:** Euclidean distance formula: $L = \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}$.
* **Authority:** `Geometry Core`.
* **Result:** `VERIFIED`.

---

### VC-13: Angle Measure
* **Target:** `angle_measure(Angle(P1, V, P2), \theta)`
* **Preconditions:** Points $P_1, V, P_2$ exist; $P_1 \neq V$ and $P_2 \neq V$.
* **Evidence:** Dot product formula: $\theta = \arccos\left(\frac{(P_1 - V) \cdot (P_2 - V)}{\|P_1 - V\| \|P_2 - V\|}\right)$.
* **Authority:** `Geometry Core`.
* **Result:** `VERIFIED`.

---

### VC-14: Ptolemy Derived Relation
* **Target:** `ptolemy_metric_equality(Quad(ABCD))`
* **Preconditions:**
  1. `cyclic_quadrilateral(Quad(ABCD), Circle)` is `VERIFIED`.
  2. Diagonals $AC$ and $BD$ are explicitly constructed via VC-06.
  3. All 6 lengths ($\|AB\|, \|BC\|, \|CD\|, \|DA\|, \|AC\|, \|BD\|$) are evaluated via VC-12.
* **Evidence:** Metric equality check:
  $$\big| (\|AC\| \cdot \|BD\|) - (\|AB\| \cdot \|CD\| + \|BC\| \cdot \|AD\|) \big| \le \epsilon_{\text{dist}} \cdot 4R$$
* **Authority:** `Geometry Core` metric evaluator + `RULE_PTOLEMY_EQUALITY`.
* **Result:** `DERIVED` (Derived metric invariant).
* **Converse Status:** `OPEN / NOT YET IMPLEMENTABLE` (Converse verification of concyclicity from Ptolemy equality requires prior proof of quadrilateral convexity; retained as an open research property, not primary cyclicity definition).

---

## 7. Master Verification Contract Table

| Contract ID | Target Fact / Relation | Input Prerequisites | Verification Evidence | Responsible Authority | Possible Results | Dependency Invalidation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **VC-01** | `Circle(O, R)` | Points $A, B, C$ | Non-collinear; equidistant circumcenter | `Geometry Core` | `VERIFIED`, `INVALID`, `DEGENERATE` | Any vertex delete $\to$ `VANISHED` |
| **VC-02** | `point_on_circle(P, C)` | Point $P$, Circle $C$ | $\big| \|P-O\| - R \big| \le \epsilon_{\text{dist}}$ | `Geometry Core` | `VERIFIED`, `INVALID` | $P$ or $C$ delete $\to$ `VANISHED` |
| **VC-03** | `cyclic_quad(ABCD, C)` | Points $A, B, C, D$, Circle $C$ | All 4 points satisfy VC-02 | `Geometry Core` + `Verif Layer` | `VERIFIED`, `INVALID` | Any vertex delete $\to$ `VANISHED` |
| **VC-04** | `chord_of(S, C)` | Segment $S(P_1, P_2)$, Circle $C$ | Endpoints satisfy VC-02 | `Verification Layer` | `VERIFIED`, `INVALID` | Endpoint delete $\to$ `VANISHED` |
| **VC-05** | `diameter_of(S, C)` | Chord $S$, Circle $C$, Center $O$ | $\|S\| = 2R$ & $O \in \text{Line}(S)$ | `Geometry Core` | `VERIFIED`, `INVALID` | Chord/Center delete $\to$ `VANISHED` |
| **VC-06** | `diagonal_of(S, Q)` | Segment $S$, Quad $Q$ | Explicit Construction DAG entry | `Construction DAG` | `VERIFIED`, `NOT_FOUND` | Vertex delete $\to$ `VANISHED` |
| **VC-07** | `inscribed_angle(A, C)`| Angle $A(P_1, V, P_2)$, Circle $C$ | $V, P_1, P_2$ satisfy VC-02 | `Geometry Core` | `VERIFIED`, `INVALID` | Point delete $\to$ `VANISHED` |
| **VC-08** | `opposite_angles(A, C, Q)`| Angles $A, C$, Quad $Q$ | Topological opposite vertices in $Q$ | `Structural Layer` | `VERIFIED`, `INVALID` | Quad delete $\to$ `VANISHED` |
| **VC-09** | `same_arc_subtended` | Inscribed Angles $1, 2$, Arc | Shared endpoints + same orientation | `Geometry Core` | `VERIFIED`, `INVALID` | Angle delete $\to$ `VANISHED` |
| **VC-10** | `equal_inscribed_angles`| Inscribed Angles $1, 2$ | Derived from VC-09 | `Formal Rule Catalog` | `DERIVED`, `INVALID` | Premise delete $\to$ `VANISHED` |
| **VC-11** | `supplementary_angles` | Opposite Angles $A, C$, Quad $Q$| Derived from VC-03 & VC-08 | `Formal Rule Catalog` | `DERIVED`, `INVALID` | Quad/Point delete $\to$ `VANISHED` |
| **VC-12** | `segment_length(S, L)` | Segment $S(P_1, P_2)$ | Euclidean metric computation | `Geometry Core` | `VERIFIED` | Endpoint delete $\to$ `VANISHED` |
| **VC-13** | `angle_measure(A, \theta)`| Angle $A(P_1, V, P_2)$ | Trigonometric ray computation | `Geometry Core` | `VERIFIED` | Point delete $\to$ `VANISHED` |
| **VC-14** | `ptolemy_metric_equality`| Cyclic Quad $Q$, Diagonals | Metric product sum equality | `Geometry Core` + `Rule Catalog` | `DERIVED`, `INVALID` | Diagonal delete $\to$ `VANISHED` |

---

## 8. Open Questions Analysis (Impact on Verification)

### 8.1 `[OPEN QUESTION-01]` Vertex Order & Convexity Criterion `[OPEN QUESTION]`
* **Verification Impact:**
  * Invariant $\angle A + \angle C = 180^\circ$ (VC-11) and Ptolemy equality (VC-14) strictly require a **convex, non-self-intersecting** vertex order along $S^1$.
  * If vertices are ordered in a crossed configuration (e.g. $A \to B \to D \to C$), diagonals cross exterior boundaries, and opposite angle summation is invalid.
* **Verification Contract Constraint:**
  * In Phase 3, VC-11 and VC-14 declare a precondition: `is_convex_ordering(A, B, C, D)`.
  * The algebraic evaluation of `is_convex_ordering` computes whether the polar angle progression $(\theta_A, \theta_B, \theta_C, \theta_D)$ on $S^1$ is strictly monotonic (modulo $2\pi$).
  * If ordering is non-monotonic (crossed), the quadrilateral is flagged as `TOPOLOGY_CROSSED` and VC-11/VC-14 evaluate to `INVALID` or `DEGENERATE`.

### 8.2 `[OPEN QUESTION-02]` Diagonal Intersection Registration `[OPEN QUESTION]`
* **Verification Impact:**
  * Diagonal intersection $P = AC \cap BD$ is **not automatically registered** upon quadrilateral instantiation.
  * Intersection point $P$ is registered into `GeometryState` only if explicitly commanded via `CONSTRUCT_INTERSECTION(AC, BD)`.
  * The existence of an intersection point is verified via standard 2D line segment intersection arithmetic in `Geometry Core`.

### 8.3 `[OPEN QUESTION-03]` Ptolemy's Converse Role `[OPEN QUESTION]`
* **Verification Impact:**
  * VC-14 establishes Ptolemy strictly as a **derived metric property** of an already verified concyclic quadrilateral ($A, B, C, D \in \mathcal{C} \implies AC \cdot BD = AB \cdot CD + BC \cdot AD$).
  * The converse criterion ($AC \cdot BD = AB \cdot CD + BC \cdot AD \implies \text{Cyclic}$) is retained as `OPEN / NOT YET IMPLEMENTABLE` because verifying cyclicity via circumcircle incidence (VC-03) is numerically and topologically superior.

---

## 9. Safety & Non-Regression Invariants

1. **Single State Invariant:** No secondary or shadow `GeometryState` created for verification.
2. **Deterministic Core:** All mathematical checks in VC-01 through VC-14 are deterministic functions of coordinates.
3. **Passive Ledger:** `Relation Graph` only receives and stores the output of authorized contracts; it never executes contracts.
4. **Passive UI:** UI components never evaluate contracts or compute epsilon deltas.
5. **Epsilon Isolation:** Epsilon tolerances exist exclusively within the `Verification Layer`.
6. **Provenance Traceability:** Every `VERIFIED` and `DERIVED` assertion records its authorizing contract ID and input entity IDs.
7. **No Object Erasure on Invalidation:** When a relation becomes `INVALID` or `VANISHED`, the underlying geometric points and circles in `GeometryState` are **never** deleted.

---

## 10. Self-Check & Phase Invariant Verification

- [x] **Verification boundaries strictly established (`Geometry Core` + `Verification Layer` as sole authority).**
- [x] **`Relation Graph` and `UI` confirmed strictly passive.**
- [x] **Canon remains strictly 4 concyclic points on 1 circle.**
- [x] **Epsilon encapsulated solely within Verification Layer.**
- [x] **`INVALID` and `VANISHED` rigorously defined and separated.**
- [x] **VC-01 to VC-14 fully specified with inputs, evidence, authority, and dependencies.**
- [x] **Diagonals and diagonal intersections require explicit construction.**
- [x] **Ptolemy treated as derived metric invariant (VC-14).**
- [x] **Vertex order / convexity dependencies explicitly identified.**
- [x] **Zero production code written.**
