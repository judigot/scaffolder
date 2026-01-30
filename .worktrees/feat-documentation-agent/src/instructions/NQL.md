Below is a **Product Requirements Document (PRD)** that encompasses both the **essential** and **advanced** features of a fully robust **NQL (Natural Query Language) to SQL Parser**. This PRD consolidates everything from basic relationship handling to cutting-edge features like partitioning, row-level security, and more.

---

# NQL to SQL Parser – Advanced Product Requirements Document

## 1. Overview

The **NQL to SQL Parser** aims to let users describe their relational database schemas in a concise, parent-centric **Natural Query Language** and automatically generate **optimized SQL** for popular relational database management systems. It embraces **best practices** (e.g., composite keys for pivot tables, `ON DELETE CASCADE`) and offers **advanced database features** such as partitioning, polymorphic relationships, triggers, and more—while preserving the clarity of natural language.

## 2. Objectives

1. **Simplicity + Power**
   - Empower users to define relationships and constraints without writing raw SQL syntax.
   - Maintain an opinionated approach that encourages best practices.
2. **Comprehensive Coverage**
   - Support the majority of advanced database features found in production systems (partitioning, triggers, row-level security, etc.).
3. **Extensible Architecture**
   - Accommodate future enhancements or database-specific extensions with minimal disruption.
4. **Cross-Database Compatibility**
   - Primarily support PostgreSQL, with a roadmap for MySQL, SQL Server, and Oracle dialects.

## 3. Scope

### 3.1 In-Scope

1. **NQL Parsing**
   - Defining tables, columns, relationships, constraints, triggers, views, etc.
2. **SQL Generation**
   - Creating robust `CREATE TABLE`, `ALTER TABLE`, `CREATE INDEX`, and other DDL statements.
3. **Advanced Features**
   - Partitioning, polymorphic relationships, row-level security, and more.

### 3.2 Out-of-Scope

1. **Complex Data Migrations**
   - Full schema diffing, rollback scripts, or migration versioning.
2. **ORM Functionality**
   - Runtime data-access layers or query-building beyond schema definitions.
3. **Performance Tuning**
   - Detailed query-optimization or advanced indexing strategies not covered by core NQL syntax.

## 4. Requirements

### 4.1 Core Table & Column Definitions

- **FR-1**: Parse table-creation commands in NQL (e.g., `user has columns first_name, last_name, ...`).
- **FR-2**: Support a wide range of column data types (`INT`, `BIGINT`, `VARCHAR`, `TEXT`, `JSONB`, `BOOLEAN`, etc.).
- **FR-3**: Handle `NOT NULL`, default values, and automatically add timestamps (`created_at`, `updated_at`) unless disabled.

### 4.2 Relationships & Constraints

- **FR-4**: One-to-One, One-to-Many, Many-to-Many
  - **One-to-One**: Unique foreign key in the child table.
  - **One-to-Many**: Foreign key in the “many” table referencing the “one.”
  - **Many-to-Many**: Automatically generate pivot tables with composite primary keys unless overridden.
- **FR-5**: Constraint Enforcement
  - **Foreign Keys**: Default `ON DELETE CASCADE`; allow user overrides (`SET NULL`, `RESTRICT`, etc.).
  - **Unique**: E.g., `user has unique email.`
  - **Check**: E.g., `product has check price > 0.`
- **FR-6**: Composite Keys
  - Default for pivot tables, optional for other use cases (e.g., a composite key on `(first_name, last_name)` if requested).

### 4.3 Indexes & Performance Features

- **FR-7**: Index Creation
  - Single-column indexes (`product has index on product_name`)
  - Composite indexes (`order_product has index on (order_id, product_id)`)
- **FR-8**: Partial or Functional Indexes (PostgreSQL)
  - E.g., `user has partial index on (status) where status = 'active'`.
  - E.g., `user has index on lower(email)` for case-insensitive search.
- **FR-9**: Full-Text Search Indexes (PostgreSQL)
  - E.g., `article has fulltext index on content.`

### 4.4 Advanced Column & Table Options

- **FR-10**: Collations
  - E.g., `username text collate "C"`.
- **FR-11**: Generated/Computed Columns
  - E.g., `order has computed total as quantity * price.`
