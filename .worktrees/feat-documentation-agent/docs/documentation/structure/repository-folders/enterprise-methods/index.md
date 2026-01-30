---
title: Enterprise Methods Directory
---

# Enterprise Methods Directory

The `EnterpriseMethodsFileBased/` directory contains advanced method templates for enterprise-level features like auditing, validation, and data export.

## Overview

Enterprise methods provide advanced functionality required for enterprise applications, including compliance features, security, and data management capabilities.

## Directory Structure

```
EnterpriseMethodsFileBased/
├── audit-and-tracking/
│   └── audit/
│       ├── description.txt
│       ├── controllerMethod.txt
│       ├── repositoryMethod.txt
│       └── serviceMethod.txt
├── validation-and-security/
│   └── validate/
│       ├── description.txt
│       ├── controllerMethod.txt
│       └── serviceMethod.txt
├── data-import-export/
│   └── export/
│       ├── description.txt
│       ├── controllerMethod.txt
│       └── serviceMethod.txt
└── index.ts
```

## Enterprise Features

### Audit and Tracking

Complete audit trail logging for compliance:

- **audit** - Track all changes to entities
- Change tracking with timestamps
- User attribution for all modifications
- Metadata logging for compliance

### Validation and Security

Data validation and permission checking:

- **validate** - Input validation and sanitization
- Role-based permission checking
- Security validation for sensitive operations
- Input sanitization to prevent attacks

### Data Import and Export

Data management capabilities:

- **export** - Export data in multiple formats
- CSV, Excel, JSON, PDF export support
- Filtered exports based on permissions
- Permission-based access control

## Method Structure

Enterprise methods follow the same structure as base methods:

- **description.txt** - Feature description
- **controllerMethod.txt** - Controller implementation
- **serviceMethod.txt** - Service layer logic
- **repositoryMethod.txt** - Data access layer (when needed)

## Usage

Enterprise methods are used alongside base methods:

- **Base Methods** provide standard CRUD and queries
- **Enterprise Methods** add compliance and security features
- Together they provide enterprise-ready APIs

## When to Use

Use enterprise methods when you need:

- ✅ **Compliance** - Audit trails for regulatory requirements
- ✅ **Security** - Advanced validation and permission checks
- ✅ **Data Management** - Import/export capabilities
- ✅ **Enterprise Features** - Features required for large-scale applications

## Integration

Enterprise methods integrate seamlessly:

1. Base methods provide core functionality
2. Enterprise methods add advanced features
3. Both work together in generated code

## Best Practices

### ✅ DO

- **Use for compliance**: Implement audit methods for regulatory requirements
- **Add security layers**: Use validation methods for sensitive operations
- **Enable data management**: Use export methods for reporting needs
- **Document requirements**: Make compliance and security needs clear

### ❌ DON'T

- **Don't replace base methods**: Enterprise methods complement, not replace base methods
- **Don't over-engineer**: Only use enterprise methods when needed
- **Don't skip security**: Always use validation for user input
- **Don't ignore compliance**: Implement audit trails for sensitive data

## Framework Support

Currently supports file-based format:

- **EnterpriseMethodsFileBased/** - File-based enterprise method templates

## Next Steps

- Learn about [Base Methods](/documentation/structure/repository-folders/base-methods/) for core operations
- See [Domain Methods](/documentation/structure/repository-folders/domain-methods/) for entity-specific operations
- Review [Templates](/documentation/structure/repository-folders/templates/) for code structure

