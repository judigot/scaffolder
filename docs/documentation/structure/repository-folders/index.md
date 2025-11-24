---
title: Repository Folders
---

# Repository Folders

Overview of all directories in the `scaffolder-files` repository and their purposes.

## Directory Overview

The `scaffolder-files` repository is organized into several key directories, each serving a specific purpose in the code generation process.

## Core Directories

### [Constants](/documentation/structure/repository-folders/constants/)

Configuration files for type mappings, database support, and code generation behavior.

### [Core](/documentation/structure/repository-folders/core/)

Shared file templates that can be reused across multiple projects using the `$USE_CORE` syntax.

### [Templates](/documentation/structure/repository-folders/templates/)

Reusable code templates organized by framework and layer (backend/frontend).

### [Projects](/documentation/structure/repository-folders/projects/)

Complete project templates with structure definitions and optional project-specific templates.

## Method Directories

### [Base Methods](/documentation/structure/repository-folders/base-methods/)

Reusable method definitions for generating repository pattern code (CRUD, queries, advanced operations).

### [Domain Methods](/documentation/structure/repository-folders/domain-methods/)

Domain-specific method templates for handling entity relationships and business logic.

### [Enterprise Methods](/documentation/structure/repository-folders/enterprise-methods/)

Advanced method templates for enterprise-level features (auditing, validation, data export).

## Schema Directory

### [Schemas](/documentation/structure/repository-folders/schemas/)

Database schema definitions and type definitions used by Scaffolder.

## Directory Relationships

```
Constants/          → Configuration for type mappings
Schemas/            → Database structure definitions
                    ↓
Base Methods/       → Generic operations (CRUD, queries)
Domain Methods/     → Entity-specific operations
Enterprise Methods/ → Advanced enterprise features
                    ↓
Templates/          → Code templates organized by framework
                    ↓
Core/               → Shared reusable templates
                    ↓
Projects/           → Complete project structures
```

## Quick Reference

| Directory | Purpose | Used By |
|-----------|---------|---------|
| Constants | Type mappings, configuration | All code generation |
| Schemas | Database structure | Type-safe generation |
| Base Methods | Generic CRUD operations | All entities |
| Domain Methods | Entity relationships | Specific entities |
| Enterprise Methods | Compliance, security | Enterprise apps |
| Templates | Code templates | All projects |
| Core | Shared configurations | Multiple projects |
| Projects | Complete project structures | End users |

## Getting Started

1. Start with [Constants](/documentation/structure/repository-folders/constants/) to understand type mappings
2. Review [Templates](/documentation/structure/repository-folders/templates/) to see available code templates
3. Explore [Projects](/documentation/structure/repository-folders/projects/) to find project structures
4. Learn about [Core](/documentation/structure/repository-folders/core/) for reusable configurations

## Next Steps

- Explore individual directory documentation for detailed information
- See [Repository Structure](/documentation/structure/) for overall organization
- Review [API Reference](/documentation/api-reference/) for syntax and usage
