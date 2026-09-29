# Remix 2 Architectural Roadmap

**Status:** Draft / Active Development Plan

---

## 1. Status Legend

* **IMPLEMENTED:** Fully coded in `remix2/src` with passing unit tests in `remix2/tests`.
* **REVIEW / CORRECTION REQUIRED:** Implemented in codebase, but flagged for architectural decoupling or contractual review.
* **REVIEW / OPEN ISSUE:** Implemented in codebase, with a known failing test case or open architectural gap documented below.
* **PLANNED:** Formalized in architectural specification; implementation not yet started.

---

## 2. Package Roadmap Matrix

| Package ID | Component Name | Factual Status | Files / Tests |
| :--- | :--- | :--- | :--- |
| **R2-00** | **Foundation / Project Skeleton** | **IMPLEMENTED** | `remix2/src/index.ts`<br>`remix2/tests/foundation.test.ts` |
| **R2-01** | **Universal Geometry State** | **IMPLEMENTED** | `remix2/src/kernel/state/geometryState.ts`<br>`remix2/tests/geometryState.test.ts` |
| **R2-02** | **Domain Profile Contract** | **IMPLEMENTED** | `remix2/src/types/geometry.ts`<br>`remix2/tests/domainProfiles.test.ts` |
| **R2-03** | **Topology & Arc Guard** | **REVIEW / CORRECTION REQUIRED** | `remix2/src/kernel/topology/topologyGuard.ts`<br>`remix2/tests/topologyGuard.test.ts` |
| **R2-04** | **Universal Arc/Chord Normalizer** | **REVIEW / OPEN ISSUE** | `remix2/src/kernel/arcChordNormalizer.ts`<br>`remix2/tests/arcChordNormalizer.test.ts` |
| **R2-05** | **Separator Mesh** | **PLANNED (NEXT)** | To be implemented in `remix2/src/kernel/mesh` |
| **R2-06** | **Construction DAG / Lineage** | **PLANNED** | To be implemented in `remix2/src/kernel/dag` |
| **R2-07** | **Relation Graph** | **PLANNED** | To be implemented in `remix2/src/kernel/relations` |
| **R2-08** | **Verification Core** | **PLANNED** | To be implemented in `remix2/src/kernel/verification` |
| **R2-09** | **Verification Rule Registry** | **PLANNED** | Classical theorems (VC-01..VC-14, Ptolemy, etc.) |
| **R2-10** | **CQNS N=4 Domain Adapter** | **PLANNED** | Placeholder exists in `remix2/src/domains/index.ts` |
| **R2-11** | **Passport / Evidence Snapshot** | **PLANNED** | Projection over Verification & State |
| **R2-12** | **SOL Gateway** | **PLANNED** | Operational command pipeline for Remix 2 |
| **R2-13** | **Research Layer (Harmonic/Zebra)** | **PLANNED** | Placeholder exists in `remix2/src/research/index.ts` |
| **R2-14** | **Common UI Shell** | **PLANNED** | Placeholder exists in `remix2/src/ui/index.ts` |
| **R2-15** | **CQNS N=4 Visual Stand UI** | **PLANNED** | SVG Canvas Stage & Inspection Panels |
| **R2-16** | **Integration / Regression Suite** | **PLANNED** | Full end-to-end multi-domain test suite |

---

## 3. Discovered Gaps & Open Issues in Current Codebase

During the pre-publication audit, the following factual gaps were documented directly from test execution (`npm run test:r2`):

### Issue GAP-R2-03 (TopologyGuard vs UI Interaction Decoupling)
- **Status:** CORRECTION REQUIRED
- **Detail:** In `remix2/src/kernel/topology/topologyGuard.ts`, angular gap checks and cyclic wrap-around validation operate effectively, but the boundary between mathematical topology rules (e.g. non-coincidence, non-degeneracy) and interactive UI constraints (e.g. minimum mouse drag distances) requires clean decoupling as mandated by `ADR-009`.

### Issue GAP-R2-04 (ArcChordNormalizer Order Validation)
- **Status:** OPEN ISSUE / TEST FAILURE
- **Detail:** In `remix2/tests/arcChordNormalizer.test.ts`, test `TEST-D` fails with:
  ```text
  AssertionError: Expected values to be strictly equal:
  + actual: 'DEGENERATE'
  - expected: 'SUCCESS'
  ```
  Input angles `[200, 20, 100, 300]` represent a multi-loop self-intersecting circular sequence (sum of positive arc steps $= 180° + 80° + 200° + 260° = 720° = 4\pi$). The current normalizer implementation treats any sequence whose arc sum deviates from $2\pi$ as `DEGENERATE`, whereas `TEST-D` expected a non-monotonic sequence to be processed with `SUCCESS`.
- **Action:** Code is preserved without ad-hoc modification. This contract will be resolved during the R2-04/R2-05 consolidation phase.

---

## 4. Next Implementation Step

The immediate architectural milestone is **R2-05 Separator Mesh**:
- Design a generic topological partition mesh supporting planar and circular regions.
- Ensure the separator mesh remains domain-agnostic before constructing polygon-specific adapters.
- Do not jump directly to UI or new domains until the foundational mesh and DAG are verified.
