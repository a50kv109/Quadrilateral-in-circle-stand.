# CQNS-001 — EPISTEMIC & PROVENANCE CONTRACTS SPECIFICATION

**Document Version:** 1.0.0-PROMPT04-DRAFT  
**Status:** SPECIFICATION COMPLETE — AWAITING EXTERNAL HUMAN AUDIT  
**Phase:** Phase 4 (Epistemic & Provenance Contracts)  
**System Target:** CQNS-001 (Cyclic Quadrilateral Normalization Stand)  
**Core Invariants:**
* *"UI → GeometryState → Geometry Core → Verification Layer → Relation Graph"*
* *"Agent may be wrong. The Stand must not."*
* *"GIVEN ≠ VERIFIED | HYPOTHESIS cannot authorize truth | INVALID ≠ VANISHED"*
* *"Relation Graph is strictly a PASSIVE Epistemic Ledger (Zero Inference Authority)"*
* *"Epsilon (ε) is strictly encapsulated within the Verification Layer"*

---

## 1. Purpose & Scope

The **Epistemic & Provenance Contracts** define the formal epistemic lifecycle, validation criteria, transition rules, dependency invalidation mechanics, and historical provenance tracking for all facts and relations in **CQNS-001** (*Cyclic Quadrilateral Normalization Stand*).

This document establishes:
* The precise semantics of the canonical 6-state epistemic taxonomy (`GIVEN`, `HYPOTHESIS`, `VERIFIED`, `DERIVED`, `INVALID`, `VANISHED`).
* The mandatory provenance data required for every verified and derived proposition.
* The boundary separating failure of state verification (`INVALID`) from loss of prerequisite entities (`VANISHED`).
* Strict architectural safeguards preventing LLM Agents, SOL gateways, UI components, or the Relation Graph from usurping mathematical verification authority.

---

## 2. Architectural Authority Boundaries

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                     UI                                      │
│  - Roles: DISPLAY | USER_REQUEST | OBSERVE                                  │
│  - CANNOT: Verify geometry, authorize VERIFIED, or mutate Relation Graph    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ (Constructive Commands / Drag Events)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                               GEOMETRY STATE                                │
│  - Role: Single Source of Truth for coordinates and registered primitives    │
│  - Emits: State mutation events and Construction DAG dependency dirty flags │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ (State Version & Entity Coordinates)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                GEOMETRY CORE                                │
│  - Role: Sole mathematical computing authority                              │
│  - Computes: Exact Euclidean metrics, concyclicity, angles, intersections   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ (Exact Numeric Outputs)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             VERIFICATION LAYER                              │
│  - Role: Execution of Verification Contracts (VC-01 ... VC-14)              │
│  - Encapsulates: EPSILON (ε) numerical tolerances                           │
│  - Evaluates: Contract preconditions, geometric evidence, and derivations   │
│  - Emits: Epistemic status assignments (VERIFIED, INVALID, VANISHED)        │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ (Authorized Epistemic Events)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                               RELATION GRAPH                                │
│  - Role: PASSIVE Epistemic & Provenance Ledger                              │
│  - Stores: Facts, relations, dependency edges, derivation trees, provenance │
│  - CANNOT: Perform inference, run background provers, or promote hypotheses │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Prohibited Authority Anti-Patterns `[DESIGNED]`:
* $\text{UI} \to \text{VERIFIED}$ (Prohibited: UI cannot declare truth).
* $\text{UI} \to \text{DERIVED}$ (Prohibited: UI cannot perform logical deductions).
* $\text{Relation Graph} \to \text{VERIFIED}$ (Prohibited: Graph cannot verify facts).
* $\text{Relation Graph} \to \text{Inference Engine}$ (Prohibited: Graph is a passive ledger).
* $\text{Domain Model} \to \text{VERIFIED}$ (Prohibited: Instantiating a domain object does not verify it).
* $\text{HYPOTHESIS} \to \text{VERIFIED}$ (Prohibited: An agent hypothesis requires an explicit verification event by the Geometry Core).

---

## 3. Canonical Epistemic Statuses

