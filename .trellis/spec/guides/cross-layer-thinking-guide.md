# Cross-Layer Thinking Guide

> **Purpose**: Think through data flow across layers before implementing.

---

## The Problem

**Most bugs happen at layer boundaries**, not within layers.

Common cross-layer bugs:
- API returns format A, frontend expects format B
- Database stores X, service transforms to Y, but loses data
- Multiple layers implement the same logic differently

---

## Before Implementing Cross-Layer Features

### Step 1: Map the Data Flow

Draw out how data moves:

```
Source → Transform → Store → Retrieve → Transform → Display
```

For each arrow, ask:
- What format is the data in?
- What could go wrong?
- Who is responsible for validation?

### Step 2: Identify Boundaries

| Boundary | Common Issues |
|----------|---------------|
| API ↔ Service | Type mismatches, missing fields |
| Service ↔ Database | Format conversions, null handling |
| Backend ↔ Frontend | Serialization, date formats |
| Component ↔ Component | Props shape changes |

### Step 3: Define Contracts

For each boundary:
- What is the exact input format?
- What is the exact output format?
- What errors can occur?

---

## Common Cross-Layer Mistakes

### Mistake 1: Implicit Format Assumptions

**Bad**: Assuming date format without checking

**Good**: Explicit format conversion at boundaries

### Mistake 2: Scattered Validation

**Bad**: Validating the same thing in multiple layers

**Good**: Validate once at the entry point

### Mistake 3: Leaky Abstractions

**Bad**: Component knows about database schema

**Good**: Each layer only knows its neighbors

### Mistake 4: Native Module Not Externalized in Build

**Bad**: Adding a native npm package (e.g. `better-sqlite3`) but forgetting to add it to `vite.config.ts` `rollupOptions.external`. Rollup tries to bundle it, but the package internally uses CJS variables (`__filename`, `__dirname`) which don't exist in ESM output, causing runtime crash.

**Good**: Any npm package with native bindings (`.node` files) MUST be added to `external` immediately when installed.

```typescript
// vite.config.ts
rollupOptions: {
  external: ['electron', 'electron-store', 'better-sqlite3'],
}
```

**Rule**: When installing a new dependency, check if it has native bindings. If yes, add to `external` in the same commit.

### Mistake 5: Mock Data Not Cleaned After Integration

**Bad**: During parallel development (e.g. multiple worktrees), one worktree uses mock data to develop independently. After merging, the mock calls are never switched to real IPC calls, so the UI shows fake data.

**Good**: After merging parallel branches, verify all mock/stub paths are replaced with real implementations. Add a grep check for "mock" in production code paths.

**Rule**: Multi-worktree integration checklist must include: "All mock/stub imports removed, all IPC calls point to real implementations."

---

## Checklist for Cross-Layer Features

Before implementation:
- [ ] Mapped the complete data flow
- [ ] Identified all layer boundaries
- [ ] Defined format at each boundary
- [ ] Decided where validation happens

After implementation:
- [ ] Tested with edge cases (null, empty, invalid)
- [ ] Verified error handling at each boundary
- [ ] Checked data survives round-trip
- [ ] New native dependencies added to vite `external` (if applicable)
- [ ] All mock/stub code removed, replaced with real implementations (if parallel development)

---

## When to Create Flow Documentation

Create detailed flow docs when:
- Feature spans 3+ layers
- Multiple teams are involved
- Data format is complex
- Feature has caused bugs before
