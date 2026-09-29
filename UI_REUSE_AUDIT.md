# CQNS-001 — TRIANGLE STAND UI REUSE AUDIT REPORT

**Document Version:** 1.0.0-PROMPT02-UI-AUDIT  
**Audit Scope:** Graphical UI, Interaction Layer, Rendering Canvas, Tools, and Inspection Panels of `geometry-reasoning-stand-2` vs `CQNS-001` Target Requirements  
**Status:** AUDIT COMPLETE — AWAITING EXTERNAL HUMAN REVIEW  
**Guiding Architectural Invariant:**  
> *"UI is an interaction and visualization layer over GeometryState. UI is NOT a geometry calculator, NOT a verification engine, and NOT a second GeometryState."*

---

## 1. Existing Visual Architecture

The visual architecture of the existing Geometry Reasoning Stand (`geometry-reasoning-stand-2`) is organized as a modular, decoupled React/SVG visualization stack:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            APP SHELL (src/App.tsx)                          │
│  - Mode Switcher (School Mode / Research Mode / Textbook / Benchmark)       │
│  - WorkspaceSplitter (Resizable Canvas on Left, Inspection Panels on Right) │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
            ┌──────────────────────────┴──────────────────────────┐
            ▼                                                     ▼
┌──────────────────────────────────────┐  ┌───────────────────────────────────┐
│     CANVAS STAGE (src/components/)   │  │   INSPECTION & KNOWLEDGE PANELS   │
│  - CanvasStage.tsx                   │  │  - TriangleStateTable.tsx (3-pt)  │
│  - Coordinate System & Viewport Pan  │  │  - ArcChordTable.tsx (Angles)     │
│  - Interactive SVG Primitive Render  │  │  - RelationMap.tsx (Graph Vis)    │
│  - Selection / Drag Interaction Layer│  │  - ResearchObservationPanel.tsx   │
│  - Ruler & Compass Visual Overlays   │  │  - SchoolContextPanel.tsx         │
└──────────────────┬───────────────────┘  └─────────────────┬─────────────────┘
                   │ (Dispatches User Actions)              │ (Reads Facts & State)
                   ▼                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       CENTRALIZED STATE & ENGINES                           │
│  - GeometryState (Single Source of Truth for coordinates and primitives)    │
│  - ConstructionCore (Constructive operations: circles, chords, midpoints)    │
│  - Geometry Core & Invariants (Deterministic verification & observations)   │
│  - Relation Graph / Research Graph (Passive epistemic ledger)               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Inventory & Classification

Each UI component from the existing stand is classified into one of four architectural categories:
* **`REUSABLE`**: Fully generic, independent of polygon vertex count; directly portable to CQNS-001 without modification.
* **`REUSABLE WITH ADAPTATION`**: Generic underlying rendering/tooling infrastructure, but requires parameter or interface extension to support 4 vertices ($A, B, C, D$) and diagonals ($AC, BD$).
* **`TRIANGLE-SPECIFIC`**: Hardcoded assumption of 3 vertices, 3 sides, or Thales 3-point sub-theorems; to be replaced by specialized Cyclic Quadrilateral inspection cards.
* **`UNKNOWN / INSUFFICIENT EVIDENCE`**: Lacks sufficient implementation detail in source code.

---

### Detailed Component Inventory Table

