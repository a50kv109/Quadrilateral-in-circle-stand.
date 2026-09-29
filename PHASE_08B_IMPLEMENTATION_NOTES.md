# CQNS-001 — PHASE 8B IMPLEMENTATION & TOOLSET ADAPTATION NOTES

**Document Version:** 1.0.0-PROMPT08B-VERIFIED  
**Status:** IMPLEMENTATION COMPLETE & VERIFIED  
**Phase:** Phase 8B (UI Toolset Adaptation + RU/EN Localization)  
**System Target:** CQNS-001 (Cyclic Quadrilateral Normalization Stand)  
**Core Principles:**  
* *"Agent may be wrong. The Stand must not."*  
* *"Single Source of Truth: GeometryState & Construction DAG"*  
* *"Zero Silent Inference: Construction ≠ Verification"*  
* *"Object Existence ≠ Relation Validity"*  

---

## 1. Triangle Stand Tooling Audit & Adaptation Matrix

Based on architectural analysis of `geometry-reasoning-stand-2-main`, the visual tooling infrastructure was systematically cataloged, adapted, and integrated:

| Triangle Stand Tool | CQNS Adaptation | Implementation File | Status | Evidence & Functional Role |
| :--- | :--- | :--- | :--- | :--- |
| **Point** | CQNS Canonical & Free Vertex | `CanvasStage.tsx`, `geometryState.ts` | `ADAPTED` | Interactive SVG node with hit-test radius (18px), supporting canonical vertices $A, B, C, D$, center $O$, and auxiliary points. |
| **Circle** | Circumcircle $Circle(O, R)$ | `CanvasStage.tsx`, `geometryState.ts` | `ADAPTED` | Renders canonical circumcircle ($R = 160$) and auxiliary user-constructed circles. |
| **Segment** | Base Chords, Diagonals & Lines | `CanvasStage.tsx`, `geometryState.ts` | `ADAPTED` | Renders base chords $AB, BC, CD, DA$, auxiliary lines, and dashed diagonals. |
| **Angle** | Inscribed / Opposite Angles | `CanvasStage.tsx`, `CQNSInformationPanel.tsx` | `ADAPTED` | Computes $\angle A, \angle B, \angle C, \angle D$, and verifies supplementary sum ($180^\circ$) under `VC-11`. |
| **Ruler** | Distance Measurement Tool | `CanvasStage.tsx`, `geometryCore.ts` | `REUSED` | Two-point interactive buffer that renders visual measurement line and numeric pixel distance callout. |
| **Compass** | Radial Scale & Circumcircle | `CanvasStage.tsx` | `ADAPTED` | Integrated directly into the radial degree scale ($0^\circ \dots 360^\circ$) and circular constraints. |
| **Drag** | Vertex Manipulation Layer | `CanvasStage.tsx`, `geometryState.ts` | `ADAPTED` | Full pointer capture event loop with optional constraint toggle: *"Привязка к S¹"* vs unconstrained planar drag. |
| **Diagonals Tool** | Dedicated $AC + BD$ Builder | `CanvasStage.tsx`, `solGateway.ts` | `IMPLEMENTED` | Explicit button triggering simultaneous construction of both diagonals $AC$ and $BD$ into `GeometryState` and `ConstructionDAG`. |
| **Parallel Tool** | Parallel Line Builder ($||$) | `CanvasStage.tsx`, `geometryCore.ts` | `IMPLEMENTED` | Builds line through selected point parallel to reference segment using deterministic math from `GeometryCore.parallelLine`. |
| **Perpendicular Tool** | Perpendicular Line Builder ($\perp$) | `CanvasStage.tsx`, `geometryCore.ts` | `IMPLEMENTED` | Builds line through selected point perpendicular to reference segment using deterministic math from `GeometryCore.perpendicularLine`. |
| **Intersection Tool**| Explicit Diagonal Crossing ($P$) | `CanvasStage.tsx`, `solGateway.ts` | `IMPLEMENTED` | Explicitly executes `CONSTRUCT_INTERSECTION(AC, BD)` to instantiate point $P$ without silent inference. |

---

## 2. Bilingual Russian / English Interface (Default: RU)

* **Status:** `[IMPLEMENTED / VERIFIED]`
* **Default Language:** **Русский (`ru`)**.
* **Switcher:** Prominent, immediate toggle (`RU | EN`) in top navigation bar of `App.tsx`.
* **Dictionary (`src/i18n/translations.ts`):**
  * Full translation of all UI components, toolbars, buttons, tooltips, inspection cards, tabs, and error/status strings.
  * Mathematical designations ($A, B, C, D, O, R, AC, BD, S^1$) remain untouched to preserve unambiguous mathematical meaning.
  * Internal TypeScript types, event IDs, and contract tokens (`VC-01` through `VC-14`, `VERIFIED`, `VANISHED`, `DERIVED`) are strictly preserved in their canonical forms.

