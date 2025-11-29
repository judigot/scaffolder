# USE_DATA Template Command Guide

## Overview
The `USE_DATA` command allows you to access data from external YAML files within templates. It's primarily used with `LOOP_FOLDERS` to access data from each matched folder's data file.

## Syntax

```
[[USE_DATA(property-path)]]
```

### Parameters

- **property-path**: Dot-notation path to the data property you want to access. Supports nested properties and array indices.

## How It Works

1. **Data Context**: When a template is processed with a data context (e.g., from `LOOP_FOLDERS`), the `USE_DATA` command can access any property in that context.
2. **Property Resolution**: The system resolves the property path through the flattened data structure.
3. **Value Conversion**: Values are automatically converted to strings for display.

## Data Access Patterns

### Simple Properties
```yaml
name: John Doe
```
```
[[USE_DATA(name)]]
```
Output: `John Doe`

### Nested Properties
```yaml
basic-info:
  name: John Doe
  email: john@example.com
```
```
[[USE_DATA(basic-info.name)]]
[[USE_DATA(basic-info.email)]]
```
Output:
- `John Doe`
- `john@example.com`

### Deeply Nested Properties
```yaml
user:
  profile:
    contact:
      email: john@example.com
```
```
[[USE_DATA(user.profile.contact.email)]]
```
Output: `john@example.com`

### Array Access
```yaml
languages:
  - English
  - Spanish
  - French
```

**Full Array:**
```
[[USE_DATA(languages)]]
```
Output: `English, Spanish, French`

**Indexed Access:**
```
[[USE_DATA(languages[0])]]
[[USE_DATA(languages[1])]]
[[USE_DATA(languages[2])]]
```
Output:
- `English`
- `Spanish`
- `French`

### Array of Objects
```yaml
skills:
  - name: JavaScript
    level: Expert
  - name: TypeScript
    level: Advanced
```

**Access individual properties:**
```
[[USE_DATA(skills[0].name)]] - [[USE_DATA(skills[0].level)]]
[[USE_DATA(skills[1].name)]] - [[USE_DATA(skills[1].level)]]
```
Output:
- `JavaScript - Expert`
- `TypeScript - Advanced`

## Value Type Handling

### Strings
```yaml
name: John Doe
```
```
[[USE_DATA(name)]]
```
Output: `John Doe`

### Numbers
```yaml
age: 30
```
```
[[USE_DATA(age)]]
```
Output: `30`

### Booleans
```yaml
active: true
```
```
[[USE_DATA(active)]]
```
Output: `true`

### Arrays
```yaml
tags:
  - frontend
  - react
  - typescript
```
```
[[USE_DATA(tags)]]
```
Output: `frontend, react, typescript`

### Objects
```yaml
address:
  street: 123 Main St
  city: Anytown
```
```
[[USE_DATA(address)]]
```
Output: `{"street":"123 Main St","city":"Anytown"}` (JSON stringified)

### Null/Undefined
```yaml
optional-field: null
```
```
[[USE_DATA(optional-field)]]
```
Output: (empty string)

## Usage with LOOP_FOLDERS

The `USE_DATA` command is most commonly used with `LOOP_FOLDERS`:

**structure.yaml:**
```yaml
LOOP_FOLDERS({{basic-info.name}}'s-Resume.html --data-source=/Employees/**/info.yaml --template=./templates/Resume.txt)
```

**info.yaml:**
```yaml
basic-info:
  name: John Doe
  email: john.doe@example.com
  phone: 123-456-7890
languages:
  - English
  - Spanish
```

**Resume.txt template:**
```html
<!DOCTYPE html>
<html>
<head>
  <title>Resume - [[USE_DATA(basic-info.name)]]</title>
</head>
<body>
  <h1>[[USE_DATA(basic-info.name)]]</h1>
  <div class="contact">
    Email: [[USE_DATA(basic-info.email)]]
    Phone: [[USE_DATA(basic-info.phone)]]
  </div>
  <div class="languages">
    Languages: [[USE_DATA(languages)]]
  </div>
</body>
</html>
```

## Special Data Properties

When used with `LOOP_FOLDERS`, additional properties are available:

### Folder Information
```
[[USE_DATA(folderName)]]
[[USE_DATA(folderPath)]]
[[USE_DATA(name)]]
```

- `folderName`: Name of the folder containing the data file
- `folderPath`: Full path to the folder
- `name`: Alias for `folderName`

## Examples

### Example 1: Simple Resume Template
```html
<!DOCTYPE html>
<html>
<head>
  <title>[[USE_DATA(basic-info.name)]] - Resume</title>
</head>
<body>
  <header>
    <h1>[[USE_DATA(basic-info.name)]]</h1>
    <p>[[USE_DATA(basic-info.email)]] | [[USE_DATA(basic-info.phone)]]</p>
  </header>
  <section>
    <h2>Education</h2>
    <p>[[USE_DATA(basic-info.education)]]</p>
  </section>
  <section>
    <h2>Languages</h2>
    <p>[[USE_DATA(languages)]]</p>
  </section>
</body>
</html>
```

### Example 2: Configuration File
```json
{
  "name": "[[USE_DATA(name)]]",
  "version": "[[USE_DATA(version)]]",
  "environment": "[[USE_DATA(environment)]]",
  "database": {
    "host": "[[USE_DATA(database.host)]]",
    "port": [[USE_DATA(database.port)]]
  }
}
```

### Example 3: Using Array Indices
```html
<h2>Top Skills</h2>
<ul>
  <li>[[USE_DATA(skills[0].name)]] - [[USE_DATA(skills[0].level)]]</li>
  <li>[[USE_DATA(skills[1].name)]] - [[USE_DATA(skills[1].level)]]</li>
  <li>[[USE_DATA(skills[2].name)]] - [[USE_DATA(skills[2].level)]]</li>
</ul>
```

### Example 4: Conditional Display
Combine with other template features:
```html
<div class="profile">
  <h1>[[USE_DATA(basic-info.name)]]</h1>
  {{#if basic-info.email}}
  <p>Email: [[USE_DATA(basic-info.email)]]</p>
  {{/if}}
</div>
```

## Best Practices

1. **Use Descriptive Property Names**: Make data paths clear and self-documenting
2. **Handle Missing Data**: Consider using conditional logic for optional fields
3. **Flatten Complex Structures**: Use dot notation for nested properties
4. **Array Handling**: Use indexed access for specific array items, or display the full array as comma-separated
5. **Type Awareness**: Remember that all values are converted to strings

## Common Patterns

### Display Full Name
```yaml
first-name: John
last-name: Doe
```
```
[[USE_DATA(first-name)]] [[USE_DATA(last-name)]]
```

### Display Address
```yaml
address:
  street: 123 Main St
  city: Anytown
  state: CA
  zip: 12345
```
```
[[USE_DATA(address.street)]], [[USE_DATA(address.city)]], [[USE_DATA(address.state)]] [[USE_DATA(address.zip)]]
```

### Display List
```yaml
items:
  - Item 1
  - Item 2
  - Item 3
```
```
[[USE_DATA(items)]]
```
Output: `Item 1, Item 2, Item 3`

## Limitations

- Only works when a data context is available (e.g., from `LOOP_FOLDERS`)
- Returns empty string for missing properties
- All values are converted to strings
- Complex objects are JSON stringified
- Arrays are comma-separated when accessed directly

## See Also

- `LOOP_FOLDERS` - Project action that provides data context for `USE_DATA`
- `USE_FORM_DATA` - Access form data instead of file data
- `USE_USER_ENV` - Access user environment variables
- `USE_TEMPLATE` - Include other templates