- **FR-12**: Enum & Domain Types
  - E.g., `status is enum with values (pending, shipped, delivered).`
  - E.g., domain constraints if supported by the target DB.

### 4.5 Partitioning & Storage Options

- **FR-13**: Range/List/Hash Partitioning
  - E.g., `order is partitioned by range(order_date).`
- **FR-14**: Tablespace / Storage Engine
  - E.g., MySQL’s InnoDB or custom tablespace in PostgreSQL.

### 4.6 Polymorphic & Advanced Relationships

- **FR-15**: Polymorphic Associations
  - E.g., `comment belongs to polymorphic parent (post or photo).`
- **FR-16**: Self-Referencing (Recursive) Relationships
  - E.g., `category has many child categories.` (generates a `parent_id` in the same table).

### 4.7 Triggers & Function Definitions

- **FR-17**: Trigger Creation
  - E.g., `on user creation do log_user_created.`
  - Generate `CREATE TRIGGER` statements for before/after inserts, updates, or deletes.
- **FR-18**: Row-Level Security (PostgreSQL)
  - E.g., `enable row-level security on user.`
- **FR-19**: Audit/Logging Hooks
  - E.g., `on update of order, log changes.`

### 4.8 Views & Materialized Views

- **FR-20**: View Creation
  - E.g., `create view active_users as select from user where is_active = true.`
- **FR-21**: Materialized Views (PostgreSQL)
  - E.g., `create materialized view monthly_sales as select sum(price) ...`

### 4.9 Migration & Schema Evolution

- **FR-22**: Incremental Changes
  - `user table add column bio text.`
  - `rename column user.username to handle.`
- **FR-23**: Versioning (Future Scope)
  - Potentially generate migration scripts from old schema to new schema.

### 4.10 Security & Access Control

- **FR-24**: Role-Based Privileges
  - E.g., `grant select on user to role analytics.`
- **FR-25**: Column-Level Encryption (Some DB engines)
  - E.g., `encrypt column password.`
- **FR-26**: Row-Level Security Policies
  - `user has policy for only owner to select.`

### 4.11 Database-Specific Extensions

- **FR-27**: MySQL, PostgreSQL, SQL Server, Oracle
  - Generate dialect-specific syntax (e.g., `BIGSERIAL` vs. `IDENTITY(1,1)`).
- **FR-28**: Support for Postgres Extensions
  - `citext`, `uuid-ossp`, `pgcrypto`, etc.

### 4.12 Error Handling & Validation

- **FR-29**: Grammar & Syntax Errors
  - Catch unrecognized phrases or typos (e.g., `user has man posts.`).
- **FR-30**: Ambiguity & Conflict Detection
  - E.g., conflicting relationships or constraints.
- **FR-31**: Suggestive Corrections
  - E.g., “Did you mean `user has many posts`?”

### 4.13 Extensibility & Modularity

- **FR-32**: Plugin Architecture
  - Let advanced features (e.g., triggers, partitioning) be optional modules.
- **FR-33**: Configurable Output
  - Output to `.sql`, display in console, or generate migrations for multiple frameworks.
- **FR-34**: AST (Abstract Syntax Tree)
  - Clean separation of tokenization, parsing, validation, and code generation.

### 4.14 Internationalization (i18n) & Alternate Syntaxes

- **FR-35**: Multi-Language Support
  - Potential future feature for non-English statements.
- **FR-36**: Dialect Variants
  - E.g., separate user-specified dialects for PostgreSQL or MySQL.

### 4.15 Developer Workflow Integration

- **FR-37**: IDE Plugins
  - Syntax highlighting, auto-completion, live error checking.
- **FR-38**: Command-Line Interface
  - Convert `.nql` files to `.sql` scripts.
- **FR-39**: CI/CD Integration
  - Automated validation of `.nql` on pull requests.
- **FR-40**: Schema Visualization
  - Generate ER diagrams or visual schema representations from NQL.

---

## 5. Examples

