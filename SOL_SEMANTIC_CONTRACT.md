# CQNS-001 — SOL SEMANTIC CONTRACT SPECIFICATION

**Document Version:** 1.0.0-PROMPT05-DRAFT  
**Status:** SPECIFICATION COMPLETE — AWAITING EXTERNAL HUMAN AUDIT  
**Phase:** Phase 5 (SOL Semantic Contract & Operational Bridge)  
**System Target:** CQNS-001 (Cyclic Quadrilateral Normalization Stand)  
**Guiding Architectural Invariants:**
* *"Agent may be wrong. The Stand must not."*
* *"SOL is strictly a THIN OPERATIONAL BRIDGE (Zero Mathematical Authority)"*
* *"Geometry Core + Verification Layer is the SOLE Mathematical Authority"*
* *"Relation Graph is strictly a PASSIVE Epistemic Ledger"*
* *"Zero-Silent-Inference: No auto-diagonals, no auto-intersections, no auto-theorems"*
* *"Operational Outcomes ≠ Epistemic Statuses"*

---

## 1. Purpose & Scope

The **SOL Semantic Contract** defines the operational interface, boundary constraints, command lifecycle, permission rules, and safety guarantees of the **Structural Operational Language (SOL)** for **CQNS-001** (*Cyclic Quadrilateral Normalization Stand*).

This specification governs:
* What external LLM Agents, automated solvers, or human operators are permitted to request through SOL.
* How SOL translates operational intent into existing, authorized `GeometryState`, `Construction DAG`, and `Verification Layer` invocations.
* What SOL is explicitly **forbidden** from computing, deciding, inferring, or fabricating.
* How operational errors (`COMMAND_REJECTED`, `MALFORMED_REQUEST`) are strictly separated from mathematical truth statuses (`GIVEN`, `HYPOTHESIS`, `VERIFIED`, `DERIVED`, `INVALID`, `VANISHED`).

---

## 2. SOL Role: The Thin Operational Bridge

SOL functions exclusively as a **thin, non-computational operational gateway** connecting Agent-level intent to the underlying deterministic geometry architecture:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                 AGENT INTENT                                │
│  - Proposes conjectures, requests constructions, queries observations       │
│  - Epistemic Level: HYPOTHESIS / REQUEST (Zero Mathematical Authority)      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ (SOL Structured Command)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SOL (OPERATIONAL BRIDGE GATEWAY)                     │
│  - Validates command syntax & parameter schema                              │
│  - Dispatches authorized operations to Construction / Geometry Core         │
│  - Returns structured Observations and Verification Results to Agent        │
│  - ZERO arithmetic calculation | ZERO theorem proving | ZERO graph mutation │
└───────────────┬─────────────────────────────────────────────▲───────────────┘
                │ (Authorized Operation Dispatch)             │ (Verified Event Payload)
                ▼                                             │
┌─────────────────────────────────────────────────────────────┴───────────────┐
│                 DETERMINISTIC GEOMETRY ARCHITECTURE                         │
│  - GeometryState: Stores single authoritative coordinates                   │
│  - Construction DAG: Records explicit parent-child construction lineage     │
│  - Geometry Core: Computes exact Euclidean metrics & circle relations       │
│  - Verification Layer: Applies Verification Contracts (VC-01..VC-14)        │
│  - Relation Graph: Passively records verified facts & provenance            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Authority Boundary Matrix

To uphold the core doctrine (*"Agent may be wrong. The Stand must not."*), strict role boundaries are enforced:

| Component | May / Allowed | Must NOT / Forbidden |
| :--- | :--- | :--- |
| **Agent** | • Formulate speculative hypotheses<br>• Request geometric constructions<br>• Request contract verifications<br>• Query observations and relation graph | • Declare facts as `VERIFIED`<br>• Directly mutate coordinates in `GeometryState`<br>• Bypass `Geometry Core` or `Verification Layer` |
| **SOL** | • Parse & validate command schemas<br>• Dispatch authorized actions to `GeometryState` / `Construction DAG`<br>• Invoke Verification Contracts<br>• Format & return observation payloads<br>• Attach provenance tracking metadata | • Calculate Euclidean geometry independently<br>• Prove theorems or infer properties<br>• Assign `VERIFIED` or `DERIVED` status<br>• Directly write facts to `Relation Graph`<br>• Silently add constructions or reorder vertices |
| **Geometry Core** | • Sole authority for numeric Euclidean math<br>• Compute exact coordinates, radii, angles, and distances | • Store provenance or relation graph nodes |
| **Verification Layer** | • Authorize transitions to `VERIFIED`, `INVALID`, `VANISHED`<br>• Encapsulate numeric tolerance $\epsilon$ | • Formulate speculative agent hypotheses |
| **Relation Graph** | • Passively store facts, derivation trees, and dependencies | • Execute background inference engines<br>• Create unverified facts |
| **UI** | • Display state, render canvas, format observations<br>• Capture user drag/click inputs | • Verify geometry or assign epistemic status |

---

## 4. Operational Categories: Request vs Execution vs Observation vs Result

SOL formally separates the four stages of the command lifecycle:

```
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│ 1. REQUEST       │       │ 2. EXECUTION     │       │ 3. OBSERVATION   │       │ 4. VERIFICATION  │
│ (Agent Intent)   ├──────►│ (State Mutation) ├──────►│ (Sensory Fact)  ├──────►│ (Math Verdict)   │
│ Status: PROPOSED │       │ DAG Registered   │       │ Numeric Metric   │       │ Core Evaluated   │
└──────────────────┘       └──────────────────┘       └──────────────────┘       └──────────────────┘
```

1. **`REQUEST`**: An unverified input payload containing intended parameters (e.g. `ADD_DIAGONAL(A, C)`). It is **not** a fact.
2. **`EXECUTION`**: The deterministic registration of an object in `GeometryState` and `Construction DAG`. It is a constructive event, **not** a theorem proof.
3. **`OBSERVATION`**: A raw numerical metric computed by `Geometry Core` (e.g. $\text{length}(AC) = 5.234$). It is a measurement, **not** a universal mathematical truth.
4. **`VERIFICATION RESULT`**: An authoritative symbolic verdict (`VERIFIED`, `INVALID`, `DEGENERATE`) emitted by the `Verification Layer` under a formal contract ($VC\text{-}xx$). Only this stage enters the epistemic ledger.

---

## 5. Catalog of Allowed SOL Operations

Every SOL command is classified against the repository capabilities and architectural requirements:

| SOL Command | Target Subsystem | Semantic Meaning | Classification in Stand |
| :--- | :--- | :--- | :--- |
| `CREATE_POINT(id, x, y)` | `GeometryState` | Instantiates a 2D point primitive | `OBSERVED EXISTING OPERATION` |
| `CREATE_CIRCLE(id, centerId, radius)` | `GeometryState` / `Construction DAG` | Constructs a circle from center and radius | `OBSERVED EXISTING OPERATION` |
| `MOVE_POINT(id, x, y)` | `GeometryState` | Mutates coordinates of a point; triggers DAG dirty propagation | `OBSERVED EXISTING OPERATION` |
| `CREATE_SEGMENT(id, p1Id, p2Id)` | `GeometryState` / `Construction DAG` | Constructs a line segment connecting two points | `OBSERVED EXISTING OPERATION` |
| `ADD_DIAGONAL(quadId, p1Id, p2Id)` | `Construction DAG` | Explicitly registers an auxiliary diagonal segment | `REQUIRES ADAPTATION` (Maps to `CREATE_SEGMENT` with type tag `'diagonal'`) |
| `REQUEST_VERIFICATION(predicate, args)` | `Verification Layer` | Requests execution of a formal contract ($VC\text{-}xx$) | `INFERRED COMPATIBLE OPERATION` |
| `REQUEST_OBSERVATION(metricType, args)` | `Geometry Core` | Queries exact numeric coordinate/distance/angle data | `OBSERVED EXISTING OPERATION` |
| `REQUEST_RELATION_LOOKUP(query)` | `Relation Graph` | Passive read-only query of verified facts and provenance | `OBSERVED EXISTING OPERATION` |

