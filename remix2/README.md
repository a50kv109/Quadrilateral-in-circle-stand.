# Remix 2 Implementation

This directory contains the second-generation implementation of the **Geometry Reasoning Stand** universal architecture.

The codebase is intentionally decoupled from the legacy Remix 1 application (`/src`) to establish a clean, domain-agnostic foundation.

---

## Directory Layout

```text
remix2/
├── index.html            # Standalone Vite HTML entry point for Remix 2
├── vite.config.ts        # Dedicated build & dev server configuration
├── tsconfig.json         # Strict TypeScript configuration
├── src/
│   ├── index.ts          # Core entry point & version export
│   ├── kernel/           # Domain-agnostic common kernel
│   │   ├── state/        # R2-01: UniversalGeometryState
│   │   ├── topology/     # R2-03: TopologyGuard
│   │   └── arcChordNormalizer.ts # R2-04: ArcChordNormalizer
│   ├── domains/          # Domain adapter layer (CQNS N=4, Triangle, etc.)
│   ├── research/         # Isolated research sandbox (harmonic/Zebra analysis)
│   ├── types/            # Discriminated union type definitions
│   └── ui/               # Presentation layer & canvas components
└── tests/                # Standalone test runner suites (tsx)
```

---

## Current Implemented Packages

* **R2-00 Foundation (`src/index.ts`, `tests/foundation.test.ts`):** Skeleton, exports, and verification test harness.
* **R2-01 Universal Geometry State (`src/kernel/state/`, `tests/geometryState.test.ts`):** Immutable versioned state store, deep freezing, provenance, and lineage tracking.
* **R2-02 Domain Profile Contract (`src/types/geometry.ts`, `tests/domainProfiles.test.ts`):** Strict discriminated union support for `CARTESIAN` and `CYCLIC` profiles.
* **R2-03 Topology & Arc Guard (`src/kernel/topology/`, `tests/topologyGuard.test.ts`):** Structural integrity checking for both Cyclic and Cartesian inputs.
* **R2-04 Arc/Chord Normalizer (`src/kernel/arcChordNormalizer.ts`, `tests/arcChordNormalizer.test.ts`):** Parametric normalization of angular circular intervals.

---

## Next Milestone

* **R2-05 Separator Mesh:** Universal topological partition mesh for planar and circular domains.

---

## Standalone Commands

```bash
# Run all Remix 2 test suites
npm run test:r2

# Run TypeScript type check on Remix 2
npm run lint:r2

# Build standalone Remix 2 bundle
npm run build:r2
```
