# Geometry Reasoning Stand 2

## Status

🚧 **EXPERIMENTAL / ARCHITECTURE DRAFT**

Geometry Reasoning Stand 2 (Remix 2) is a second-generation architecture for an extensible, universal geometry reasoning and dynamic proof verification environment.

The system is designed to cleanly separate:
- Geometric state representation;
- Structural topology and validation;
- Arc and chord parametric normalization;
- Construction lineage and provenance;
- Passive relational knowledge graphs;
- Authoritative contract verification;
- Experimental harmonic research;
- Domain-specific polygon adaptations;
- User interface presentation and interaction.

The long-term goal of the project is to support multiple geometric domains (triangles, quadrilaterals, pentagons, hexagons, and arbitrary N-gons) via a shared, domain-agnostic kernel.

---

## Initial Target Domain

- **Domain Target:** CQNS — Canonical Cyclic Quadrilateral Normalization Stand
- **Configuration:** $N = 4$ concyclic vertices on a reference circumcircle $S^1$
- **Future Targets (Planned):**
  - Triangle ($N = 3$)
  - General Quadrilateral (Cartesian, $N = 4$)
  - Regular & Inscribed Pentagon ($N = 5$)
  - Hexagon ($N = 6$)
  - Arbitrary Cyclic & Planar $N$-gon

---

## Core Constitutional Principle

> **AGENT MAY BE WRONG. THE STAND MUST NOT.**

The architecture enforces strict separation between:
1. **Mathematical Computation:** Pure arithmetic, coordinate geometry, and Euclidean metric calculations.
2. **Construction:** Operational drafting and lineage tracking of geometric entities.
3. **Verification:** Authoritative, contract-based epistemic truth determination.
4. **Derived Knowledge:** Provenance-backed deductive facts.
5. **Experimental Research:** Isolated, read-only analytical exploration.
6. **User Interface:** Pure projection and interaction capture.

No user interface component, background worker, or AI agent may act as an independent authority of mathematical or epistemic truth.

---

## Remix 1 vs. Remix 2

```text
┌────────────────────────────────────────────────────────┐
│                        REMIX 1                         │
│            Behavioral & Experimental Reference         │
│  - Mature CQNS-001 interactive stand                   │
│  - Classical Euclidean construction tools              │
│  - SOL Gateway operations & visual inspection panels   │
└───────────────────────────┬────────────────────────────┘
                            │  extract & formalize
                            ▼
┌────────────────────────────────────────────────────────┐
│                        REMIX 2                         │
│             Universal Geometry Architecture            │
│  - Decoupled, domain-agnostic Common Kernel            │
│  - Multi-profile support (Cartesian & Cyclic)          │
│  - Extensible N-gon domain adapter framework           │
└────────────────────────────────────────────────────────┘
```

- **Remix 1 (`/src`)**: Serves as the behavioral benchmark and living reference implementation.
- **Remix 2 (`/remix2`)**: A clean-slate, universal architecture developed without legacy coupling.

---

## Documentation Index

The foundational architecture, execution roadmap, and architectural decision records are organized in `/docs`:

* [Architecture Overview (`docs/ARCHITECTURE.md`)](./docs/ARCHITECTURE.md) — Architectural hierarchy, authority models, domain boundaries, and epistemic rules.
* [Project Roadmap (`docs/ROADMAP.md`)](./docs/ROADMAP.md) — Implementation milestones from R2-00 to R2-16 with current factual statuses.
* [Architectural Decisions (`docs/DECISIONS.md`)](./docs/DECISIONS.md) — Architectural Decision Records (ADR-001 through ADR-010).
* [Remix 2 Implementation (`remix2/README.md`)](./remix2/README.md) — Directory layout and package structure of the Remix 2 codebase.

---

## Current Implementation State

| Package | Component | Status |
| :--- | :--- | :--- |
| **R2-00** | Foundation / Skeleton | **IMPLEMENTED** |
| **R2-01** | Universal Geometry State | **IMPLEMENTED** |
| **R2-02** | Domain Profile Contract | **IMPLEMENTED** |
| **R2-03** | Topology & Arc Guard | **REVIEW / CORRECTION REQUIRED** |
| **R2-04** | Universal Arc/Chord Normalizer | **REVIEW / OPEN ISSUE** |
| **R2-05** | Separator Mesh | **PLANNED (NEXT)** |
| **R2-06..16** | Verification, Domain Adapters, UI | **PLANNED** |