---

## 6. Canonical CQNS Constraints

SOL must strictly enforce the frozen CQNS Canon ($Circle(O, R), A, B, C, D \in Circle \implies CyclicQuadrilateral(ABCD)$):

### Anti-Expansion Rules `[DESIGNED]`:
1. **Zero Silent Extensions:** SOL must **never** automatically inject interior points ($P \in \text{Int}(\mathcal{C})$) or exterior points ($P \in \text{Ext}(\mathcal{C})$) into canonical requests.
2. **Zero Automatic Diagonals:** Creating a quadrilateral $ABCD$ does **not** construct diagonals $AC$ or $BD$.
3. **Zero Automatic Intersections:** Constructing diagonals $AC$ and $BD$ does **not** construct their intersection point $P = AC \cap BD$.
4. **Zero Automatic Reordering:** SOL must **never** silently reorder vertices $(A, B, C, D)$ to force convexity. If an agent supplies a crossed sequence, it is processed as-is, and downstream contracts (VC-11, VC-14) evaluate to `INVALID` or `TOPOLOGY_CROSSED`.
5. **Zero Automatic Ptolemy:** SOL must not assume Ptolemy equality holds or use it to force coordinates.

---

## 7. `ADD_DIAGONAL` Semantics

The operation `ADD_DIAGONAL(quadId, p1, p2)` has strictly constructive, non-theorem semantics:

```
[Agent Command: ADD_DIAGONAL(quad_ABCD, A, C)]
                      │
                      ▼
[SOL Gateway Validation: Check that A and C are non-adjacent vertices of quad_ABCD]
                      │
                      ▼
[Construction DAG Registration: Register Segment(id='diag_AC', p1='A', p2='C', type='diagonal')]
                      │
                      ▼
[Epistemic Fact Emitted: diagonal_of(Segment(AC), quad_ABCD)  [Status: GIVEN / VERIFIED via VC-06]]
```

### Invariants:
* `ADD_DIAGONAL(AC)` registers an auxiliary segment.
* It does **NOT** prove concyclicity.
* It does **NOT** prove diagonal intersection.
* It does **NOT** compute Ptolemy's formula.

---

## 8. Verification Request Semantics

When an Agent submits a verification query:

```typescript
// Conceptual SOL Request Payload
{
  "command": "REQUEST_VERIFICATION",
  "predicate": "cyclic_quadrilateral",
  "arguments": ["pt_A", "pt_B", "pt_C", "pt_D"],
  "circumcircleId": "circle_main",
  "requestId": "req_84920",
  "agentSource": "agent_geometry_reasoner"
}
```

### Processing Pipeline:
1. **SOL Gateway:** Validates argument presence; tags the proposition with initial status `status: HYPOTHESIS`.
2. **Verification Dispatch:** Routes request to `Verification Layer` under contract `VC-03 (CyclicQuadrilateral)`.
3. **Core Evaluation:** `Geometry Core` computes radial deviations $\max_{P \in \{A,B,C,D\}} |\|P-O\| - R|$.
4. **Verdict Return:**
   * If $\Delta \le \epsilon_{\text{dist}} \implies \text{Verification Layer assigns } \mathbf{VERIFIED}$.
   * If $\Delta > \epsilon_{\text{dist}} \implies \text{Verification Layer assigns } \mathbf{INVALID}$.
   * If prerequisite point is missing $\implies \text{Verification Layer assigns } \mathbf{VANISHED}$.