1. **One-to-One Relationship**  
   **NQL**: `user has one profile.`  
   **SQL** (simplified):

   ```sql
   CREATE TABLE "user" (
     "user_id" BIGSERIAL PRIMARY KEY,
     "created_at" TIMESTAMPTZ,
     "updated_at" TIMESTAMPTZ
   );

   CREATE TABLE "profile" (
     "profile_id" BIGSERIAL PRIMARY KEY,
     "user_id" BIGINT UNIQUE NOT NULL,
     CONSTRAINT "FK_profile_user_id" FOREIGN KEY ("user_id") REFERENCES "user" ("user_id") ON DELETE CASCADE,
     "created_at" TIMESTAMPTZ,
     "updated_at" TIMESTAMPTZ
   );
   ```

2. **One-to-Many Relationship with Checks**  
   **NQL**: `user has many posts. user has check age >= 13.`  
   **SQL** (simplified):

   ```sql
   CREATE TABLE "user" (
     "user_id" BIGSERIAL PRIMARY KEY,
     "age" INT NOT NULL,
     CONSTRAINT check_age_min_13 CHECK (age >= 13),
     "created_at" TIMESTAMPTZ,
     "updated_at" TIMESTAMPTZ
   );

   CREATE TABLE "post" (
     "post_id" BIGSERIAL PRIMARY KEY,
     "user_id" BIGINT NOT NULL,
     CONSTRAINT "FK_post_user_id" FOREIGN KEY ("user_id") REFERENCES "user" ("user_id") ON DELETE CASCADE,
     "created_at" TIMESTAMPTZ,
     "updated_at" TIMESTAMPTZ
   );
   ```

3. **Many-to-Many Relationship with Pivot & Composite Key**  
   **NQL**: `order has many products via pivot.`  
   **SQL** (simplified):

   ```sql
   CREATE TABLE "order" (
     "order_id" BIGSERIAL PRIMARY KEY,
     "created_at" TIMESTAMPTZ,
     "updated_at" TIMESTAMPTZ
   );

   CREATE TABLE "product" (
     "product_id" BIGSERIAL PRIMARY KEY,
     "created_at" TIMESTAMPTZ,
     "updated_at" TIMESTAMPTZ
   );

   CREATE TABLE "order_product" (
     "order_id" BIGINT NOT NULL,
     "product_id" BIGINT NOT NULL,
     PRIMARY KEY ("order_id", "product_id"),
     CONSTRAINT "FK_order_product_order_id" FOREIGN KEY ("order_id") REFERENCES "order" ("order_id") ON DELETE CASCADE,
     CONSTRAINT "FK_order_product_product_id" FOREIGN KEY ("product_id") REFERENCES "product" ("product_id") ON DELETE CASCADE,
     "created_at" TIMESTAMPTZ,
     "updated_at" TIMESTAMPTZ
   );
   ```

4. **Partitioning & Advanced Index Example**  
   **NQL**:

   ```
   order is partitioned by range(order_date).
   order has index on (order_date).
   ```

   **SQL** (simplified):

   ```sql
   CREATE TABLE "order" (
     "order_id" BIGSERIAL PRIMARY KEY,
     "order_date" DATE NOT NULL,
     ...
   ) PARTITION BY RANGE ("order_date");

   CREATE INDEX idx_order_order_date
   ON "order" ("order_date");
   ```

---

## 6. Opinionated Defaults

1. **Cascading Deletes**
   - Automatically apply `ON DELETE CASCADE` unless overridden.
2. **Pivot Table Composite Keys**
   - Always use `(parent_id, child_id)` as the primary key for many-to-many pivot tables, avoiding extra surrogate keys.
3. **Timestamps**
   - Generate `created_at` and `updated_at` by default.

---

## 7. Roadmap

1. **MVP**
   - Basic table creation, core relationship handling (1:1, 1:N, M:N), unique/check constraints, partial indexing.
2. **v1.1**
   - Triggers, advanced indexing (partial, functional), row-level security (PostgreSQL).
3. **v1.2**
   - Partitioning, polymorphic relationships, domain types, and cross-database dialect expansions.
4. **v2.0**
   - Migration & schema evolution, versioning, i18n, advanced security and auditing.

---

## 8. Success Metrics

- **Adoption Rate**
  - Number of developers or teams choosing NQL over raw SQL or ORMs.
- **Schema Quality**
  - Reduced incidence of missing constraints or suboptimal indexing when using NQL defaults.
