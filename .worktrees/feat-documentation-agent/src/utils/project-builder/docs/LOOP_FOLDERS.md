# LOOP_FOLDERS Action Guide

## Overview
The `LOOP_FOLDERS` action allows you to generate multiple files by iterating over folders that match a glob pattern. Each matching folder's data file (typically YAML) is used to generate a separate output file with dynamic content.

## Syntax

```
LOOP_FOLDERS(filename --data-source=pattern --template=path)
```

### Parameters

- **filename**: The output filename pattern. Can contain placeholders that will be replaced with data from each matched folder.
- **--data-source**: Glob pattern to find data files (typically YAML files) in folders. Supports recursive wildcards (`**`).
- **--template**: Path to the template file to use for generating content. Can be absolute or relative.

### Flag Formats

Both formats are supported:
- `--flag=value` (equals sign)
- `--flag value` (space separator)

## How It Works

1. **Pattern Matching**: The system searches for files matching the `--data-source` glob pattern across the file structure.
2. **Data Extraction**: For each match, it:
   - Parses the YAML data file
   - Flattens nested data structures
   - Extracts folder information (name, path)
3. **File Generation**: For each matched folder:
   - Replaces placeholders in the filename with data values
   - Loads the template content
   - Processes the template with the folder's data context
   - Generates a unique output file

## Glob Pattern Examples

### Recursive Search
```
/Employees/**/info.yaml
```
Matches `info.yaml` files in any subfolder under `Employees/`.

### Specific Depth
```
/Employees/*/info.yaml
```
Matches `info.yaml` files exactly one level deep under `Employees/`.

### Wildcard Filename
```
/Employees/**/*.yaml
```
Matches any YAML file in any subfolder under `Employees/`.

## Data Context

Each generated file has access to:

### Flattened Data
All YAML data is flattened for easy access:
```yaml
basic-info:
  name: John Doe
  email: john@example.com
```
Becomes accessible as:
- `basic-info.name` → "John Doe"
- `basic-info.email` → "john@example.com"
- `basic-info` → (original object)

### Folder Information
- `folderName`: The name of the folder containing the data file
- `folderPath`: The full path to the folder
- `name`: Alias for `folderName`

### Array Handling
Arrays are flattened with indexed access:
```yaml
languages:
  - English
  - Spanish
```
Becomes:
- `languages` → "English, Spanish"
- `languages[0]` → "English"
- `languages[1]` → "Spanish"

## Template Processing

Templates used with `LOOP_FOLDERS` can use:

### Placeholders
Standard placeholders using `{{property}}` syntax:
```
{{basic-info.name}}'s Resume
```

### USE_DATA Command
Access data from the matched folder's YAML file:
```
[[USE_DATA(basic-info.name)]]
[[USE_DATA(languages)]]
```

### Other Template Commands
All standard template commands work:
- `[[USE_TEMPLATE(...)]]` - Include other templates
- `[[USE_FORM_DATA(...)]]` - Access form data
- `[[USE_USER_ENV(...)]]` - Access user environment variables
- `[[LOOP(...)]]` - Iterate over data

## Examples

### Example 1: Generate Resumes

**Structure:**
```
Employees/
  ├── john-doe/
  │   └── info.yaml
  └── jane-smith/
      └── info.yaml
Projects/
  └── Employee-Files/
      ├── structure.yaml
      └── templates/
          └── Resume.txt
```

**structure.yaml:**
```yaml
LOOP_FOLDERS({{basic-info.name}}'s-Resume.html --data-source=/Employees/**/info.yaml --template=./templates/Resume.txt)
```

**info.yaml (john-doe):**
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
```
<!DOCTYPE html>
<html>
<head>
  <title>Resume - [[USE_DATA(basic-info.name)]]</title>
</head>
<body>
  <h1>[[USE_DATA(basic-info.name)]]</h1>
  <p>Email: [[USE_DATA(basic-info.email)]]</p>
  <p>Phone: [[USE_DATA(basic-info.phone)]]</p>
  <p>Languages: [[USE_DATA(languages)]]</p>
</body>
</html>
```

**Output:**
- `John Doe's-Resume.html` (generated from john-doe/info.yaml)
- `Jane Smith's-Resume.html` (generated from jane-smith/info.yaml)

### Example 2: Generate Configuration Files

**structure.yaml:**
```yaml
LOOP_FOLDERS(config-{{name}}.json --data-source=/Environments/**/config.yaml --template=./templates/config.txt)
```

This generates a configuration file for each environment folder.

### Example 3: Nested Data Access

**info.yaml:**
```yaml
user:
  profile:
    firstName: John
    lastName: Doe
```

**Template:**
```
Name: [[USE_DATA(user.profile.firstName)]] [[USE_DATA(user.profile.lastName)]]
```

## Relative Template Paths

When using relative template paths (starting with `./` or `../`), the path is resolved relative to the project YAML file's directory.

**Example:**
```
Projects/
  └── Employee-Files/
      ├── structure.yaml
      └── templates/
          └── Resume.txt
```

In `structure.yaml`:
```yaml
LOOP_FOLDERS(file.html --data-source=/Employees/**/info.yaml --template=./templates/Resume.txt)
```

The template path `./templates/Resume.txt` resolves to `/Projects/Employee-Files/templates/Resume.txt`.

## Best Practices

1. **Use Descriptive Filenames**: Include data values in filenames to make outputs identifiable
2. **Organize Data Files**: Keep data files in consistent locations for easier glob patterns
3. **Flatten Complex Data**: Use dot notation for nested properties in templates
4. **Handle Missing Data**: Use conditional logic in templates for optional fields
5. **Test Glob Patterns**: Verify your patterns match the intended files before generating

## Common Patterns

### Generate One File Per Employee
```yaml
LOOP_FOLDERS({{name}}-profile.html --data-source=/Employees/**/info.yaml --template=./templates/profile.txt)
```

### Generate Files from Multiple Sources
Use multiple `LOOP_FOLDERS` entries:
```yaml
- LOOP_FOLDERS({{name}}-resume.html --data-source=/Employees/**/info.yaml --template=./templates/resume.txt)
- LOOP_FOLDERS({{name}}-contract.html --data-source=/Employees/**/contract.yaml --template=./templates/contract.txt)
```

### Dynamic Filenames with Multiple Properties
```yaml
LOOP_FOLDERS({{basic-info.name}}-{{basic-info.id}}.html --data-source=/Employees/**/info.yaml --template=./templates/resume.txt)
```

## Limitations

- Data files must be valid YAML
- Glob patterns are resolved at build time
- Empty or invalid YAML files result in empty data context
- Files with empty content after processing are filtered out

## See Also

- `USE_DATA` - Template command for accessing data in templates
- `FILE_LOOP` - Alternative action for looping over files instead of folders
- `FOLDER_LOOP` - For creating dynamic folder structures