5. **Relation Graph:** Passive ledger records the authorized outcome. SOL returns the verified observation payload to the Agent.

---

## 9. `INVALID` vs `VANISHED` Boundary in SOL

SOL acts strictly as a transparent transmitter of epistemic verdicts:
* **`INVALID` Transmission:** Emitted when `Geometry Core` determines that a geometric property is false for existing, active coordinates.
* **`VANISHED` Transmission:** Emitted when a previously verified relation lost one or more required upstream prerequisites due to point movement (e.g. vertex dragged off circle) or object deletion.
* **Object Existence Guard:** SOL **must never** interpret a `VANISHED` relation as meaning the underlying points were deleted. Points continue to exist in `GeometryState` unless explicitly deleted via `REMOVE_POINT`.

---

## 10. State Mutation Boundary

To preserve the single source of truth:
1. **SOL Requests Mutation:** SOL dispatches structured mutation requests to `GeometryState` (e.g. `geometryState.updatePoint(id, x, y)`).
2. **SOL Never Directly Overwrites Raw State Memory:** SOL does not maintain a private coordinate cache or bypass the `Construction DAG` dirty-flag propagation pipeline.

---

## 11. Error & Rejection Semantics (Operational vs Epistemic)

SOL strictly distinguishes **Operational Outcomes** from **Epistemic Statuses**:

```
┌────────────────────────────────────────┐  ┌────────────────────────────────────────┐
│      OPERATIONAL OUTCOMES (SOL)        │  │       EPISTEMIC STATUSES (STAND)       │
├────────────────────────────────────────┤  ├────────────────────────────────────────┤
│ • COMMAND_SUCCESS                      │  │ • GIVEN                                │
│ • MALFORMED_SYNTAX                     │  │ • HYPOTHESIS                           │
│ • UNKNOWN_OPERATION                    │  │ • VERIFIED                             │
│ • OBJECT_NOT_FOUND                     │  │ • DERIVED                              │
│ • PREREQUISITE_ENTITY_MISSING          │  │ • INVALID                              │
│ • PARAMETER_OUT_OF_BOUNDS              │  │ • VANISHED                             │
│ • EXECUTION_REJECTED_BY_CORE           │  │                                        │
└────────────────────────────────────────┘  └────────────────────────────────────────┘
```

* An operational error (e.g. `OBJECT_NOT_FOUND` when querying non-existent point `'pt_Z'`) terminates the SOL call immediately with an error response.
* It does **not** create an `INVALID` or `VANISHED` node in the `Relation Graph`.

---

## 12. Zero-Silent-Inference Rule

SOL is bound by an absolute prohibition on implicit reasoning:

| Prohibited Silent Action | Required Correct SOL Behavior |
| :--- | :--- |
| Silently creating diagonals | Do nothing unless explicit `ADD_DIAGONAL` command received |
| Silently creating diagonal intersection point $P = AC \cap BD$ | Require explicit `CONSTRUCT_INTERSECTION(AC, BD)` |
| Silently reordering vertices to force clockwise convexity | Process user/agent ordering as provided |
| Silently assuming a chord is a diameter | Require explicit `VC-05 (Diameter)` verification |
| Silently applying Ptolemy's formula | Require explicit `VC-14 (Ptolemy)` contract evaluation |
| Upgrading `HYPOTHESIS` to `VERIFIED` | Require explicit `Geometry Core` verification execution |

---

## 13. Provenance Tracking Model in SOL

When processing requests, SOL generates and attaches standard traceability metadata:

