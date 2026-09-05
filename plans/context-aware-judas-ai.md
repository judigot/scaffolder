# Context-Aware Judas AI

## Overview

Enable Judas AI to be aware of the current `schemaInfo` from the global Zustand store (`useTransformationsStore`), allowing iterative schema refinement rather than starting fresh each conversation.

## Problem

Currently, Judas AI:

- Starts with no knowledge of existing schema
- Cannot modify or extend schemas created in Schema Builder or Introspector
- Regenerates entire schema even for small changes
- No continuity between Builder modes

## Solution

Inject current `schemaInfo` into the system prompt or as context, enabling:

- Iterative refinement ("Add a comments table")
- Modifications ("Make user_id nullable on posts")
- Extensions ("Add authentication to my existing schema")
- Awareness of what already exists

## Implementation Plan

### Phase 1: Schema Context Injection

**Files to modify:**

- `src/components/AI/AIChatContainer.tsx` - Pass schemaInfo to chat
- `src/lib/chat/useVercelChat.ts` - Support dynamic system prompt or context
- `src/app/routes/chat.ts` - Accept and process schema context
- `src/prompts/schemaBuilder.ts` - Add context-aware prompt section

**Approach:**

1. Serialize current `schemaInfo` to compact format (same format Judas outputs)
2. Include in request body alongside messages
3. Backend injects into system prompt as "Current Schema" section

```typescript
// AIChatContainer.tsx
const { schemaInfo } = useTransformationsStore();

const chat = useVercelChat({
  endpoint: '/api/chat',
  model: selectedModel,
  context: {
    currentSchema: schemaInfo.length > 0 ? serializeSchema(schemaInfo) : null,
  },
});
```

### Phase 2: Prompt Engineering

**Add to system prompt:**

```
## Current Schema Context

When a schema already exists, it will be provided below. Your role shifts:

WITH EXISTING SCHEMA:
- Treat it as the foundation - do not regenerate from scratch
- User requests are modifications/additions to this schema
- Preserve existing tables unless explicitly asked to remove
- Reference existing tables when adding relationships

Commands to recognize:
- "Add [table]" → Create new table, link to existing if relevant
- "Modify [table]" → Update existing table structure
- "Remove [table]" → Delete table (warn about relationships)
- "Add [field] to [table]" → Extend existing table
- "Connect [table] to [table]" → Add relationship

WITHOUT EXISTING SCHEMA:
- Behave as normal - gather requirements, generate fresh

<CURRENT_SCHEMA>
{schemaContext}
</CURRENT_SCHEMA>
```

### Phase 3: Schema Diffing

**Goal:** Only output changes, not entire schema

**New output format for modifications:**

```
<@@SCHEMA_DIFF@@>
+@comments:id:n#pk,post_id:n>posts,user_id:n>users,body:s,created_at:D,updated_at:D|<posts,users
~@posts:|>comments
<@@/SCHEMA_DIFF@@>
```

- `+` = Add table
- `-` = Remove table
- `~` = Modify table (show only changed parts)

**Files to modify:**

- `src/utils/schemaInfoValidator.ts` - Parse diff format
- `src/prompts/schemaBuilder.ts` - Diff output instructions

### Phase 4: UI Enhancements

**Show schema awareness in UI:**

1. **Context indicator** - Badge showing "Schema loaded" when context exists
2. **Quick actions** - Suggested prompts based on current schema:
   - "Add authentication"
   - "Add comments to posts"
   - "Create admin roles"
3. **Schema preview** - Collapsible view of current schema in chat

**Files to create/modify:**

- `src/components/AI/SchemaContextBadge.tsx` (new)
- `src/components/AI/SuggestedPrompts.tsx` (new)
- `src/components/AI/AIChatContainer.tsx` - Integrate new components

## API Changes

### Request Body

```typescript
interface IChatRequest {
  messages: Message[];
  model: ModelId;
  context?: {
    currentSchema?: string; // Compact schema format
    mode?: 'generate' | 'modify'; // Hint for AI behavior
  };
}
```

### Response

No changes needed - schema output format remains the same. Diff format is additive.

## Schema Serialization

**Utility function:**

```typescript
// src/utils/serializeSchema.ts
export function serializeSchemaToCompact(schemaInfo: ISchemaInfo[]): string {
  return schemaInfo
    .map((table) => {
      const columns = table.columns
        .map((col) => {
          let def = `${col.columnName}:${typeToCode(col.dataType)}`;
          if (col.isNullable) def += '?';
          if (col.isUnique) def += '!u';
          if (col.isPrimaryKey) def += '#pk';
          if (col.foreignKey) def += `>${col.foreignKey.table}`;
          return def;
        })
        .join(',');

      const relations = serializeRelations(table);
      return `@${table.tableName}:${columns}${relations}`;
    })
    .join('\n');
}
```

## Testing Strategy

1. **Unit tests** - Schema serialization/deserialization
2. **Integration tests** - API accepts and processes context
3. **E2E tests** - Full flow: Schema Builder → Judas AI → modifications applied

## Migration Path

- Phase 1-2: Core functionality (MVP)
- Phase 3: Optional optimization
- Phase 4: UX polish

## Open Questions

1. **Context size limits** - Large schemas may hit token limits. Summarize or truncate?
2. **Conflict resolution** - What if AI output conflicts with existing schema?
3. **Undo/history** - Should we track schema versions for rollback?
4. **Multi-mode sync** - Real-time sync between Schema Builder edits and Judas context?

## Success Metrics

- Users can modify existing schemas without regenerating
- Reduced token usage (diff vs full regeneration)
- Seamless flow between Builder modes
- Fewer "start over" interactions

## Timeline Estimate

- Phase 1: 2-3 hours
- Phase 2: 1-2 hours
- Phase 3: 3-4 hours
- Phase 4: 2-3 hours

**Total: ~10 hours**
