# Template Linting

Use the new lint helper before running CI or shipping templates:

```
bun run lint:templates
```

It walks `files/Projects`, `files/Core`, and `files/Templates`, reads every `.txt` template, and runs `validateHtmlTemplateTags` from the project-builder utilities. The CLI reports every file with unbalanced `<@@IF@@>`/`<@@LOOP@@>` pairs, prints a summary, and exits with a non-zero status when problems are found.

This is the same check the IDE and CI can call, so it keeps template authors honest without running golden generation.