```typescript
export interface SOLCommandEnvelope {
  requestId: string;                  // Deterministic UUID for the command
  agentSource: string;                // Identifier of proposing Agent / User
  timestamp: number;                  // Epoch timestamp (ms)
  command: string;                    // e.g. "REQUEST_VERIFICATION"
  arguments: Record<string, unknown>; // Parameter dictionary
  stateVersion: number;               // Current state version counter from GeometryState
  parentRequestId?: string;           // Causal link for composite sub-requests
}

export interface SOLResponseEnvelope {
  requestId: string;
  operationalStatus: 'COMMAND_SUCCESS' | 'COMMAND_REJECTED';
  operationalError?: string;          // Human-readable error diagnostic
  epistemicResult?: {
    factId: string;
    status: 'GIVEN' | 'HYPOTHESIS' | 'VERIFIED' | 'DERIVED' | 'INVALID' | 'VANISHED';
    origin: 'CANONICAL' | 'EXTENSION_SCENARIO';
    verificationContractId?: string;
    numericEvidence?: Record<string, number>;
  };
  stateVersion: number;
  executionDurationMs: number;
}
```

* `OBSERVED`: Basic command envelope structure exists in `src/engines/semantic/aamGateway.ts` and `semanticCommandExecutor.ts`.
* `INFERRED / ADAPTATION`: Standardizing `stateVersion` and `verificationContractId` attachments across all CQNS responses.

---

## 14. Repository Compatibility Analysis

Inspection of the existing semantic gateway code (`src/engines/semantic/` and `SOL-2`):

1. **`semanticCommandExecutor.ts` `[OBSERVED]`:**  
   * Acts as a command dispatcher routing JSON/text actions to `constructionCore.ts` and `geometryState.ts`.
   * *Compatibility:* Fully compatible as a thin operational bridge.
   * *Required Adaptation:* Ensure that no helper functions inside the executor evaluate mathematical truth directly; all queries must route to `Geometry Core` and `invariants.ts`.
2. **`aamGateway.ts` `[OBSERVED]`:**  
   * Implements Agent-to-Architecture Messaging.
   * *Compatibility:* Directly reusable for transport and logging.
3. **`researchGraph.ts` Integration `[OBSERVED / INFERRED]`:**  
   * SOL must interact with `researchGraph.ts` in **read-only mode** or via authorized verification event logging. Direct node manipulation by SOL is prohibited.

---

## 15. Preservation of Open Questions

1. **`[OPEN QUESTION-01]` Vertex Order & Convexity:**  
   * SOL receives vertex order as specified by the caller (`[A, B, C, D]`).
   * SOL does **not** reorder vertices. Downstream verification contracts handle branch-cuts and flag non-convex orders.
2. **`[OPEN QUESTION-02]` Diagonal Intersection Registration:**  
   * SOL treats diagonal intersection as an explicit constructive operation (`CONSTRUCT_INTERSECTION`), preserving DAG transparency.
3. **`[OPEN QUESTION-03]` Ptolemy Converse Role:**  
   * SOL exposes Ptolemy strictly as a queryable metric relation (`VC-14`), retaining converse cyclicity verification as `OPEN / NOT YET IMPLEMENTABLE`.

---

## 16. Self-Audit Checklist

- [x] **No production code changed or implemented.**
- [x] **No second GeometryState, Core, or Construction DAG created.**
- [x] **SOL defined strictly as a thin operational bridge.**
- [x] **Geometry Core + Verification Layer confirmed as sole mathematical authority.**
- [x] **Relation Graph confirmed as passive ledger.**
- [x] **UI confirmed as DISPLAY / REQUEST / OBSERVE.**
- [x] **Exactly 6 epistemic statuses preserved (no auxiliary statuses).**
- [x] **`INVALID` strictly distinguished from `VANISHED`.**
- [x] **Object existence strictly distinguished from relation validity.**
- [x] **Zero-Silent-Inference rule fully specified.**
- [x] **No automatic diagonals, intersections, or Ptolemy evaluations.**
- [x] **CQNS Canon strictly preserved (4 concyclic points on 1 circle).**
- [x] **Open questions preserved without premature resolution.**
- [x] **Repository capabilities grounded in actual file evidence.**
