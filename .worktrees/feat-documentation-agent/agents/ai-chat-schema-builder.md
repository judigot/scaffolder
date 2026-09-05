---
name: ai-chat-schema-builder
description: Use this agent when you need to understand or modify the AI chat-based schema builder feature, implement schema validation, or work with the conversational app generation system. Examples:

<example>
Context: User wants to add a new data type to the schema builder
user: "Add support for a 'file' data type in the AI chat schema builder"
assistant: "I'll use the ai-chat-schema-builder agent to add the new data type to the schema validation and AI prompt."
<commentary>
This triggers because the user needs to extend schema data types.
</commentary>
</example>

<example>
Context: User wants to improve the AI chat prompt
user: "Make the AI chat builder ask about user permissions and roles"
assistant: "I'll use the ai-chat-schema-builder agent to enhance the conversation flow and system prompt."
<commentary>
This triggers because the user needs to modify the AI conversation behavior.
</commentary>
</example>

<example>
Context: User needs to debug schema validation
user: "Why is the AI chat rejecting my schema with a validation error?"
assistant: "I'll use the ai-chat-schema-builder agent to trace through the validation pipeline and identify the issue."
<commentary>
This triggers because the user needs to understand the schema validation system.
</commentary>
</example>

model: inherit
color: purple
tools: ["Read", "Write", "Bash", "Grep"]
---
# Agent AI Chat Schema Builder - Context Guide

This document provides essential context about the AI chat-based schema builder system for AI agents working on this codebase.

## Overview

The AI Chat Schema Builder is a conversational interface that allows users to describe their app idea in plain language. The AI assistant guides them through a friendly conversation, asking simple questions about their app, then automatically generates a complete database schema (schemaInfo) behind the scenes. This schema is then used by the project builder to scaffold the entire application.

**Key Philosophy**: Users should never see technical jargon or database concepts. The experience should feel like talking to a friendly app designer, not a programmer.

## Core Architecture

### Main Components

#### 1. Chat API Endpoint (`src/app/routes/chat.ts`)

The main endpoint that handles AI conversation:

- **Route**: `POST /api/chat`
- **Purpose**: Streams AI responses using Anthropic's Claude model
- **Key Feature**: Processes user messages and returns streaming responses with hidden schema embedded
- **Model**: Uses `claude-sonnet-4-5` via Vercel AI SDK
- **System Prompt**: `SCHEMA_BUILDER_SYSTEM_PROMPT` (comprehensive conversation guide)

**Request Flow**:
1. Client sends messages array via POST
2. Server validates request body structure
3. Converts UI messages to model format using `convertToModelMessages()`
4. Streams response using `streamText()` from Vercel AI SDK
5. Client receives streaming text with hidden schemaInfo comment

#### 2. Chat UI Container (`src/components/AI/AIChatContainer.tsx`)

The frontend chat interface:

- **Component**: `AIChatContainer`
- **Framework**: React with Vercel AI SDK (`useChat` hook)
- **Features**:
  - Real-time streaming chat interface
  - Markdown rendering with syntax highlighting
  - Automatic schema extraction from AI responses
  - Schema validation with visual feedback
  - Direct integration with project builder
  - File viewer for generated projects

**Key Functionality**:
- Extracts hidden schemaInfo from AI responses using `validateSchemaInfoFromResponse()`
- Validates schema using Zod validators
- Displays validation errors in-chat
- Automatically builds project when valid schema is detected
- Shows generated file structure in FileViewer component

#### 3. Schema Validation System (`src/utils/schemaInfoValidator.ts`)

Comprehensive validation for schemaInfo structures:

**Core Functions**:
- `validateSchemaInfo(data)`: Validates complete schemaInfo array
- `parseAndValidateSchemaInfo(jsonString)`: Parses JSON string and validates
- `extractSchemaInfoFromResponse(responseText)`: Extracts schemaInfo from AI response
- `validateSchemaInfoFromResponse(responseText)`: Combined extract + validate
- `removeHiddenSchemaFromText(text)`: Removes hidden schema comments from display text