The system strictly supports exactly six canonical epistemic statuses. No auxiliary statuses (such as `CONFLICT`, `UNCERTAIN`, `PROBABLE`, `LIKELY`, `ASSUMED`, `TRUSTED`) are permitted.

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
                  │ (Verification Fails)              │ (Authorized Rule Derivation)
                  ▼                                   ▼
          ┌───────────────┐                   ┌───────────────┐
          │    INVALID    │                   │    DERIVED    │
          └───────────────┘                   └───────┬───────┘
                                                      │ (Prerequisite Destroyed)
                                                      ▼
                                              ┌───────────────┐
                                              │   VANISHED    │
                                              └───────────────┘
```

### 3.1 Status Definitions `[DESIGNED]`

1. **`GIVEN` (Axiomatic Input Condition):**
   * *Definition:* A primitive geometric entity or axiomatic boundary condition explicitly provided by the problem statement, user input, or canonical constructor.
   * *Invariant:* $\text{GIVEN} \neq \text{VERIFIED}$. Being given does not imply that subsequent geometric invariants (e.g. concyclicity or collinearity) are automatically proven.
2. **`HYPOTHESIS` (Speculative Proposal):**
   * *Definition:* A conjecture, proposed relation, or inquiry formulated by an LLM Agent, user, or heuristic exploration tool.
   * *Invariant:* Carries **zero mathematical truth value**. A hypothesis cannot serve as a premise for a `DERIVED` fact.
3. **`VERIFIED` (Directly Validated Mathematical Fact):**
   * *Definition:* An atomic geometric property directly checked and confirmed true by the `Geometry Core` under a designated Verification Contract ($VC\text{-}xx$) within numerical tolerance $\epsilon$.
   * *Invariant:* Solely emitted by the `Verification Layer`.
4. **`DERIVED` (Logically Inferred Mathematical Fact):**
   * *Definition:* A compound fact logically deduced by applying a formal deduction rule from a catalog of authorized theorems to prerequisite facts that are already `VERIFIED` or `GIVEN`.
   * *Invariant:* Must maintain a complete, unbroken `DerivationChain` to its verified premises.
5. **`INVALID` (Direct State Contradiction):**
   * *Definition:* A proposition whose prerequisite entities and structural relations are present and active, but whose specific mathematical condition evaluates directly to `false` ($\Delta > \epsilon$) in the active coordinate configuration.
   * *Invariant:* Indicates a direct negative verification result; underlying geometric objects remain intact in `GeometryState`.
6. **`VANISHED` (Prerequisite Loss / Dependency Invalidation):**
   * *Definition:* A previously established `VERIFIED` or `DERIVED` relation that has lost one or more required prerequisites because the geometric state, point coordinates, or dependency structure changed.
   * *Invariant:* Prerequisite loss can occur via object removal, state mutation, point movement, structural destruction, or upstream dependency change. Crucially, the underlying geometric objects themselves may continue to exist in `GeometryState` even though the composite relation has `VANISHED`.

---

## 4. Formal Distinction: `INVALID` vs `VANISHED` & Object Existence

To prevent logical conflation, the boundaries between `INVALID`, `VANISHED`, and object existence are formally codified:

### 4.1 Structural Comparison Matrix

| Scenario / Criterion | `INVALID` | `VANISHED` |
| :--- | :--- | :--- |
| **Direct Trigger** | The mathematical predicate condition is evaluated directly and fails ($\Delta > \epsilon$). | One or more required upstream prerequisites were lost due to state change, point movement, or object deletion. |
| **Prerequisite State** | All prerequisite entities and prerequisite relations **exist and hold**. | At least one required prerequisite relation or entity is **missing, broken, or no longer holds**. |
| **Mathematical Meaning** | "The direct mathematical check was executed and returned false for active prerequisites." | "The relation can no longer be maintained as an established fact because its foundational prerequisites were lost." |
| **Object Existence Status** | All underlying geometric objects remain in `GeometryState`. | Underlying objects may **still exist** in `GeometryState` (e.g. point moved) or may have been deleted. |
| **Epistemic Trace** | Retains verification contract ID + numerical failure diagnostic. | Retains historical creation provenance + reason for prerequisite loss. |

### 4.2 Mandatory Canonical Example: Point Dragging & Prerequisite Loss

```
[Initial State - Canon Setup]
Circle(O, R)
A, B, C, D ∈ Circle
        │
        ▼ (Verification Layer executes VC-03)
