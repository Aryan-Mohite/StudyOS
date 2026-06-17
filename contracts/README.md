# StudyOS — Contracts

**This folder is the output of Phase 0.**  
Every UI component and every LLM prompt in this project is built against the definitions in these files.

---

## Files

| File | Purpose |
|---|---|
| `types.ts` | TypeScript types for all contracts — **import from here in all components** |
| `ui-states.md` | Every possible UI state for every feature — **read before building any component** |
| `syllabus.contract.json` | Shape of parsed syllabus output (root structure) |
| `notes.contract.json` | Shape of Notes Generator output |
| `numericals.contract.json` | Shape of Solved Numericals output |
| `mcq.contract.json` | Shape of MCQ Generator output |
| `study-plan.contract.json` | Shape of Study Plan Generator output |
| `chat.contract.json` | Shape of AI Tutor single-turn response |

---

## Rules

1. **Never build a component** that expects data in a shape not defined in `types.ts`.
2. **Never write an LLM prompt** without first reading the relevant `.contract.json` — the prompt must instruct the model to return that exact shape.
3. **Never add a new UI state** to a component without first adding it to `ui-states.md`.
4. **If a contract needs to change**, update `types.ts` and the `.contract.json` first, then update mocks, then update components. Never the other way around.

---

## Phase 1 Checklist

Before writing a single component, verify:

- [ ] Mock data file exists in `/src/mocks/` and satisfies the TypeScript type
- [ ] All UI states for the feature are defined in `ui-states.md`
- [ ] Component accepts the typed contract shape as props, not raw `any`

## Phase 2 Checklist

Before wiring a real API endpoint:

- [ ] LLM prompt has been tested on 10+ real examples
- [ ] Output consistently matches the contract (validate with `zod` schema)
- [ ] All UI states are handled in the component (not just `loading` and `success`)