**Validation Rules** (enforced via Zod schemas):
1. Every table MUST have an "id" column with `primary_key: true`
2. Table names must be snake_case starting with a letter: `/^[a-z][a-z0-9_]*$/`
3. Column names must be snake_case starting with a letter: `/^[a-z][a-z0-9_]*$/`
4. `data_type` must be one of: `"string"`, `"number"`, `"boolean"`, `"Date"`, `"object"`
5. `is_nullable` must be exactly `"YES"` or `"NO"` (string, not boolean)
6. All foreign key references must point to existing tables
7. All relationship references (hasOne, hasMany, belongsTo, etc.) must point to existing tables
8. No duplicate table names allowed
9. Each table must have at least one column

**Schema Structure** (TypeScript types):
```typescript
interface ISchemaInfo {
  tableName: string;               // snake_case, required
  columnsInfo: IColumnInfo[];      // at least one column required
  data?: Array<Record<string, unknown>>;  // optional seed data
  requiredColumns?: string[];
  foreignKeys?: string[];
  viewQuery?: string;              // if present, table is a view (read-only)
  viewStructure?: string[];
  foreignTables?: string[];
  childTables?: string[];
  isPivot?: true;                  // for many-to-many relationships
  hasOne?: string[];               // 1:1 relationships
  hasMany?: string[];              // 1:many relationships
  belongsTo?: string[];            // many:1 relationships
  belongsToMany?: string[];        // many:many relationships
  pivotRelationships?: Array<{
    relatedTable: string;
    pivotTable: string;
  }>;
}

interface IColumnInfo {
  column_name: string;             // snake_case, required
  data_type: "string" | "number" | "boolean" | "Date" | "object";
  is_nullable: "YES" | "NO";       // string, not boolean!
  column_default?: string | null;
  primary_key?: true;              // only present if true
  unique?: true;                   // only present if true
  foreign_key?: {
    foreign_table_name: string;
    foreign_column_name: string;
  };
}
```

#### 4. Schema Validation Endpoints (`src/app/routes/validateSchema.ts`)

REST API for schema validation:

**POST `/api/validate/schemaInfo`**
- Validates raw schemaInfo array
- Body: `{ schemaInfo: ISchemaInfo[] }`
- Returns: Validation result with errors or table count

**POST `/api/validate/json`**
- Validates schemaInfo from JSON string
- Body: `{ json: string }`
- Returns: Validation result with parsed data

**POST `/api/validate/extract`**
- Extracts and validates schemaInfo from AI response text
- Body: `{ responseText: string }`
- Returns: Validation result + extraction status + cleaned text

All endpoints return:
```typescript
{
  valid: boolean;
  message: string;
  tableCount?: number;
  tables?: string[];
  errors?: Array<{ path: string; message: string }>;
  schemaInfo?: ISchemaInfo[];
  extracted?: boolean;        // for /extract endpoint
  cleanedText?: string;       // for /extract endpoint (text without schema)
}
```

## Hidden Schema Format

The AI embeds schemaInfo in a special HTML comment format that's invisible to users:

### Format Specification

```html
<!--schemaInfo:[{"tableName":"users","columnsInfo":[...]}]-->
```

**Critical Requirements**:
1. Must be on a **single line** (no line breaks inside the comment)
2. Must start with exactly `<!--schemaInfo:` (no spaces)
3. Must end with exactly `-->`
4. Content between `schemaInfo:` and `-->` must be valid JSON array
5. JSON must be compact (no pretty-printing)

**Why HTML Comments?**
- Invisible to users in markdown renderers
- Easy to extract with regex
- Doesn't interfere with message display
- Can be removed cleanly for display purposes

**Extraction Regex Pattern**:
```javascript
/<!--schemaInfo:([\s\S]*?)-->/
```

**Fallback Formats** (if HTML comment not found):
1. Code block with label: `` ```json:schemaInfo ... ``` ``
2. Regular JSON code block starting with `[` and containing `"tableName"`

## AI System Prompt

The `SCHEMA_BUILDER_SYSTEM_PROMPT` defines the AI's personality and conversation flow:

### Personality Guidelines
- Warm, encouraging, and enthusiastic
- Use simple language - avoid ALL technical jargon
- Make building an app feel easy and exciting
- Celebrate user ideas and help them think through their app

### Conversation Flow

**1. Welcome & Understand**
- Ask what kind of app they want to build
- Be excited about their idea