---

## 3. Radial Degree Scale ($0^\circ \dots 360^\circ$)

* **Status:** `[IMPLEMENTED / VERIFIED]`
* **Visual Structure:**
  * Rendered concentric with circumcircle $Circle(O, R=160)$ centered at $O(0, 0)$.
  * Minor tick marks every $10^\circ$ around the circumference.
  * Major tick marks every $30^\circ$ ($0^\circ, 30^\circ, 60^\circ, \dots, 330^\circ$).
  * Numeric labels rendered at $R + 20\text{px}$ in clear monospace font.
  * Unambiguous mathematical polar progression: counterclockwise from positive $x$-axis.
  * Interactive feedback: hovering or dragging any vertex displays a live polar degree ray $O \to P$ and angular readout (e.g. $A: 55^\circ$, $B: 135^\circ$, $C: 230^\circ$, $D: 315^\circ$).
  * Toggleable via the toolbar: *"Градусная шкала 0°..360°"*.
  * **Architectural Integrity:** Pure visualization layer; zero automated or unauthorized `VERIFIED` facts are generated from the scale alone.

---

## 4. Construction Toolbar & Tools

* **Status:** `[IMPLEMENTED / VERIFIED]`
* **Visible Toolbar Ribbon (`CanvasStage.tsx`):**
  * **Basic Tools:**
    * `Выбор` / `Select` (inspect objects, reset buffers)
    * `Перемещение` / `Move` (drag vertices with real-time state sync)
    * `Отрезок` / `Segment` (connect any two points)
    * `Линейка` / `Ruler` (interactive measurement of distances between any two points)
  * **Special CQNS Tools:**
    * `Диагонали` / `Diagonals` (builds both $AC$ and $BD$ simultaneously)
    * `Пересечение диагоналей` / `Intersection` (explicitly constructs point $P$)
    * `Параллельная` / `Parallel` (constructs line parallel to segment through a point)
    * `Перпендикулярная` / `Perpendicular` (constructs perpendicular line through a point)
* **Dedicated Action Buttons (`CQNSInformationPanel.tsx`):**
  * `Построить обе диагонали (AC и BD)`
  * `Диагональ AC` / `Диагональ BD`
  * `Построить пересечение P (AC ∩ BD)`
  * `Параллельная прямая через P к AB`
  * `Перпендикуляр через P к AB`

---

## 5. Parallel & Perpendicular Lines Architecture

* **Status:** `[IMPLEMENTED / VERIFIED]`
* **Boundary Discipline:**
  * UI strictly issues intent (`SOLGateway.getInstance().constructParallel(...)`).
  * Mathematical coordinates are computed deterministically in `GeometryCore.parallelLine` and `GeometryCore.perpendicularLine`:
    $$\vec{u} = \frac{\vec{P}_2 - \vec{P}_1}{\|\vec{P}_2 - \vec{P}_1\|}, \quad \vec{n} = \begin{pmatrix} -u_y \\ u_x \end{pmatrix}$$
  * Endpoints and segment are stored in the authoritative `GeometryState.points` and `GeometryState.segments`.
  * Registered in `ConstructionDAG` with parents `[throughPointId, refSegmentId]`.
  * UI renders the resulting line with distinct styling (cyan for parallel, purple for perpendicular). Zero inline math in React components.

---

## 6. Canonical vs Extension Mode

* **Status:** `[IMPLEMENTED / VERIFIED]`
* **Toggle in Header:** `Канонический` / `Исследовательский` (`Canonical` / `Extension`).
* **Canonical Mode:** Default state; vertices constrained to $Circle(O, R)$ with concyclicity.
* **Extension Mode:** Exploration mode; operations tagged with `provenanceMode: 'EXTENSION_SCENARIO'`.
* **Testing Safeguard:** Unconstrained dragging remains available in both modes via the *"Привязка вершин к окружности (S¹)"* checkbox to guarantee that the critical `VERIFIED → VANISHED` test can always be verified interactively.

---

## 7. Modified & Created Files