| Component | Source File | Current Responsibility | Dependencies | Triangle Coupling | CQNS Reuse Status | Required Adaptation | Risk Level |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`CanvasStage`** | `src/components/CanvasStage.tsx` | Core SVG/Canvas rendering, zoom/pan transform, grid rendering, hover/selection highlights, drag-and-drop event loop. | `GeometryState`, `types.ts` | **None (Pure Generic)** | **`REUSABLE`** | None for core canvas. Supports arbitrary points, circles, and segments. | Low |
| **`Point Tool & Drag`** | `src/components/CanvasStage.tsx` | Interactive point placement and pointer dragging on the Euclidean plane or circumcircle perimeter $S^1$. | `geometryState.ts` (`updatePoint`) | **None** | **`REUSABLE`** | Point drag handler supports any point ID (`A`, `B`, `C`, `D`, `O`). | Low |
| **`Circle Tool / Compass`**| `src/components/CanvasStage.tsx` | Visual circle drawing, circumcircle rendering from center $O$ or 3 points, radius dragging. | `constructionCore.ts` | **None** | **`REUSABLE`** | None. Canonical circle $\mathcal{C}(O, R)$ rendering is identical. | Low |
| **`Segment / Chord Tool`**| `src/components/CanvasStage.tsx` | Interactive segment creation connecting any two clicked points ($P_1, P_2$). | `geometryState.ts`, `constructionCore.ts` | **None** | **`REUSABLE`** | Can construct sides $AB, BC, CD, DA$ and diagonals $AC, BD$ transparently. | Low |
| **`Angle Tool & Markers`**| `src/components/CanvasStage.tsx` | Renders angle sector arcs, right-angle markers ($90^\circ$), angular labels. | `geometryState.ts`, `units.ts` | **None** | **`REUSABLE WITH ADAPTATION`** | Generalize angle arc rendering to 4 cyclic vertices ($\angle A, \angle B, \angle C, \angle D$). | Low |
| **`Ruler / Measurement`** | `src/components/CanvasStage.tsx` | Real-time Euclidean distance indicator between any two selected points. | `geometryState.ts` | **None** | **`REUSABLE`** | Usable for arbitrary chord and diagonal length readout. | Low |
| **`WorkspaceSplitter`** | `src/components/layout/WorkspaceSplitter.tsx` | Drag-to-resize split view separating canvas from right-side inspection panels. | React DOM | **None** | **`REUSABLE`** | None. Generic layout container. | Zero |
| **`RelationMap`** | `src/components/RelationMap.tsx` | Interactive node-link visual graph of verified relations and hypotheses. | `researchGraph.ts` | **None** | **`REUSABLE WITH ADAPTATION`** | Adapt node type styling for cyclic quadrilateral relation tokens. | Low |
| **`ArcChordTable`** | `src/components/ArcChordTable.tsx` | Tabular display of arc lengths, subtended angles, chord lengths, and concyclic metrics. | `geometryState.ts`, `invariants.ts` | **Low** | **`REUSABLE WITH ADAPTATION`** | Expand table rows from 3 arcs/chords to 4 base chords ($AB, BC, CD, DA$) + 2 diagonals ($AC, BD$). | Low |
| **`SchoolToolbar`** | `src/components/school/SchoolToolbar.tsx` | Tool selection bar (`Select`, `Point`, `Segment`, `Circle`, `Angle`, `Compass`, `Ruler`, `Undo/Redo`). | `types.ts` | **None** | **`REUSABLE`** | Add explicit `Add Diagonal` constructive action button. | Low |
| **`SchoolObjectInventory`**| `src/components/school/SchoolObjectInventory.tsx`| Tree list of active points, segments, circles, and angles registered in `GeometryState`. | `geometryState.ts` | **None** | **`REUSABLE`** | Display 4 vertices and quadrilateral object grouping. | Low |
| **`TriangleStateTable`** | `src/components/TriangleStateTable.tsx` | Tabular readout of $(A, B, C)$ angles, Thales status, orthocenter/circumcenter coords. | `geometryState.ts`, `invariants.ts` | **HIGH (Hardcoded 3 points)** | **`TRIANGLE-SPECIFIC`** | **Replace** with `CyclicQuadrilateralStateTable` ($A, B, C, D$, opposite angle sums, Ptolemy). | Medium |
| **`thalesCardTemplate`** | `src/presentation/templates/thalesCardTemplate.ts` | Educational proof card template for right triangles inscribed in semicircles. | `types.ts` | **HIGH (Thales 3-pt)** | **`TRIANGLE-SPECIFIC`** | **Isolate/Archive**. Create `cyclicQuadCardTemplate` for CQNS-001. | Low |
| **`TopologicalClassCard`**| `src/components/TopologicalClassCard.tsx`| Classification card showing acute/right/obtuse triangle topology. | `invariants.ts` | **HIGH (Triangle only)** | **`TRIANGLE-SPECIFIC`** | **Replace** with `ConvexityClassCard` (Cyclic vs crossed vs degenerate). | Medium |
| **`ResearchObservationPanel`**| `src/components/research/ResearchObservationPanel.tsx`| Stream of real-time verified observations from `Geometry Core`. | `observationModel.ts`, `researchGraph.ts` | **None** | **`REUSABLE`** | Pure event consumer. Automatically displays verified CQNS observations. | Low |

