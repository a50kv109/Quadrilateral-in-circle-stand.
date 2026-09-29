# Architectural Decision Records (ADR)

**Status:** Living Architectural Record

This document records the foundational architectural decisions governing Geometry Reasoning Stand 2 (Remix 2). These decisions are immutable constraints for future packages and implementations.

---

## ADR-001 — Remix 2 is Architecturally Independent from Remix 1

* **Status:** ACCEPTED
* **Context:** Remix 1 (`/src`) is a mature, production-grade interactive stand for the cyclic quadrilateral (CQNS-001). However, its codebase contains tight coupling between UI widgets, canvas rendering, and classical theorem evaluations.
* **Decision:** Remix 2 (`/remix2`) is implemented as an independent, clean-slate architecture. It does not import or depend on Remix 1 modules.
* **Reason:** Remix 1 serves as a behavioral and experimental reference benchmark. Rebuilding the kernel independently ensures zero legacy coupling and enables a genuinely universal geometry engine.

---

## ADR-002 — GeometryState is the Single Source of Truth

* **Status:** ACCEPTED
* **Context:** Complex geometry applications often suffer when multiple layers (canvas, relation graphs, math libraries) hold disparate copies of point coordinates.
* **Decision:** `UniversalGeometryState` is the sole source of truth for geometric entities and their canonical parameters. All state updates produce an immutable, versioned snapshot (`stateVersion`).
* **Reason:** Guarantees deterministic state reproducibility and prevents race conditions between UI interaction, construction lineage, and verification passes.

---

## ADR-003 — Construction is not Verification

* **Status:** ACCEPTED
* **Context:** Creating a geometric object (such as a diagonal segment $AC$ or a circle through three points) is an operational construction action. It does not prove that a theorem holds.
* **Decision:** The Construction DAG records parent-child dependencies and operational lineage. It is strictly forbidden from asserting that a theorem or metric invariant is `VERIFIED`.
* **Reason:** Conflating operational existence with deductive mathematical proof breaks formal epistemics.

---

## ADR-004 — Verification Layer is the Epistemic Authority

* **Status:** ACCEPTED
* **Context:** Invariants such as supplementary opposite angles ($\angle A + \angle C = 180^\circ$) or Ptolemy's equality ($AC \cdot BD = AB \cdot CD + BC \cdot DA$) require numerical and symbolic evaluation against defined epsilon tolerances ($\epsilon_{\text{dist}}, \epsilon_{\text{angle}}$).
* **Decision:** `VerificationLayer` is the sole authority permitted to issue epistemic status tags (`VERIFIED`, `DERIVED`, `INVALID`, `VANISHED`).
* **Reason:** Centralizes numerical threshold management ($\epsilon$) and ensures facts in the system have cryptographic/contractual validity.

---

## ADR-005 — Relation Graph is Strictly Passive

* **Status:** ACCEPTED
* **Context:** A graph data structure could easily be tempted to compute line intersections or check circle tangencies on the fly.
* **Decision:** The Relation Graph is a passive storage ledger of facts authorized by Verification. It possesses zero computational authority and never runs math routines.
* **Reason:** Prevents circular dependencies, hidden side-effects, and redundant computation loops.

---

## ADR-006 — Research Layer is Isolated and Read-Only

* **Status:** ACCEPTED
* **Context:** Research modules (such as harmonic spectrum analysis, discrete Fourier transforms on vertex angles, and exploratory invariant discovery) perform speculative mathematical operations.
* **Decision:** The Research Layer operates strictly on read-only snapshots of the state. It cannot write back to `GeometryState` or alter epistemic relation statuses.
* **Reason:** Canonical geometric truth must remain pristine and unpolluted by exploratory research experiments.

---

## ADR-007 — Principle of "No Magic Geometry"

* **Status:** ACCEPTED
* **Context:** In procedural CAD systems, auxiliary geometric primitives are often created implicitly through invisible coordinate injection.
* **Decision:** Every geometric primitive in Remix 2 must have an explicit provenance tag and construction lineage. Entities cannot appear without declared geometric origin.
* **Reason:** Ensures complete auditability and reproducibility of geometric reasoning traces.

---

## ADR-008 — Canonical Order Matters

* **Status:** ACCEPTED
* **Context:** Normalizing a set of circular angles by automatically sorting them in ascending order can destroy the user's declared traversal sequence or polygon vertex labeling ($A \to B \to C \to D$).
* **Decision:** Parametric normalization must preserve the declared input sequence of vertices, tracking wrap-around boundaries explicitly rather than silently sorting.
* **Reason:** Preserves semantic identity of polygon edges and topological orientation.

---

## ADR-009 — UI Interaction Constraints are Not Topology

* **Status:** ACCEPTED
* **Context:** In canvas drag interactions, developers often place UI constraints (such as preventing a mouse pointer from coming within 15px of another point) directly into mathematical validation rules.
* **Decision:** `TopologyGuard` validates pure mathematical topology (non-coincidence, non-degeneracy, collinearity). UI drag thresholds and mouse clamping belong exclusively to the UI/SOL interaction layer.
* **Reason:** Prevents interactive UI ergonomics from artificially constraining mathematical theorem proofs.

---

## ADR-010 — Universal Architecture First, Domain Adapters Second

* **Status:** ACCEPTED
* **Context:** CQNS ($N=4$ cyclic quadrilateral) is the primary target. It would be easy to hardcode four vertices into every kernel class.
* **Decision:** The common kernel (state, topology, mesh, DAG, verification) is designed to handle arbitrary $N$-gons and both Cartesian and Cyclic profiles. Specific polygon behaviors are encapsulated in Domain Profiles and Adapters.
* **Reason:** Enables seamless addition of Triangle ($N=3$), Pentagon ($N=5$), Hexagon ($N=6$), and arbitrary polygons without redesigning the architecture.