VERIFIED: point_on_circle(A, C), point_on_circle(B, C), 
          point_on_circle(C, C), point_on_circle(D, C)
        │
        ▼ (Verification Layer executes VC-03)
VERIFIED: cyclic_quadrilateral(ABCD)
        │
        ▼ (User Action: MOVE_POINT(D) off the circle)
[Mutated State]
Point D STILL EXISTS in GeometryState with valid coordinates (xD', yD').
However: ||D - O|| ≠ R  ==>  point_on_circle(D, C) is NO LONGER TRUE.
        │
        ▼ (Dependency Invalidation Pipeline)
The required prerequisite [point_on_circle(D, C)] for cyclic_quadrilateral(ABCD) is LOST.
        │
        ▼
cyclic_quadrilateral(ABCD) transitions to:  VANISHED
```

### 4.3 Axiomatic Principle: Object Existence $\neq$ Relation Validity `[DESIGNED]`
* **Object Existence $\not\implies$ Relation Validity:** The continuous presence of Point $D$ in `GeometryState` does **not** imply that `cyclic_quadrilateral(ABCD)` remains valid.
* **Relation Vanished $\not\implies$ Object Deletion:** The transition of `cyclic_quadrilateral(ABCD)` to `VANISHED` does **not** mean that Point $D$ was deleted.
* **Graph Invariance:** The mere absence or search-failure of a relation node in the `Relation Graph` is **not** itself an authority or basis for declaring `INVALID` or `VANISHED`. Status transitions must originate strictly from explicit verification and state-change events.

---

## 5. Provenance Model

Every relation or fact registered in the Relation Graph must contain an immutable provenance descriptor answering:
* **WHO / WHAT** established the fact?
* **FROM WHAT** premises was it established?
* **UNDER WHICH** Verification Contract / Rule?
* **WHEN / AT WHICH** state version was it generated?

### 5.1 Provenance Data Schema `[INFERRED / TARGET]`

```typescript
export type EpistemicStatus = 
  | 'GIVEN' 
  | 'HYPOTHESIS' 
  | 'VERIFIED' 
  | 'DERIVED' 
  | 'INVALID' 
  | 'VANISHED';

export type ProvenanceOrigin = 
  | 'CANONICAL' 
  | 'EXTENSION_SCENARIO';

export interface DerivationTrace {
  ruleId: string;                     // e.g. "RULE_INSCRIBED_QUAD_OPPOSITE_ANGLES"
  ruleName: string;                   // Human-readable rule title
  premiseFactIds: string[];           // IDs of prerequisite facts (must be GIVEN, VERIFIED, or DERIVED)
  authorizedBy: 'GEOMETRY_CORE' | 'FORMAL_RULE_CATALOG';
}