---

## 3. Deep Architectural Analysis of Existing Generic Subsystems

### 3.1 Coordinate System & Rendering Architecture `[OBSERVED]`
* **Implementation:** `CanvasStage.tsx` uses an SVG/Canvas viewport with standard affine transform matrix:
  $$\begin{pmatrix} x_{\text{screen}} \\ y_{\text{screen}} \end{pmatrix} = \begin{pmatrix} s & 0 \\ 0 & -s \end{pmatrix} \begin{pmatrix} x_{\text{world}} \\ y_{\text{world}} \end{pmatrix} + \begin{pmatrix} t_x \\ t_y \end{pmatrix}$$
* **Geometry Independence:** The rendering pipeline maps arbitrary point tuples $(x, y) \in \mathbb{R}^2$ from `GeometryState.points` to screen SVG elements (`<circle>`, `<line>`, `<path>`, `<text>`).
* **Verdict:** 100% generic. No assumptions regarding the number of points or shapes exist in the rendering engine itself.

### 3.2 Interaction & Selection Engine `[OBSERVED]`
* **Pointer Event Dispatcher:** Handles `onPointerDown`, `onPointerMove`, `onPointerUp` with hit-testing tolerance ($r_{\text{hit}} \approx 8\text{px}$).
* **Drag-on-Circle Constraint:** When dragging a point with constraint `point_on_circle`, the position update computes:
  $$\theta = \text{atan2}(y_{\text{cursor}} - y_O, x_{\text{cursor}} - x_O), \quad P_{\text{new}} = (x_O + R\cos\theta, y_O + R\sin\theta)$$
* **Verdict:** Fully supports 4 independent concyclic vertices ($A, B, C, D$) sliding continuously along $S^1$.

### 3.3 Tool Architecture `[OBSERVED]`
* **Tool State Machine:** The active tool (`activeTool: 'select' | 'point' | 'segment' | 'circle' | 'ruler' | 'angle'`) operates via a generic two-click accumulation buffer:
  * Click 1: Select/create $P_1$.
  * Click 2: Select/create $P_2 \implies$ invoke `constructionCore.addSegment(P1, P2)`.
* **Verdict:** Constructing base quadrilateral sides ($AB, BC, CD, DA$) and diagonals ($AC, BD$) is already natively supported by the existing tool state machine.

---

## 4. Triangle-Specific Couplings & Required Adaptations

### 4.1 What Must Be Replaced (Domain-Specific Inspection UI)
1. **`TriangleStateTable.tsx` $\to$ `CyclicQuadrilateralStateTable.tsx`:**
   * *Old (Triangle):* Displayed sides $a, b, c$, angles $\alpha, \beta, \gamma$, and circumcenter $O$.
   * *Target (CQNS-001):*
     * 4 Vertex Coordinates & Polar Angles: $(\theta_A, \theta_B, \theta_C, \theta_D)$ on $\mathcal{C}(O, R)$.
     * 4 Base Chords: $\|AB\|, \|BC\|, \|CD\|, \|DA\|$.
     * 2 Diagonals: $\|AC\|, \|BD\|$ (with constructive registration indicator).
     * 4 Inscribed Angles: $\angle A, \angle B, \angle C, \angle D$.
     * Opposite Angle Invariant Check: $\angle A + \angle C = 180^\circ$ and $\angle B + \angle D = 180^\circ$.
     * Ptolemy Metric Monitor: $\|AC\|\cdot\|BD\| \stackrel{?}{=} \|AB\|\cdot\|CD\| + \|BC\|\cdot\|AD\|$.
2. **`TopologicalClassCard.tsx` $\to$ `QuadrilateralTopologyCard.tsx`:**
   * *Old (Triangle):* Acute / Right / Obtuse / Degenerate classification.
   * *Target (CQNS-001):* Convex Cyclic / Self-Intersecting (Crossed) / Degenerate Coincident.