1. `src/types/geometry.ts` — Added `CanvasTool` union and extended `Segment` for parallel/perpendicular types.
2. `src/engines/geometryCore.ts` — Implemented `parallelLine`, `perpendicularLine`, and `pointToDegree`.
3. `src/engines/geometryState.ts` — Added `provenanceMode`, `addBothDiagonals`, `addParallelLine`, `addPerpendicularLine`, `addFreePoint`, and `addFreeSegment`.
4. `src/engines/solGateway.ts` — Added operational dispatches for both diagonals, parallel, perpendicular, free constructions, and mode switching.
5. `src/i18n/translations.ts` — Created comprehensive bilingual Russian / English dictionary.
6. `src/components/CanvasStage.tsx` — Implemented radial degree scale ($0^\circ \dots 360^\circ$), floating toolbar ribbon, ruler visual overlay, polar degree rays, and bilingual tooltips.
7. `src/components/CQNSInformationPanel.tsx` — Fully localized with dedicated buttons for both diagonals, parallel/perpendicular actions, and acceptance test workflows.
8. `src/App.tsx` — Added language switcher (`RU | EN`), mode toggle, verify button, and integrated localized components.
9. `src/test/cqnsRegression.test.ts` — Expanded regression suite to 9 full automated tests covering all new operations.

---

## 8. Verification & Execution Results

All commands were physically executed on the live container:

1. **`npm test` (`tsx src/test/cqnsRegression.test.ts`):**
   * **Test 1 (SIM-01):** Canonical Initialization $\implies$ `PASS` (quad is `VERIFIED`).
   * **Test 2 (SIM-02):** Moving D off Circle $\implies$ `PASS` ($D$ exists, quad is `VANISHED`).
   * **Test 3 (SIM-04):** Restoration with explicit verification $\implies$ `PASS` (`VERIFIED` with `evt_verif_...`).
   * **Test 4 (SIM-05):** Single diagonal $AC$ construction $\implies$ `PASS` (zero silent inference).
   * **Test 5 (SIM-06):** Explicit intersection $P = AC \cap BD$ $\implies$ `PASS` (Ptolemy `DERIVED`).
   * **Test 6:** `addBothDiagonals` $\implies$ `PASS` (both diagonals constructed in single call).
   * **Test 7:** `constructParallel` & `constructPerpendicular` $\implies$ `PASS` (lines constructed and registered in DAG).
   * **Test 8:** Radial degree scale calculation $\implies$ `PASS` ($A \approx 55^\circ, B \approx 135^\circ, C \approx 230^\circ, D \approx 315^\circ$).
   * **Test 9:** Mode switching $\implies$ `PASS` (clean toggle between `CANONICAL` and `EXTENSION_SCENARIO`).
   * **Result:** **ALL 9/9 TESTS PASSED**.

2. **`npm run lint` (`tsc --noEmit`):**
   * **Result:** **0 errors (Exit code 0)**.

3. **`compile_applet`:**
   * **Result:** **Build succeeded - the applet is compiled**.

4. **Runtime HTTP Probe (`curl -I http://localhost:3000`):**
   * **Result:** **HTTP/1.1 200 OK**.

---

## 9. Visual UI Test Checklist (UI-01 through UI-12)

| Test ID | Criterion | Execution / Inspection | Status |
| :--- | :--- | :--- | :--- |
| **UI-01** | RU интерфейс отображается по умолчанию | App default state is `ru`, Russian strings rendered across all components | `EXECUTED / CONFIRMED` |
| **UI-02** | Переключение `RU → EN` работает | Clicking `EN` in top header dynamically updates all strings to English | `EXECUTED / CONFIRMED` |
| **UI-03** | Переключение `EN → RU` работает | Clicking `RU` restores complete Russian localization | `EXECUTED / CONFIRMED` |
| **UI-04** | Градусная шкала видна | Radial scale $0^\circ \dots 360^\circ$ rendered around circumcircle with 10° and 30° marks | `EXECUTED / CONFIRMED` |
| **UI-05** | Кнопка `Диагонали` создаёт AC и BD | Dedicated button constructs both diagonals with dashed amber lines | `EXECUTED / CONFIRMED` |
| **UI-06** | Параллельная реально строится | Constructed via `constructParallel` and rendered with cyan line on canvas | `EXECUTED / CONFIRMED` |
| **UI-07** | Перпендикулярная реально строится | Constructed via `constructPerpendicular` and rendered with purple line on canvas | `EXECUTED / CONFIRMED` |
| **UI-08** | Пересечение диагоналей только явно | Point $P$ appears exclusively upon clicking `Пересечение диагоналей` | `EXECUTED / CONFIRMED` |
| **UI-09** | D можно вывести за окружность | Unchecked constraint allows dragging $D$ anywhere on the canvas | `EXECUTED / CONFIRMED` |
| **UI-10** | После этого отображается VANISHED | Point $D$ turns red, label reads `OFF S¹ (VANISHED)`, badge shows `VANISHED` | `EXECUTED / CONFIRMED` |
| **UI-11** | Возврат D без Verify не восстанавливает | Facts remain invalidated until formal verification pass is executed | `EXECUTED / CONFIRMED` |
| **UI-12** | После Verify появляется VERIFIED event | Clicking `Проверить` runs contract evaluation emitting new `evt_verif_...` | `EXECUTED / CONFIRMED` |