export interface FactProvenance {
  factId: string;                     // Deterministic hash of relation type + entity IDs
  status: EpistemicStatus;
  origin: ProvenanceOrigin;
  verificationContractId?: string;    // e.g. "VC-03", "VC-11"
  derivationTrace?: DerivationTrace;  // Populated exclusively if status === 'DERIVED'
  stateVersion: number;               // Monotonic state version counter from GeometryState
  eventId: string;                    // Unique operational event ID that produced this record
  createdAt: number;                  // Epoch timestamp (ms)
  invalidatedAt?: number;             // Timestamp when transitioned to INVALID or VANISHED
  invalidationReason?: string;        // Diagnostic explanation
}
```

### 5.2 Status Classification of Properties:
* `OBSERVED`: Basic `status`, `origin`, and `premiseIds` exist in `src/kernel/types.ts` and `src/engines/research/researchGraphTypes.ts`.
* `INFERRED`: `stateVersion`, explicit `verificationContractId`, and `invalidationReason` are required for full CQNS-001 provenance guarantees.

---

## 6. Provenance Origin: Canonical vs Extension

Every fact is tagged with an orthogonal `origin` classifier:

### 6.1 `CANONICAL` `[DESIGNED]`
* Bounded strictly to the 4-point concyclic configuration:
  $$Circle(O, R), \quad A, B, C, D \in Circle(O, R) \implies CyclicQuadrilateral(ABCD)$$
* Evaluated against canonical verification contracts VC-01 through VC-14.

### 6.2 `EXTENSION_SCENARIO` `[DESIGNED]`
* Assigned to experimental, non-concyclic, interior/exterior point configurations, or multi-circle systems.
* **Strict Non-Interference Invariant:** An `EXTENSION_SCENARIO` node **never** mutates or enters the canonical relation graph topology. Hypotheses generated in an extension scenario cannot be used as premises for canonical derivations.

---

## 7. Derivation Chain Mechanics

A `DERIVED` fact must represent an unbroken deductive chain:

$$\text{Premises } \{P_1, P_2, \dots, P_k\} \xrightarrow{\text{Formal Rule } R} \text{Conclusion } C$$

### Rules Governing Derivations `[DESIGNED]`:
1. **Premise Validity:** Every premise $P_i$ must have active status $\in \{ \text{GIVEN}, \text{VERIFIED}, \text{DERIVED} \}$. If any $P_i \in \{ \text{HYPOTHESIS}, \text{INVALID}, \text{VANISHED} \}$, the derivation is rejected.
2. **Deterministic Rules Only:** Derivations must map to an explicitly cataloged formal rule (e.g. `RULE_INSCRIBED_QUAD_OPPOSITE_ANGLES`). Heuristic graph traversals, structural similarity, or vector embeddings are **strictly prohibited** as derivation authorities.
3. **Passive Graph Storage:** The Relation Graph stores the derivation links (`premiseFactIds`, `ruleId`); it does not execute the deduction itself.

---

## 8. Complete Epistemic Status Transition Matrix

The following table defines the full, authorized transition matrix for all epistemic states:

| Initial Status | Target Status | Authorized Trigger / Condition | Authorizing Authority | Invalidation / Side Effects |
| :--- | :--- | :--- | :--- | :--- |
| *(None)* | **`GIVEN`** | Entity creation command (e.g. `ADD_POINT`, `INIT_CANON`) | User / Canon Setup | Registers base entity in DAG |
| *(None)* | **`HYPOTHESIS`** | Speculative assertion submitted via SOL / Agent | Agent / User | Zero truth value; no state mutation |
| **`GIVEN`** | **`VERIFIED`** | Verification Contract validates geometric condition | Geometry Core + Verif Layer | Emits verified observation |
| **`GIVEN`** | **`INVALID`** | Verification Contract explicitly fails condition | Geometry Core + Verif Layer | State contradiction logged |
| **`GIVEN`** | **`VANISHED`** | Prerequisite entity deleted from `GeometryState` | GeometryState (DAG invalidation) | Downstream facts marked VANISHED |
| **`HYPOTHESIS`**| **`VERIFIED`** | Explicit verification event evaluates condition to TRUE | Geometry Core + Verif Layer | Promoted to verified truth |
| **`HYPOTHESIS`**| **`INVALID`** | Verification event evaluates condition to FALSE | Geometry Core + Verif Layer | Refuted hypothesis |
| **`HYPOTHESIS`**| **`VANISHED`** | Prerequisite entity deleted before verification | GeometryState (DAG invalidation) | Unverifiable hypothesis archived |
| **`VERIFIED`** | **`INVALID`** | State change causes direct predicate check to fail ($\Delta > \epsilon$) while prerequisites hold | Geometry Core + Verif Layer | Fact invalidated; geometry stays |
| **`VERIFIED`** | **`VANISHED`** | Prerequisite relation fails or prerequisite entity deleted | Verification Layer / State Invalidation | Prerequisite lost; fact extinct |
| **`DERIVED`** | **`INVALID`** | Direct check of derived relation fails while premises hold | Verification Layer (Propagation) | Fact marked invalid |
| **`DERIVED`** | **`VANISHED`** | Upstream premise becomes `INVALID`, `VANISHED`, or deleted | Verification Layer / State Invalidation | Derivation chain broken/lost |
| **`INVALID`** | **`VERIFIED`** | State change restores mathematical condition ($\Delta \le \epsilon$) | Geometry Core + Verif Layer | Re-verified upon valid coordinates |
| **`INVALID`** | **`VANISHED`** | Prerequisite entity deleted or prerequisite premise lost | Verification Layer / State Invalidation | Archived as extinct |
| **`VANISHED`** | **`VERIFIED`** | **PROHIBITED AUTOMATICALLY.** Requires new verification event confirming all restored prerequisites | Geometry Core + Verif Layer | Re-authorized via explicit check |

---

## 9. Dependency Invalidation & Propagation Pipeline

When coordinates change (e.g. point dragging) or entities are deleted in `GeometryState`:

```
1. GeometryState Mutation (e.g. Point D dragged to new coordinates)
   │