- **Error Rate**
  - Frequency of parse errors or ambiguous statements in typical usage.
- **Performance**
  - Parsing & generation speed for typical schemas (should be near-instant for most use cases).

---

## 9. Implementation Code

### 9.1 NQLParser.ts

```ts
import type { ISchemaInfo } from '../interfaces/interfaces.ts';
import {
  UNIQUE_COLUMN_NAMES,
  isJunctionTable,
  addParentRelationships,
  determineUniqueForeignKeys,
} from '../utils/identifySchema.ts';
import { changeCase } from '../utils/common.ts';

// Accepted verbs for relationship definitions
const RELATIONSHIP_VERBS = ['has', 'have'];
const VERB_PATTERN = RELATIONSHIP_VERBS.join('|');

interface IRelationship {
  type: 'hasOne' | 'hasMany' | 'belongsTo' | 'belongsToMany';
  from: string;
  to: string;
}

function addTable(
  tables: Set<string>,
  schemaInfo: ISchemaInfo[],
  tableName: string,
): void {
  const singularName = changeCase(tableName).singular;
  if (!tables.has(singularName)) {
    tables.add(singularName);
    const primaryKeyName = `${singularName}_id`;
    schemaInfo.push({
      tableName: singularName,
      requiredColumns: [primaryKeyName],
      columnsInfo: [
        {
          column_name: primaryKeyName,
          data_type: 'number',
          is_nullable: 'NO',
          column_default: 'AUTO_INCREMENT',
          primary_key: true,
        },
      ],
    });
  }
}

function addForeignKey(
  schemaInfo: ISchemaInfo[],
  fromTable: string,
  toTable: string,
  isUnique = false,
): void {
  const singularFromTable = changeCase(fromTable).singular;
  const singularToTable = changeCase(toTable).singular;
  const table = schemaInfo.find((t) => t.tableName === singularFromTable);
  if (!table) {
    return;
  }

  const foreignKeyName = `${singularToTable}_id`;
  if (!table.columnsInfo.some((c) => c.column_name === foreignKeyName)) {
    table.requiredColumns.push(foreignKeyName);
    table.columnsInfo.push({
      column_name: foreignKeyName,
      data_type: 'number',
      is_nullable: 'NO',
      unique: isUnique || UNIQUE_COLUMN_NAMES.includes(foreignKeyName),
      foreign_key: {
        foreign_table_name: singularToTable,
        foreign_column_name: `${singularToTable}_id`,
      },
    });
    table.foreignTables.push(singularToTable);
    table.foreignKeys.push(foreignKeyName);
  }
}

function parseRelationship(
  statement: string,
  relationships: IRelationship[],
  tables: Set<string>,
  schemaInfo: ISchemaInfo[],
): void {
  const hasOneMatch = new RegExp(
    `(\\w+)\\s+(${VERB_PATTERN})\\s+one\\s+(\\w+)`,
    'i',
  ).exec(statement);
  const hasManyMatch = new RegExp(
    `(\\w+)\\s+(${VERB_PATTERN})\\s+many\\s+(\\w+)(?:\\s+via\\s+pivot)?`,
    'i',
  ).exec(statement);
  const belongsToMatch = /(\w+)\s+belongs\s+to\s+(\w+)/i.exec(statement);
  const belongsToManyMatch = /(\w+)\s+belongs\s+to\s+many\s+(\w+)/i.exec(
    statement,
  );

  let relationship: IRelationship | null = null;

  if (hasOneMatch) {
    relationship = {
      type: 'hasOne',
      from: changeCase(hasOneMatch[1]).singular,
      to: changeCase(hasOneMatch[3]).singular,
    };
  } else if (hasManyMatch) {
    const hasViaPivot = statement.includes('via pivot');
    relationship = {
      type: hasViaPivot ? 'belongsToMany' : 'hasMany',
      from: changeCase(hasManyMatch[1]).singular,
      to: changeCase(hasManyMatch[3]).singular,
    };
  } else if (belongsToMatch) {
    relationship = {
      type: 'belongsTo',
      from: changeCase(belongsToMatch[1]).singular,
      to: changeCase(belongsToMatch[2]).singular,
    };
  } else if (belongsToManyMatch) {
    relationship = {
      type: 'belongsToMany',
      from: changeCase(belongsToManyMatch[1]).singular,
      to: changeCase(belongsToManyMatch[2]).singular,
    };
  }

  if (relationship) {
    relationships.push(relationship);
    addTable(tables, schemaInfo, relationship.from);
    addTable(tables, schemaInfo, relationship.to);
  }
}

function processRelationships(
  relationships: IRelationship[],
  schemaInfo: ISchemaInfo[],
): void {
  relationships.forEach((rel) => {
    const fromTable = schemaInfo.find((t) => t.tableName === rel.from);
    const toTable = schemaInfo.find((t) => t.tableName === rel.to);
    if (!fromTable || !toTable) {
      return;
    }

    switch (rel.type) {
      case 'hasOne':
        fromTable.hasOne.push(rel.to);
        fromTable.childTables.push(rel.to);
        addForeignKey(schemaInfo, rel.to, rel.from, true); // Set unique to true for one-to-one
        break;
      case 'hasMany':
        fromTable.hasMany.push(rel.to);
        fromTable.childTables.push(rel.to);
        addForeignKey(schemaInfo, rel.to, rel.from, false);
        break;
      case 'belongsTo':
        fromTable.belongsTo.push(rel.to);
        addForeignKey(schemaInfo, rel.from, rel.to, false);
        break;
      case 'belongsToMany': {
        fromTable.belongsToMany.push(rel.to);
        toTable.belongsToMany.push(rel.from);
        // Create pivot table
        const pivotTableName = `${rel.from}_${rel.to}`;
        addTable(new Set(), schemaInfo, pivotTableName);
        const pivotTable = schemaInfo.find(
          (t) => t.tableName === pivotTableName,
        );
        if (pivotTable) {
          pivotTable.isPivot = true;
          pivotTable.belongsTo.push(rel.from, rel.to);
          addForeignKey(schemaInfo, pivotTableName, rel.from);
          addForeignKey(schemaInfo, pivotTableName, rel.to);
          fromTable.pivotRelationships.push({
            relatedTable: rel.to,
            pivotTable: pivotTableName,
          });
          toTable.pivotRelationships.push({
            relatedTable: rel.from,
            pivotTable: pivotTableName,
          });
          // Add hasMany relationship to pivot table
          fromTable.hasMany.push(pivotTableName);
          toTable.hasMany.push(pivotTableName);
          fromTable.childTables.push(pivotTableName);
          toTable.childTables.push(pivotTableName);
        }
        break;
      }
    }
  });
}

function parseNQL(nql: string): ISchemaInfo[] {
  const statements = nql
    .split('.')
    .map((s) => s.trim())
    .filter(Boolean);

  const relationships: IRelationship[] = [];
  const tables = new Set<string>();
  const schemaInfo: ISchemaInfo[] = [];

  statements.forEach((statement) => {
    parseRelationship(statement, relationships, tables, schemaInfo);
  });

  processRelationships(relationships, schemaInfo);

  // Apply additional schema processing
  schemaInfo.forEach((table) => {
    table.isPivot = isJunctionTable(table, schemaInfo);
  });
  addParentRelationships(schemaInfo);
  determineUniqueForeignKeys(schemaInfo);

  return schemaInfo;
}

export default parseNQL;
```

### 9.2 useNQL.ts

```ts
import NQLParser from './NQLParser.ts';

const schemaInfo = NQLParser(`
Relationships:
users have many posts
orders have many products via pivot
`);

// eslint-disable-next-line no-console
console.log(schemaInfo);
```

---

## 10. Conclusion

A **fully robust NQL to SQL parser** balances ease-of-use with deep configurability, allowing developers to define everything from simple relationships to highly complex database setups. By integrating strong defaults (e.g., composite keys for many-to-many, cascading deletes) and advanced features (partitioning, triggers, row-level security), the parser empowers teams to build reliable, high-performance schemas—all through **natural language**.

This PRD outlines how to achieve that balance, detailing both the **core requirements** and a **wide array of advanced possibilities**. Adhering to this document will help ensure the NQL parser remains **scalable, maintainable, and consistently aligned** with best practices across different database engines.