**2. Ask Simple Questions** (one or two at a time)
- "Will people need to sign up and log in to use your app?"
- "What are the main things your app will keep track of?" (e.g., products, posts, tasks)
- "For each [thing], what details do you want to remember?"
- "How do these things connect?"
- "Can [thing A] belong to multiple [thing B]s, and vice versa?"

**3. Translate to Relationships** (internally, never explain to user)
- "Users can have many orders" → hasMany relationship
- "Products can have multiple tags" → many-to-many with pivot table
- "Each order belongs to one user" → belongsTo relationship

**4. Generate & Celebrate**
- Announce completion in exciting terms
- List what they'll get in simple language
- Output hidden schema in HTML comment format

### Language Rules (CRITICAL)

**NEVER say these technical terms**:
database, schema, table, column, foreign key, primary key, migration, CRUD, API, endpoint, model, entity, JSON, code block, technical

**INSTEAD say**:
app structure, things your app tracks, details, connections, features, your app, information

**NEVER show**:
- Code blocks with schemaInfo
- JSON syntax visible to user
- Technical implementation details
- The hidden schema comment (it should be invisible)

## Integration with Project Builder

Once a valid schema is extracted and validated:

1. **Schema Detection** (`AIChatContainer.tsx`):
   - Monitors AI responses for new schema info
   - Extracts and validates using `validateSchemaInfoFromResponse()`
   - Updates state with validated schema

2. **Automatic Build Trigger**:
   - Valid schema triggers `buildProjectFiles()` call
   - Uses current selected project structure
   - Passes schema to project builder system
   - Generates complete file structure

3. **UI Feedback**:
   - Validation errors shown as chat messages
   - Success message with file count
   - FileViewer shows generated structure
   - Export buttons become available

4. **Store Updates**:
   - Schema saved to `useSchemaStore`
   - Generated files saved to project store
   - Build metadata tracked (files using env vars, format failures)

## Data Type Mapping

The AI uses simplified data types that map to database types:

| Schema Type | Database Type | TypeScript Type | Usage |
|------------|---------------|-----------------|-------|
| `"string"` | VARCHAR/TEXT | `string` | Text fields, emails, names |
| `"number"` | INTEGER/DECIMAL | `number` | IDs, counts, prices |
| `"boolean"` | BOOLEAN | `boolean` | Flags, switches, yes/no |
| `"Date"` | TIMESTAMP | `Date` | Created dates, timestamps |
| `"object"` | JSON/JSONB | `object` | Complex nested data |

## Common Patterns

### Adding a New Data Type

1. Update `columnInfoSchema` in `schemaInfoValidator.ts`:
   ```typescript
   data_type: z.enum(["string", "number", "boolean", "Date", "object", "YOUR_TYPE"], {
     message: "Data type must be: string, number, boolean, Date, object, or YOUR_TYPE",
   })
   ```

2. Update system prompt in `chat.ts`:
   ```
   ## Data Types
   - "string" - text fields
   - "number" - integers, decimals
   - "boolean" - true/false
   - "Date" - timestamps, dates
   - "object" - JSON fields
   - "YOUR_TYPE" - description
   ```

3. Update type mappings in framework templates
4. Add tests to `schemaInfoValidator.test.ts`

### Modifying AI Conversation Flow

1. Edit `SCHEMA_BUILDER_SYSTEM_PROMPT` in `chat.ts`
2. Update conversation flow section
3. Test with various app scenarios
4. Ensure hidden schema format remains consistent

### Adding Schema Validation Rule

1. Add new `.refine()` to `schemaInfoArraySchema` in `schemaInfoValidator.ts`
2. Write validation logic with clear error message
3. Add test cases to `schemaInfoValidator.test.ts`
4. Document rule in this agent file

## Key Files

1. **`src/app/routes/chat.ts`**: Chat API endpoint and system prompt
2. **`src/components/AI/AIChatContainer.tsx`**: Chat UI and schema extraction
3. **`src/utils/schemaInfoValidator.ts`**: Schema validation system
4. **`src/app/routes/validateSchema.ts`**: Validation REST endpoints
5. **`src/AI.tsx`**: Main AI page component
6. **`src/components/AI/Navbar.tsx`**: Chat navigation bar

## Testing

Test files for the schema builder:

- **`src/tests/schemaInfoValidator.test.ts`**: Comprehensive validation tests (50+ test cases)
  - Valid schema structures
  - Invalid table names, column names
  - Data type validation
  - Relationship validation
  - Foreign key validation
  - Duplicate detection
  - Required fields validation
  - Extraction from AI responses

