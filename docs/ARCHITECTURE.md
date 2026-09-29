# Geometry Reasoning Stand 2 — Architecture

**Status:** Draft / Architecture Blueprint

---

## 1. General Architectural Hierarchy

Geometry Reasoning Stand 2 (Remix 2) is organized into four strictly decoupled horizontal layers:

```text
                      GEOMETRY REASONING STAND 2
                                   │
       ┌───────────────────────────┴───────────────────────────┐
       │                                                       │
 ┌─────▼─────────────────────────┐               ┌─────────────▼─────────────────┐
 │         COMMON KERNEL         │               │         DOMAIN LAYER          │
 │  - Universal Geometry State   │               │  - Cyclic Quad (CQNS N=4)     │
 │  - Domain Profile Contract    │               │  - Triangle Stand (N=3)       │
 │  - Topology Guard             │               │  - Planar Quadrilateral (N=4) │
 │  - Arc / Chord Normalizer     │               │  - Pentagon (N=5)             │
 │  - Separator Mesh (Planned)   │               │  - Hexagon / N-gon (Planned)  │
 │  - Construction DAG (Planned) │               └───────────────────────────────┘
 │  - Relation Graph (Planned)   │                               │
 │  - Verification Core (Planned)│                               │
 │  - SOL Gateway (Planned)      │                               │
 └─────────────┬─────────────────┘                               │
               │                                                 │
       ┌───────┴───────────────────┐                             │
       │                           │                             │
 ┌─────▼─────────────────────┐ ┌───▼─────────────────────────────▼───────────────┐
 │      RESEARCH LAYER       │ │                    UI LAYER                     │
 │  - Harmonic Analysis      │ │  - Canvas Stage & Coordinate Transformation     │
 │  - Invariant Spectrum     │ │  - Interactive Measurement Tools (Ruler, etc.)  │
 │  - Analytical Experiments │ │  - Configuration Passport & Fact Ledger         │
 │  - Isolated Read-Only Bus │ │  - Interactive Workspace Splitter               │
 └───────────────────────────┘ └─────────────────────────────────────────────────┘
```

---

## 2. Authority Model & Architectural Roles

To eliminate circular dependencies and prevent "epistemic drift," every subsystem has a strictly delineated single authority:

| Component | Authority / Responsibility | Epistemic Constraint | Status in R2 |
| :--- | :--- | :--- | :--- |
| **GeometryState** | **Single Source of Truth** for geometric primitives (points, circles, parameters). | Emits immutable state versions; never performs math proofs or theorem validation. | **IMPLEMENTED** |
| **GeometryCore** | **Mathematical Computation Authority** for pure arithmetic, intersections, deviations, and distances. | Pure function library; strictly forbidden from issuing epistemic status tags (VERIFIED, INVALID, etc.). | **IMPLEMENTED (R1) / PLANNED (R2)** |
| **TopologyGuard** | **Structural Integrity Authority** (validating degenerate vertices, collinearity, angular ordering). | Validates structural prerequisites; does not assert mathematical truth or theorem validity. | **REVIEW / CORRECTION REQUIRED** |
| **Arc/Chord Normalizer** | **Parametric Indexing Authority** for angular intervals, wrap-around tracking, and arc/chord metric calculations. | Read-only calculation of arc intervals; does not mutate geometry state. | **REVIEW / OPEN ISSUE** |
| **Separator Mesh** | **Topological Partitioning Authority** dividing planar/circular space into discrete topological sectors. | Pure mesh representation; domain-agnostic. | **PLANNED** |
| **Construction DAG** | **Lineage & Provenance Authority** tracking parent-child generation history (e.g. classical straightedge & compass steps). | Lineage tracking only; construction existence does NOT establish mathematical validity. | **PLANNED** |
| **Relation Graph** | **Passive Knowledge Store** holding verified facts, assertions, dependencies, and invalidation traces. | Passive storage ledger; must NEVER independently calculate coordinates or assert truth. | **PLANNED** |
| **Verification Layer** | **Epistemic Authority** executing formal contracts against epsilon tolerances. | The **ONLY** entity authorized to emit `VERIFIED`, `DERIVED`, `INVALID`, or `VANISHED`. | **PLANNED** |
| **Passport / Evidence** | **Epistemic Snapshot Projection** capturing the exact state of verified facts and system provenance. | Pure projection of the state and relation ledger; zero state mutations. | **PLANNED** |
| **SOL Gateway** | **Operational Bridge** translating agent and UI operations into validated state transitions. | Dispatches commands to state and requests formal verification; zero theorem generation. | **PLANNED** |
| **Research Layer** | **Experimental Analytical Sandbox** (harmonic spectrum, discrete Fourier analysis, invariant discovery). | Strictly read-only; completely isolated from the canonical verification pipeline. | **PLANNED** |
| **User Interface (UI)** | **Presentation & Interaction Layer** (SVG canvas, inspection cards, statistics, splitters). | Pure consumer of state and verification evaluations; strictly forbidden from independent mathematical truth assertions. | **PLANNED** |

---

## 3. Core Constitutional Principles