2. Construction DAG & Relation Graph identify dependent relations (DIRTY)
   │
3. Verification Layer iterates over DIRTY relations:
   ├── Step 1: Prerequisite Verification:
   │           Do all required prerequisite entities exist AND do all required
   │           prerequisite relations hold (status: VERIFIED / GIVEN)?
   │           NO  ──► Dependent relation loses prerequisite ──► Set Status: VANISHED
   │           YES ──► Proceed to Step 2
   │
   └── Step 2: Direct Contract Re-evaluation (VC-xx) via Geometry Core:
               FAILED (Δ > ε) ──► Direct verification fails ──► Set Status: INVALID
               PASSED (Δ ≤ ε) ──► Retain / Assign status ─────► Set Status: VERIFIED
   │
4. Relation Graph receives updated status payload & logs stateVersion + eventId
```

---

## 10. Restoration Policy (`VANISHED` $\to$ `VERIFIED`)

* **Policy Statement:** Direct automatic restoration from `VANISHED` to `VERIFIED` via graph-level pattern matching is **strictly prohibited**.
* **Rationale:** A `VANISHED` status indicates that foundational geometric prerequisites were broken. Re-establishing validity requires an authoritative mathematical verification event.
* **Mechanism:** If point coordinates are moved such that all prerequisite conditions hold again, the `Verification Layer` executes the relevant Verification Contract (VC-xx) and, upon successful verification, transitions the relation from `VANISHED` to `VERIFIED`.

---

## 11. Preservation of OPEN QUESTION-01 (Vertex Order & Convexity)

* **Status:** **PRESERVED AS OPEN QUESTION / IMPLEMENTATION REFINEMENT**.
* **Epistemic Rule:**
  * The working criterion `is_convex_ordering` based on monotonic polar angle progression along $S^1$ operates as a precondition check in VC-11 and VC-14.
  * Angular branch cuts ($[-\pi, \pi]$ vs $[0, 2\pi]$) and coincident vertex degenerate cases must be guarded in the arithmetic kernel of the Verification Layer.
  * The epistemic layer **does not** create a special status for non-convex quads; it simply marks dependent angular theorems as `INVALID` when non-convexity is detected.

---

## 12. Safety Audit of `researchGraph.ts` (RISK-01 Review)

* **Current Implementation Assessment `[OBSERVED]`:**  
  `src/engines/research/researchGraph.ts` contains passive node/edge registries, but also inherited prototype auto-inference routines from early exploratory stands.
* **Safety Mandate:**  
  When implementing CQNS-001, any implicit pattern-matching loops inside `researchGraph.ts` that attempt to infer relations without explicit Verification Layer dispatch must be neutralized or isolated. The Relation Graph must remain a purely passive data structure.

---

## 13. Self-Audit Checklist

- [x] **A:** No new epistemic statuses introduced (strictly 6 canonical statuses).
- [x] **B:** Relation Graph confirmed unable to create `VERIFIED` facts independently.
- [x] **C:** `HYPOTHESIS` prohibited from authorizing mathematical truth without Core verification.
- [x] **D:** `INVALID` and `VANISHED` formally disambiguated with explicit criteria.
- [x] **E:** `CANONICAL` and `EXTENSION_SCENARIO` strictly isolated.
- [x] **F:** `DERIVED` facts mandate an explicit `DerivationTrace` to verified premises.
- [x] **G:** Complete traceability chain ($\text{source} \to \text{rule} \to \text{result}$) preserved.
- [x] **H:** SOL and Agents constrained to proposing hypotheses and requesting constructions.
- [x] **I:** UI restricted to display and interaction; zero verification authority.
- [x] **J:** OPEN QUESTION-01 preserved without premature invention.
- [x] **K:** Zero production code written in Phase 4.
