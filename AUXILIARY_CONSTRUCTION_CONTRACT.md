# CQNS-001 — AUXILIARY CONSTRUCTION CONTRACT SPECIFICATION

**Document Version:** 1.0.0-PROMPT06-DRAFT  
**Status:** SPECIFICATION COMPLETE — AWAITING EXTERNAL HUMAN AUDIT  
**Phase:** Phase 6 (Auxiliary Construction Contract & DAG Lineage)  
**System Target:** CQNS-001 (Cyclic Quadrilateral Normalization Stand)  
**Guiding Architectural Invariants:**
* *"An auxiliary construction is an explicit constructive operation, NOT a theorem proof."*
* *"Single Source of Truth: Unified GeometryState + Single-Rooted Construction DAG"*
* *"Agent Intent → SOL Gateway → Construction / Geometry Core → Verification Layer → Relation Graph"*
* *"Zero-Silent-Inference: No auto-diagonals, no auto-intersections, no auto-Ptolemy"*
* *"Construction registration ≠ Mathematical verification"*

---

## 1. Purpose & Scope

The **Auxiliary Construction Contract** defines the formal semantics, lifecycle, DAG lineage tracking, permission rules, and safety boundaries for **auxiliary geometric constructions** in **CQNS-001** (*Cyclic Quadrilateral Normalization Stand*).

This document establishes:
* What constitutes an authorized auxiliary construction in the canonical cyclic quadrilateral stand.
* How auxiliary primitives (such as diagonals $AC, BD$ or diagonal intersection points $P = AC \cap BD$) are registered within the unified `Construction DAG` and `GeometryState`.
* Why constructive operations are strictly non-assertive (i.e. creating an auxiliary segment does **not** prove cyclicity, convexity, angle invariance, or metric relations).
* The precise dependency invalidation and provenance rules when auxiliary constructions are added, moved, or removed.

---

## 2. Definition & Nature of Auxiliary Constructions

In CQNS-001, an **Auxiliary Construction** is defined as:
> **"A deterministic, explicitly commanded registration of a secondary geometric primitive (segment, line, point, or circle) spanning or derived from existing canonical entities, without altering the canonical problem boundary."**

### Non-Theorem Principle `[DESIGNED]`:
* Executing an auxiliary construction is purely an **action of geometric synthesis** in `GeometryState`.
* An auxiliary construction **does not prove a theorem**; it merely introduces a new entity into the coordinate space and registers its parent-child edges in the `Construction DAG`.
* Any geometric property or metric invariant associated with the auxiliary construction (such as inscribed angle equality $\angle BAC = \angle BDC$ or Ptolemy product equality) remains unverified until explicitly evaluated by the `Verification Layer`.

---

## 3. Authority Pipeline for Constructions

Constructive operations follow the strict unidirectional architectural pipeline:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                 AGENT / USER                                │
│  - Formulates intent: "Construct diagonal connecting A and C"               │
│  - Dispatches command: ADD_DIAGONAL(quad_ABCD, A, C)                        │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ (SOL Command Request)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             SOL GATEWAY BRIDGE                              │
│  - Validates command syntax & checks that A, C exist in quad_ABCD           │
│  - Transmits request to Construction Core                                   │
│  - ZERO geometric math | ZERO theorem proving | ZERO auto-constructions     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ (Authorized Construction Dispatch)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       CONSTRUCTION CORE & GEOMETRY STATE                    │
│  - Instantiates Segment(id='diag_AC', p1='A', p2='C', type='diagonal')      │
│  - Registers parent edges in Construction DAG: [Point A, Point C] -> diag_AC│
│  - Emits: State Mutation Event (stateVersion++)                             │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ (New Entity in State)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             VERIFICATION LAYER                              │
│  - Evaluates Contract VC-06 (Diagonal): confirms non-adjacent vertex chord  │
│  - Emits: Fact diagonal_of(diag_AC, quad_ABCD) [Status: VERIFIED]           │
│  - DOES NOT automatically verify Ptolemy or diagonal intersection           │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ (Authorized Fact & Provenance)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                               RELATION GRAPH                                │
│  - Passively records fact node & dependency links                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Catalog of Allowed Auxiliary Constructions

