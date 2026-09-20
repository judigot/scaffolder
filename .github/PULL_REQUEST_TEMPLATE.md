<!--
Agentic PR contract

Keep this block intact. Paths in touch_set are repository path prefixes,
not globs. Declare the smallest ownership boundary that covers this PR.
Use "none" when there are no dependencies.

For a stacked PR, set stacked_on to the immediate prerequisite PR and
open this PR against that prerequisite branch. After the prerequisite
merges, retarget this PR to main and change stacked_on to main.
-->
<!-- agent-pr
depends_on: none
stacked_on: main
touch_set: src/example/
-->

## Summary

<!-- What does this PR implement? -->

## Acceptance criteria

- [ ] Implementation matches the task/PR shell.
- [ ] PR Gate passes.
- [ ] Changes stay inside the declared touch_set.