3. **`thalesCardTemplate.ts` $\to$ `inscribedQuadCardTemplate.ts`:**
   * Specialized proof card focusing on the Cyclic Quadrilateral theorem rather than the 3-point Thales semicircle theorem.

### 4.2 What Remains Untouched (Core Infrastructure)
* The entire canvas rendering engine (`CanvasStage.tsx`).
* The workspace layout and splitters (`WorkspaceSplitter.tsx`).
* The interactive measurement tools (Ruler, Compass, Angle selector).
* The command execution bridge and observation stream (`ResearchObservationPanel.tsx`).
* The unified `GeometryState` and `ConstructionCore` foundation.

---

## 5. Architectural Safeguards (Preserving Boundaries)

To guarantee that the UI reuse does not compromise the CQNS-001 architectural invariants established in Phases 0–2:

1. **Zero Math in UI:** UI components must **never** calculate Ptolemy sums, angle sums, or concyclicity truth values. They merely format and display verified properties passed down from the `Geometry Core` and `Relation Graph`.
2. **No Secondary Geometry States:** The UI must bind directly to the single authoritative `GeometryState`. No private point arrays or shadow states are permitted in React component local state.
3. **Explicit Construction Commands:** Constructing a diagonal ($AC$ or $BD$) in the UI dispatches an explicit constructive action `ADD_DIAGONAL(A, C)` to `ConstructionCore`, registering the edge in the Construction DAG before visual rendering.

---

## 6. Files Requiring Future Modification / Specialization

```
src/
├── components/
│   ├── CanvasStage.tsx                     [REUSE] (No core changes; render polygon fill if quad exists)
│   ├── CyclicQuadrilateralStateTable.tsx   [NEW - SPECIALIZATION] (Replaces TriangleStateTable.tsx)
│   ├── QuadrilateralTopologyCard.tsx       [NEW - SPECIALIZATION] (Replaces TopologicalClassCard.tsx)
│   ├── ArcChordTable.tsx                   [ADAPT] (Expand 3 chords -> 4 chords + 2 diagonals)
│   ├── RelationMap.tsx                     [REUSE] (Render CQNS relation node colors)
│   ├── school/
│   │   ├── SchoolToolbar.tsx               [ADAPT] (Add 'Add Diagonal' preset button)
│   │   └── SchoolObjectInventory.tsx       [REUSE] (Display 4 points & quad group)
│   └── research/
│       └── ResearchObservationPanel.tsx    [REUSE] (Display verified CQNS observations)
└── presentation/
    └── templates/
        └── cyclicQuadCardTemplate.ts       [NEW] (Replaces thalesCardTemplate.ts)
```

---

## 7. Recommended Reuse Strategy

$$\mathbf{REUSE\ WITH\ ADAPTATION}$$

### Strategy Steps:
1. **Preserve the Visual Core:** Re-use 100% of the existing `CanvasStage`, coordinate transformations, drag-and-drop mechanics, ruler, compass, and tool state machines.
2. **Swap Domain Inspection Panels:** Replace the 3-point `TriangleStateTable` and `TopologicalClassCard` with specialized `CyclicQuadrilateralStateTable` and `QuadrilateralTopologyCard`.
3. **Connect to CQNS Core:** Bind the UI inspection panels to the new CQNS-001 `Geometry Core` and `Relation Graph` (Phases 3–4).

---

## 8. Final Audit Verdict

```text
UI REUSE STATUS:
HIGH (Core visual engine, canvas, and tools are completely generic and directly reusable).

RECOMMENDED STRATEGY:
REUSE WITH ADAPTATION (Preserve visual canvas and tool engine; swap domain-specific triangle inspection cards for quadrilateral cards).

ARCHITECTURAL INVARIANTS:
PRESERVED (Single GeometryState maintained; UI remains strictly passive visualization without mathematical authority).

PHASE 3 READINESS:
READY (UI reuse plan is clarified and isolated; project is ready for PROMPT_03 — Verification Contracts).

STOP.
WAIT FOR HUMAN AUDIT.
```