Every constructive operation is classified against the existing repository capabilities and canonical requirements:

| Auxiliary Construction | Target Entities | Semantic Meaning | Classification in Stand |
| :--- | :--- | :--- | :--- |
| **`ADD_DIAGONAL(quadId, p1, p2)`** | Non-adjacent vertices $(A, C)$ or $(B, D)$ | Explicitly registers a diagonal segment in `GeometryState` | `REQUIRES ADAPTATION` (Specialization of `addSegment` with type tag `'diagonal'`) |
| **`CONSTRUCT_INTERSECTION(seg1, seg2)`** | Segments $AC$ and $BD$ | Computes and registers intersection point $P = AC \cap BD$ | `OBSERVED EXISTING OPERATION` (`geometryIntersections.ts`) |
| **`CONSTRUCT_MIDPOINT(p1, p2)`** | Segment or chord endpoints | Registers midpoint $M = \frac{P_1 + P_2}{2}$ with parent dependency | `OBSERVED EXISTING OPERATION` (`constructionCore.ts`) |
| **`CONSTRUCT_PERPENDICULAR_BISECTOR(p1, p2)`** | Segment endpoints | Registers the perpendicular bisector line | `OBSERVED EXISTING OPERATION` (`perpendicularBisector.ts`) |
| **`CONSTRUCT_CIRCUMCIRCLE(p1, p2, p3)`** | Three non-collinear vertices | Computes center $O$ and radius $R$ through circumcenter solver | `OBSERVED EXISTING OPERATION` (`constructionCore.ts`) |

---

## 5. `ADD_DIAGONAL` Semantics & Non-Automatic Invariant

The operation `ADD_DIAGONAL(quadId, A, C)` represents the primary auxiliary construction in CQNS-001.

### 5.1 Preconditions `[DESIGNED]`:
1. `Quadrilateral(quadId)` exists in `GeometryState`.
2. Points $A$ and $C$ are registered vertices of `quadId`.
3. $A$ and $C$ are **non-adjacent** in the ordered vertex sequence $[A, B, C, D]$ (i.e. they do not form a base side $AB, BC, CD, DA$).
4. Points $A$ and $C$ are non-coincident ($\|A - C\|_2 > \epsilon_{\text{dist}}$).

### 5.2 Execution Effects `[DESIGNED]`:
1. **Entity Creation:** Creates `Segment(id='diag_AC', p1='A', p2='C', type='diagonal')`.
2. **DAG Registration:** Adds directed edges in the `Construction DAG`:
   $$\text{Node}(A) \longrightarrow \text{Node}(\text{diag\_AC}) \longleftarrow \text{Node}(C)$$
3. **Epistemic Emittance:** Emits structural fact `diagonal_of(diag_AC, quad_ABCD)` via contract `VC-06`.

### 5.3 Anti-Automatic Invariant (What is NOT done) `[DESIGNED]`:
* `ADD_DIAGONAL(AC)` does **NOT** automatically create diagonal $BD$.
* `ADD_DIAGONAL(AC)` does **NOT** automatically prove concyclicity of $ABCD$.
* `ADD_DIAGONAL(AC)` does **NOT** compute or verify Ptolemy's equality.
* `ADD_DIAGONAL(AC)` does **NOT** split the quadrilateral into independent sub-geometry states. Sub-triangles $\triangle ABC$ and $\triangle ADC$ are **logical views** over the single `GeometryState`.

---

## 6. Diagonal Intersection Semantics (Preservation of OPEN QUESTION-02)

The intersection of diagonals $AC$ and $BD$ is governed by strict, non-automatic constructive rules:

### 6.1 Status of OPEN QUESTION-02 `[OPEN QUESTION]`:
* **Rule:** The diagonal intersection point $P = AC \cap BD$ is **NOT automatically instantiated** when both diagonals $AC$ and $BD$ exist.
* **Requirement:** Instantiating point $P$ requires an explicit constructive command:
  $$\text{CONSTRUCT\_INTERSECTION}(\text{diag\_AC}, \text{diag\_BD}) \implies \text{Point}(P)$$

### 6.2 Preconditions & Geometric Degeneracy:
1. Both `diag_AC` and `diag_BD` must be registered in `GeometryState`.
2. `Geometry Core` executes exact 2D line segment intersection arithmetic:
   * If segments intersect at an interior point $P \implies$ `Point(id='pt_intersection_AC_BD')` is registered in `GeometryState`.
   * If segments are parallel, collinear, or non-intersecting (e.g. in crossed/non-convex quadrilaterals where diagonals do not cross internally) $\implies$ `Construction Core` returns `EXECUTION_REJECTED (LINES_DO_NOT_INTERSECT)`.
3. **DAG Lineage:** Point $P$ registers direct dependencies on both segments:
   $$\text{Node}(\text{diag\_AC}) \longrightarrow \text{Node}(P) \longleftarrow \text{Node}(\text{diag\_BD})$$

---

## 7. Single-State & Single-Rooted Construction DAG Integration

To uphold the core architectural invariants of Phases 0–5:

```
                              [Circle(O, R)]
                                    │
           ┌────────────────────────┼────────────────────────┐
           ▼                        ▼                        ▼
       [Point A]                [Point B]                [Point C] ... [Point D]
           │                        │                        │             │
           └───────────┬────────────┴───────────┬────────────┘             │
                       ▼                        ▼                          ▼
               [Base Side AB]           [Base Side BC]            [Base Side CD] ...
                       │                        │                          │
                       └────────────────────────┼──────────────────────────┘
                                                ▼
                                    [Quadrilateral ABCD]
                                                │
                       ┌────────────────────────┴────────────────────────┐
                       ▼ (Explicit Auxiliary Construction)               ▼ (Explicit Auxiliary Construction)
               [Diagonal AC]                                     [Diagonal BD]
                       │                                                 │
                       └────────────────────────┬────────────────────────┘
                                                ▼ (Explicit Intersection Construction)
                                  [Intersection Point P]
```

### 7.1 Single State Invariant `[DESIGNED]`:
* All auxiliary points, segments, and rays are stored in the **single authoritative `GeometryState`**.
* No secondary or shadow geometry states are created for sub-triangles, diagonal cross-sections, or experimental constructions.

### 7.2 Single DAG Invariant `[DESIGNED]`:
* The `Construction DAG` is a single directed acyclic graph maintaining the exact mathematical lineage of every primitive.
* Invalidation propagates strictly downstream along directed edges.

---

## 8. Epistemic Semantics & Lifecycle of Auxiliary Facts

Auxiliary constructions interact with the canonical 6-state epistemic taxonomy (`GIVEN`, `HYPOTHESIS`, `VERIFIED`, `DERIVED`, `INVALID`, `VANISHED`):

1. **Constructive Registration Status:**  
   * The structural existence of an auxiliary segment is registered as `status: GIVEN` or confirmed via structural contract `VC-06 (Diagonal)` as `status: VERIFIED`.
2. **Derived Invariant Status:**  
   * Mathematical theorems relying on auxiliary constructions (e.g. `equal_inscribed_angles` subtended by chord $AB$ at vertices $C$ and $D$, or Ptolemy metric equality `VC-14`) receive `status: DERIVED` with explicit premise references to the auxiliary entities.
