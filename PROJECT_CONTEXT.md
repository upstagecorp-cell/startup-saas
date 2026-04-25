# Project Context

This project is an AI-based startup diagnosis and execution MVP for early founders.

## Product Direction

```text
diagnosis -> analysis -> action -> record -> re-diagnosis
```

The current product is not a plan-based execution system.
It creates `result_actions` from diagnosis results and uses those actions as the single execution loop.

## Current Diagnosis Flow

```text
diagnosis_sessions
-> diagnosis_answers
-> completed
-> generateDiagnosisResult
-> diagnosis_results
-> diagnosis_result_issues
-> diagnosis_result_issue_causes
-> action_recommendations
-> result_actions
-> dashboard
```

## Business Type Branching

The first required diagnosis question is `business_type`.

- `online`
- `offline`

`business_type` is context-only.

- required for branching
- excluded from scoring
- not mapped to any diagnosis dimension

### Online

`online` uses the existing online checklist.

### Offline

`offline` uses offline-only follow-up questions covering:

- foot traffic
- nearby competitors
- average price per customer
- expected daily customers
- seating/service capacity
- turnover rate
- monthly fixed costs
- staffing readiness

## Active Execution Model

`result_actions` is the only active execution source of truth.

- generated from `action_recommendations`
- updated by users through status, note, and evidence fields
- used by dashboard execution UI
- used to derive the Primary Action

## Active Result And Artifact Layers

Core result persistence:

- `persist_diagnosis_result`
- `diagnosis_results`
- `diagnosis_result_dimensions`

Rule-based artifact persistence:

- `diagnosis_result_issues`
- `diagnosis_result_issue_causes`
- `action_recommendations`

## Guardrails

- Keep `diagnosis_sessions -> diagnosis_answers -> completed -> generateDiagnosisResult -> diagnosis_results -> dashboard` intact
- Keep `persist_diagnosis_result` as the result persistence path
- Never score free-text questions
- Keep `result_actions` as the only execution layer