## Recent Changes

### Zod 4 Compatibility Update
- Updated enum error messages to use `message` parameter instead of `errorMap`
- Changed from:
  ```typescript
  z.enum(["YES", "NO"], {
    errorMap: () => ({ message: "is_nullable must be 'YES' or 'NO'" }),
  })
  ```
- Changed to:
  ```typescript
  z.enum(["YES", "NO"], {
    message: "is_nullable must be 'YES' or 'NO'",
  })
  ```
- Updated error handling to use `result.error.issues` instead of `result.error.errors`

### ESLint Error Fixes
- Renamed interfaces to use `I` prefix convention: `IValidationResult`, `IChatMessageProps`, etc.
- Replaced type assertions with proper type guards
- Fixed nullable conditional checks with explicit comparisons
- Removed unused imports and variables
- Fixed template expression types by converting numbers to strings

### Pre-commit Hook Integration
- Added `bun lint-staged` to `.husky/pre-commit`
- Ensures all staged files pass linting before commit
- Runs ESLint with `--fix` flag for auto-fixable issues

## Error Handling

### Schema Validation Errors

When schema validation fails, errors are returned in structured format:

```typescript
{
  success: false,
  errors: [
    {
      path: "0.tableName",           // JSON path to error
      message: "Table name must be snake_case"
    },
    {
      path: "1.columnsInfo.0",
      message: "At least one column is required"
    }
  ]
}
```

**Error Display**:
- Shown as red-bordered chat messages in UI
- Includes JSON path to problematic field
- Provides actionable error message
- Allows user to ask AI to fix the schema

### Chat API Errors

**Invalid Request Body**:
- Returns 400 with `{ error: "Invalid request body" }`
- Validates that `messages` field exists

**Server Errors**:
- Caught in try-catch block
- Returns 500 with error details
- Logged to console for debugging

## Performance Considerations

- **Streaming Responses**: Uses Vercel AI SDK's streaming for real-time chat
- **Schema Extraction**: Runs on every AI message (regex-based, very fast)
- **Validation**: Zod validation is synchronous and fast (< 1ms for typical schemas)
- **Automatic Builds**: Only triggered when new valid schema detected (debounced)
- **Hidden Schema Format**: Single-line format ensures fast regex matching

## Security Considerations

- **Input Validation**: All API endpoints validate request structure
- **Schema Validation**: Zod schemas prevent invalid data structures
- **SQL Injection**: Schema only contains structure, no SQL execution in chat
- **XSS Prevention**: Hidden HTML comments don't execute in React (rendered as text)
- **Rate Limiting**: Consider adding rate limits to `/api/chat` endpoint

## Integration Points

### With Project Builder
- Valid schema → `buildProjectFiles()` → complete project structure
- See [Agent Project Builder](./project-builder.md) for details

### With Schema Store
- Schema saved to `useSchemaStore` for persistence
- Can be edited in Schema Builder UI
- Exported to GitHub as part of project

### With File Viewer
- Generated files displayed in FileViewer component
- Read-only mode for AI-generated projects
- Export to GitHub integration

## Related Documentation

- [Agent Project Builder](./project-builder.md) - How schemas are used to generate code
- `src/utils/project-builder/docs/README.md` - Project builder documentation
- `src/tests/schemaInfoValidator.test.ts` - Validation test examples
- `src/interfaces/interfaces.ts` - TypeScript interfaces for schemaInfo

## Future Enhancements

### Potential Improvements
- **Multi-step Schema Refinement**: Allow users to iterate on generated schema
- **Schema Visualization**: Show entity-relationship diagram in chat
- **Example Gallery**: Provide pre-built schema templates (blog, e-commerce, etc.)
- **Natural Language Schema Editing**: "Add email field to users table"
- **Schema Diff View**: Show changes when schema is updated
- **Export Schema Only**: Download schema JSON without building project

### Architecture Considerations
- **Conversation History**: Currently client-side only, consider server-side persistence
- **Schema Versioning**: Track schema changes over conversation
- **Multi-user Collaboration**: Real-time schema building with team
- **AI Model Selection**: Allow users to choose different models (Opus, Sonnet, Haiku)
