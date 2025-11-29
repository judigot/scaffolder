# Creative Book Manuscripts Project

This project helps book writers organize their writing using templates and YAML configuration. Writers can easily rearrange sections, chapters, and scenes by simply updating the YAML file.

## Features

- **Template-Based Writing**: Write sections as separate template files
- **Easy Reorganization**: Rearrange sections by editing YAML order
- **Progress Tracking**: Track word count and completion status
- **Metadata Management**: Store notes, POV, locations, characters per section
- **Multiple Outputs**: Generate complete manuscript, outline, and progress reports

## Data Structure

### Book Manuscript Data (`info.yaml`)

Located at: `/DataSources/Creative-Book-Manuscripts/{book-name}/info.yaml`

**Structure:**
```yaml
book:
  title: "Book Title"
  author: "Author Name"
  genre: "Genre"
  target-word-count: 100000
  current-word-count: 87500

structure:
  order:
    - "prologue"
    - "part-1"
    - "part-2"
    - "epilogue"

parts:
  - id: "part-1"
    title: "Part One: Title"
    type: "part"
    word-count: 30000
    order: 1
    chapters:
      - "chapter-01"
      - "chapter-02"

sections:
  chapters:
    chapter-01:
      title: "Chapter Title"
      content-file: "./sections/chapters/chapter-01.txt"
      word-count: 3500
      pov: "Character Name"
      location: "Location"
      characters: ["Character 1", "Character 2"]
      summary: "Chapter summary"
      notes: "Writer's notes"
```

### Section Content Files

Store actual writing content in separate text files:
- `sections/prologue/scene-001.txt`
- `sections/chapters/chapter-01.txt`
- `sections/epilogue/scene-099.txt`

## How to Use

### 1. Create Book Structure

Create a folder in `/DataSources/Creative-Book-Manuscripts/` with your book name:
```
/DataSources/Creative-Book-Manuscripts/my-book/
  ├── info.yaml
  └── sections/
      ├── prologue/
      │   └── scene-001.txt
      ├── chapters/
      │   ├── chapter-01.txt
      │   ├── chapter-02.txt
      │   └── ...
      └── epilogue/
          └── scene-099.txt
```

### 2. Write Sections

Write each section (chapter, scene, etc.) as a separate text file in the `sections/` directory.

### 3. Organize in YAML

Edit `info.yaml` to:
- Define the order of parts and chapters
- Add metadata for each section (POV, location, characters, notes)
- Track word counts
- Add writer's notes

### 4. Rearrange Easily

To rearrange sections, simply:
1. Update the `order` array in `structure.parts`
2. Update the `chapters` or `scenes` arrays in each part
3. Regenerate the manuscript

**Example - Moving Chapter 3 before Chapter 2:**

**Before:**
```yaml
chapters:
  - "chapter-01"
  - "chapter-02"
  - "chapter-03"
```

**After:**
```yaml
chapters:
  - "chapter-01"
  - "chapter-03"
  - "chapter-02"
```

### 5. Generate Outputs

The project generates three outputs:
- **Complete Manuscript**: Full book with all sections in order
- **Book Outline**: Structured outline with metadata
- **Progress Report**: Word count and completion tracking

## Benefits

### For Writers

1. **Organization**: Keep all writing organized in one place
2. **Flexibility**: Easily rearrange sections without copy-pasting
3. **Version Control**: Track changes using Git
4. **Metadata**: Store notes, POV, locations with each section
5. **Progress Tracking**: Monitor word count and completion
6. **Template Reuse**: Reuse section templates across projects

### Workflow Example

1. **Write Sections**: Create individual chapter/scene files
2. **Organize**: Define structure in YAML
3. **Generate**: Create complete manuscript automatically
4. **Revise**: Update YAML to rearrange sections
5. **Regenerate**: Create new version with updated order

## Example: Rearranging Chapters

**Original Order:**
```yaml
chapters:
  - "chapter-01"
  - "chapter-02"
  - "chapter-03"
```

**New Order (Chapter 3 moved before Chapter 2):**
```yaml
chapters:
  - "chapter-01"
  - "chapter-03"
  - "chapter-02"
```

Simply regenerate the manuscript - the new order is automatically applied!

## Tips

1. **Consistent Naming**: Use consistent naming for sections (chapter-01, chapter-02, etc.)
2. **Metadata**: Fill in POV, location, characters for each section - helps with consistency
3. **Notes**: Use the notes field to track revision needs, plot points, etc.
4. **Word Counts**: Update word counts regularly for accurate progress tracking
5. **Version Control**: Commit changes to Git to track different versions of your manuscript structure

## Output Files

### Complete Manuscript (`{book-title}-Manuscript.md`)
- Full book with all sections in order
- Includes all content from section files
- Word count and metadata at the end

### Book Outline (`{book-title}-Outline.md`)
- Structured outline showing book organization
- Section metadata (POV, location, characters)
- Progress tracking

### Progress Report (`{book-title}-Progress.md`)
- Word count progress
- Section completion status
- Writer's notes and next steps

