# CQNS-001 — PHASE 8C IMPLEMENTATION NOTES

**Document Version:** 1.0.0-PROMPT08C-VERIFIED  
**Status:** IMPLEMENTATION COMPLETE & VERIFIED  
**Phase:** Phase 8C (Dynamic Parallel/Perpendicular + School / Research Modes)  
**System Target:** CQNS-001 (Cyclic Quadrilateral Normalization Stand)  
**Mathematical & Architectural Authority:**  
* *"Single Source of Truth: GeometryState & Construction DAG"*  
* *"Zero Silent Inference: Construction ≠ Verification"*  
* *"Pure Mathematics: GeometryCore is the sole arithmetic authority"*  
* *"Epistemic Integrity: VerificationLayer mints status; RelationGraph remains passive"*  

---

## 1. Summary of Delivered Features

Pursuant to **PROMPT_08C**, two incomplete mechanisms of the CQNS-001 stand have been fully implemented and verified without altering the core architecture:

1. **Dynamic (Parametric) Parallel & Perpendicular Constructions:**
   * Lines constructed via `PARALLEL(refSeg, throughPt)` and `PERPENDICULAR(refSeg, throughPt)` are no longer static snapshots.
   * They are dynamically coupled to their parent entities in `GeometryState.dependentLines` and `ConstructionDAG`.
   * When any parent vertex ($A, B, C, D$) or through point ($P$) moves, `GeometryState.recomputeDependentConstructions` automatically re-evaluates the line endpoints via `GeometryCore.parallelLine` and `GeometryCore.perpendicularLine`.
   * Similarly, the diagonal intersection point $P = AC \cap BD$ is dynamically coupled in `GeometryState.dependentIntersections`. When vertices $A, B, C, D$ move, $P$ recomputes in real time via `GeometryCore.segmentIntersection` / `GeometryCore.lineIntersection`, and downstream lines passing through $P$ update simultaneously.

2. **Explicit School vs Research Vertex Modes:**
   * **🎓 Школьный режим (School Mode):**
     * Vertices $A, B, C, D$ are strictly constrained to the circumcircle $S^1$ ($x^2 + y^2 = R^2, R=160$).
     * Dragging any vertex slides it smoothly along the circumference.
     * Concyclicity is strictly preserved; epistemic status remains `VERIFIED`; opposite angle sums remain $180^\circ$; Ptolemy invariant holds.
   * **🔬 Исследовательский режим (Research Mode):**
     * Vertices can be dragged freely across the Euclidean plane $\mathbb{R}^2$ without $S^1$ snapping.
     * Dragging vertex $D$ off the circle immediately falsifies the prerequisite: status transitions from `VERIFIED` to `VANISHED`.
     * Bringing $D$ back and requesting verification triggers formal 4-step restoration with newly issued verification event tokens.
   * **UI Integration:**
     * Prominent dual-mode segmented switcher in top application header (`App.tsx`).
     * Direct toggle badge in canvas controls ribbon (`CanvasStage.tsx`).
     * Real-time mode indicators in `CQNSInformationPanel.tsx`.

3. **Interactive Canvas Improvements:**
   * Individual base chords ($AB, BC, CD, DA$) and diagonals ($AC, BD$) feature transparent hit-test buffers for selection.
   * Active reference segment is highlighted with a cyan halo.
   * Bidirectional workflow for Parallel and Perpendicular tools (click segment then point, or click point then segment).
   * Intersection point $P$ is fully interactive (clickable as through point, selectable, hoverable).

---

## 2. Mathematical Formalism & Dependency Lineage

### 2.1 Dynamic Recomputation Pipeline

$$\begin{matrix}
\text{MOVE}(A \text{ or } B) \\
\downarrow \\
\text{GeometryState.updatePoint}(ptId, x, y) \\
\downarrow \\
\text{recomputeDependentConstructions}() \\
\swarrow \qquad\qquad \searrow \\
\text{Step 1: Intersections } P = AC \cap BD \qquad & \text{Step 2: Lines } L \parallel AB \text{ and } L \perp BC \\
(GeometryCore.segmentIntersection) & (GeometryCore.parallelLine / perpendicularLine) \\
\searrow \qquad\qquad \swarrow \\
\text{Points \& Segments in GeometryState updated} \\
\downarrow \\
\text{GeometryState.notify}(eventId) \\
\downarrow \\
\text{VerificationLayer.evaluateAll}() \implies \text{RelationGraph.updateLedger}()
\end{matrix}$$

### 2.2 School Mode Constraint

For any dragged vertex $V \in \{A, B, C, D\}$ with cursor position $(x, y)$:
$$\theta = \operatorname{atan2}(y - y_O, x - x_O)$$
$$x_{\text{constrained}} = x_O + R \cdot \cos\theta, \quad y_{\text{constrained}} = y_O + R \cdot \sin\theta$$
$$\implies \|V - O\| = R \equiv 160\text{px} \quad (\text{Deviation } \Delta = 0)$$

---

## 3. Automated Regression & Acceptance Test Results

All 12 automated tests in `src/test/cqnsRegression.test.ts` pass cleanly:

| Test ID | Test Name | Invariants Verified | Result |
| :--- | :--- | :--- | :--- |
| **TEST 1** | Canonical Initialization (SIM-01) | Circumcircle $R=160$, $A,B,C,D \in S^1$, quad `VERIFIED` | `PASS` |
| **TEST 2** | Move $D$ off Circle in Research Mode (SIM-02) | $D$ alive in memory; prerequisite lost; status `VANISHED` | `PASS` |
| **TEST 3** | Explicit Restoration & Verification (SIM-04) | Coordinates restored; `REQUEST_VERIFICATION` emits `evt_verif_...` | `PASS` |
| **TEST 4** | Explicit Auxiliary Diagonals (SIM-05) | Adding $AC$ does NOT auto-infer $BD$ or $P$ | `PASS` |
| **TEST 5** | Explicit Diagonal Intersection (SIM-06) | $P = AC \cap BD$ registered; Ptolemy `DERIVED` holds | `PASS` |
| **TEST 6** | Dedicated Both Diagonals Button | Simultaneous construction of $AC$ and $BD$ | `PASS` |
| **TEST 7** | Parallel & Perpendicular Line Creation | Lines constructed via $P$ and registered in DAG | `PASS` |
| **TEST 8** | Radial Degree Scale Calculation | Angular positions match canonical coordinates | `PASS` |
| **TEST 9** | Mode Switching (Canonical vs Extension) | Dynamic toggle between modes | `PASS` |
| **TEST 10** | **Dynamic Parallel Recomputation** | Moving $A$ recomputes $L$ endpoints; cross-product $= 5.008 \times 10^{-4} < 0.01$ | `PASS` |
| **TEST 11** | **Dynamic Perpendicular Recomputation** | Moving $B$ recomputes $L$ endpoints; dot-product $= 6.838 \times 10^{-4} < 0.01$ | `PASS` |
| **TEST 12** | **School vs Research Mode Invariant Behavior** | School mode constrains to $\Delta = 0$ (`VERIFIED`); Research mode permits $\Delta = 90$ (`VANISHED`) | `PASS` |

---

## 4. Verification Check

* **TypeScript Compilation (`npm run lint`):** `0 errors`
* **Production Build (`compile_applet`):** `Build succeeded`
* **Dev Server Status (`curl -I http://localhost:3000`):** `HTTP/1.1 200 OK`