3. **Dynamic Invalidation & `VANISHED` Transition (Phase 4 Semantics):**  
   * If vertex $A$ is dragged such that prerequisite concyclicity is lost ($A \notin \mathcal{C}$), `point_on_circle(A, C)` fails $\implies$ downstream derived facts (e.g. `ptolemy_metric_equality`) transition to **`VANISHED`**.
   * The auxiliary segment `diag_AC` **remains in existence** in `GeometryState` as a straight line segment connecting $A$ and $C$, but its epistemic role as a *canonical concyclic chord/diagonal* is deactivated.

---

## 9. Zero-Silent-Inference Rule (Anti-Pattern Matrix)

| Prohibited Implicit Action | Architectural Risk | Required Formal Protocol |
| :--- | :--- | :--- |
| **Auto-creating Diagonals** | Degrades explicit DAG lineage; creates unwanted objects | Require explicit `ADD_DIAGONAL(A, C)` |
| **Auto-creating Intersection $P$** | Fails in crossed quads; assumes interior intersection | Require explicit `CONSTRUCT_INTERSECTION(AC, BD)` |
| **Auto-verifying Cyclicity on `ADD_DIAGONAL`** | Blurs line between construction and mathematical proof | Require separate verification query under `VC-03` |
| **Auto-evaluating Ptolemy on `ADD_DIAGONAL`** | Turns construction into an automatic theorem prover | Require separate verification query under `VC-14` |
| **Auto-reordering Vertices on Construction** | Masks topological defects (e.g. crossed/butterfly quads) | Retain exact caller-specified vertex order |

---

## 10. Repository Compatibility Analysis

Inspection of existing construction and intersection modules in `src/engines/`:

1. **`constructionCore.ts` `[OBSERVED]`:**  
   * Implements procedural construction primitives (`addPoint`, `addSegment`, `addCircle`, `createMidpoint`).
   * *Compatibility:* 100% compatible. Directly adaptable to support explicit diagonal tagging (`type: 'diagonal'`).
2. **`geometryIntersections.ts` `[OBSERVED]`:**  
   * Implements robust line-line and segment-segment 2D intersection solvers.
   * *Compatibility:* Directly reusable for explicit `CONSTRUCT_INTERSECTION(AC, BD)`.
3. **`dependencyRecomputer.ts` / `geometryHistory.ts` `[OBSERVED]`:**  
   * Tracks entity dependencies and history rollback.
   * *Compatibility:* Forms the functional basis for the single `Construction DAG`.

---

## 11. Open Questions Preservation

1. **`[OPEN QUESTION-01]` Vertex Order & Convexity:**  
   * Auxiliary diagonals connect index vertices $(A, C)$ and $(B, D)$ as declared in the quadrilateral vertex tuple.
   * If the quadrilateral is crossed, diagonals may lie exterior or fail to intersect internally. This is handled gracefully by rejecting intersection without mutating the canon.
2. **`[OPEN QUESTION-02]` Diagonal Intersection Registration:**  
   * Fully preserved as an explicit constructive operation requiring separate command dispatch.
3. **`[OPEN QUESTION-03]` Ptolemy Converse Role:**  
   * Preserved as a derived metric invariant (`VC-14`), evaluated only when both diagonals $AC$ and $BD$ are explicitly constructed.

---

## 12. Self-Audit Checklist

- [x] **Canon strictly preserved (4 concyclic points on 1 circle).**
- [x] **No second GeometryState or local sub-states created.**
- [x] **No second Construction DAG created.**
- [x] **SOL defined strictly as a thin operational bridge.**
- [x] **Geometry Core + Verification Layer confirmed as sole mathematical authority.**
- [x] **Relation Graph confirmed as passive ledger.**
- [x] **No automatic diagonals, intersections, or Ptolemy evaluations.**
- [x] **Construction registration strictly separated from mathematical verification.**
- [x] **`INVALID` and `VANISHED` distinctions preserved from Phase 4.**
- [x] **Open questions (OQ-01, OQ-02, OQ-03) preserved without premature resolution.**
- [x] **Zero production code written.**