### A. The Epistemic Invariance Rules
* **Construction ≠ Verification:** Constructing a line or intersection in the DAG does not mean a geometric theorem holds. Verification must explicitly evaluate contracts against numerical tolerances.
* **Object Existence ≠ Relation Validity:** An entity (e.g., vertex $D$) may exist in `GeometryState`, while its relational fact (e.g., concyclicity $D \in \text{Circle}$) has transitioned to `VANISHED`.
* **Relation Graph ≠ Computation Engine:** The graph is a passive ledger of facts authorized by Verification. It never calculates distances or checks intersection formulas.
* **Research ≠ Canonical Truth:** Experimental analytics in the Research Layer run on state snapshots and cannot inject or overwrite canonical facts.
* **UI ≠ Mathematical Authority:** The UI renders what the kernel provides. No UI component may compute geometry independently.
* **The Prime Axiom:**
  > **AGENT MAY BE WRONG. THE STAND MUST NOT.**

### B. Principle of "No Magic Geometry"
Geometry must arise strictly through declared, explicit geometric operations:
- Coordinate injection without provenance is strictly rejected.
- When an object is created, its origin (`CANONICAL`, `AUXILIARY`, `CONSTRUCTION`, etc.) and parent lineage must be recorded in the state.
- Auxiliary elements (e.g. diagonals $AC, BD$) are never synthesized automatically unless explicitly constructed by the user or an authoritative procedural step.

---

## 4. Epistemic Status Lifecycle

The verification framework categorizes all facts into six distinct epistemic states:

```text
       ┌───────────────┐
       │     GIVEN     │ (Axiomatic inputs / Canonical basis)
       └───────┬───────┘
               │
               ▼
       ┌───────────────┐        Contract passes
       │   VERIFIED    ├──────────────────────────────┐
       └───────┬───────┘                              │
               │                                      ▼
               │ Prerequisite lost             ┌───────────────┐
               ├──────────────────────────────►│    DERIVED    │ (Deductive theorems)
               │ (e.g. vertex dragged off S¹)  └───────┬───────┘
               ▼                                      │
       ┌───────────────┐                              │ Prerequisite lost
       │   VANISHED    │◄─────────────────────────────┘
       └───────┬───────┘
               │
               ▼
       ┌───────────────┐
       │    INVALID    │ (Predicate actively evaluated and violated)
       └───────────────┘
```

* **GIVEN:** Axiomatic, canonical baseline primitives defined by the domain contract.
* **HYPOTHESIS:** Proposed relation pending formal verification pass.
* **VERIFIED:** Relation explicitly evaluated by `VerificationLayer` against epsilon tolerances ($\epsilon_{\text{dist}}, \epsilon_{\text{angle}}$) and confirmed to hold.
* **DERIVED:** Fact inferred deductively from existing `VERIFIED` premises via an authorized theorem contract.
* **INVALID:** Actively checked predicate that numerically fails to meet tolerance.
* **VANISHED:** A previously established relation whose prerequisite dependencies were invalidated or modified (e.g., moving a vertex off the circumcircle causes concyclicity and derived opposite angle theorems to vanish).
  * **Crucial distinction:** `VANISHED` is **NOT** equivalent to `FALSE` or non-existence; the primitive entity remains alive in memory, but its relational contract is suspended.

---

## 5. Domain Profiles vs. Dedicated Stand Engines

In Remix 1, cyclic quadrilateral handling was tightly intertwined with the stand implementation. In Remix 2, domain behaviors are represented as **Domain Profiles**:

1. **`CARTESIAN` Profile:**
   - Primitives: Explicit vertex list $[V_0, V_1, \dots, V_{n-1}]$ with $(x, y) \in \mathbb{R}^2$.
   - Requirements: $n \ge 3$, finite coordinates, non-coincidence.
2. **`CYCLIC` Profile:**
   - Primitives: A reference circle $\odot(O, R)$ and angular positions $[\theta_0, \theta_1, \dots, \theta_{n-1}]$ along $S^1$.
   - Cartesian coordinates are derived analytically: $(O_x + R \cos\theta_i, O_y + R \sin\theta_i)$.

The Common Kernel operates over both profiles uniformly. Introducing a new polygon domain ($N=3, 5, 6$) requires only a Domain Adapter, not a rewritten kernel.

---

## 6. CQNS Canonical Domain Model ($N = 4$)

The primary domain target for Remix 2 is CQNS (Cyclic Quadrilateral Normalization Stand):

```text
Reference Circle: Circle(O, R)

Vertices:
  A = (R cos θ_A, R sin θ_A)
  B = (R cos θ_B, R sin θ_B)
  C = (R cos θ_C, R sin θ_C)
  D = (R cos θ_D, R sin θ_D)

Chords:
  seg_AB, seg_BC, seg_CD, seg_DA

Polygon:
  quad_ABCD
```

**Domain Boundaries:**
- The canonical model does **NOT** assume diagonals $AC$ or $BD$ exist at initialization.
- The canonical model does **NOT** assume intersection point $P = AC \cap BD$ exists.
- Ptolemy's Theorem is a metric invariant evaluated only when auxiliary diagonals are constructed, **NOT** the foundational definition of cyclicity (concyclicity $A, B, C, D \in S^1$ is foundational).
- This model is CQNS-specific and does not impose $N=4$ constraints on the Universal Kernel.
