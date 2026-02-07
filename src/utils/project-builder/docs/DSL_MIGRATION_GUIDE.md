# DSL Migration Guide

This guide maps legacy template syntax to the preferred DSL syntax.

## Placeholder Migration

- Legacy: `{{tableNameSnakeCasePlural}}`
- Preferred: `<@@>tableName.plural.snakeCase</@@>`

- Legacy: `{{tableNamePascalCaseSingular}}`
- Preferred: `<@@>tableName.singular.pascalCase</@@>`

- Legacy: `{{valueCamelCase}}`
- Preferred: `<@@>value.camelCase</@@>`

## Loop Migration

- Legacy inline loop:

```txt
[[LOOP(columnsInfo) --template="{{value}}" --separator=", "]]
```

- Preferred block loop:

```txt
<@@LOOP@@ data="columnsInfo" separator=", ">
<@@>value</@@>
</@@LOOP@@>
```

## Data Access Migration

- Legacy: `[[USE_DATA(user.profile.name)]]`
- Preferred: `<@@>data.user.profile.name</@@>`

## Compatibility Window

- Legacy syntax is still supported for backwards compatibility.
- New templates should use `<@@...@@>` tags and `<@@>...</@@>` placeholders.
