# Screencast capability showcase

This fixture lets Scaffolder exercise the current verified `judigot/app-screencast` recording foundation against public websites.

The workflow records:

- a 1920x1080 side-by-side video with two independent browser contexts;
- a sequential multi-window video that switches between retained contexts;
- the fake macOS-style pointer;
- window labels;
- typing and pointer-focused zoom;
- scrolling;
- full captured-duration H.264 export.

The public-site fixture currently uses Playwright documentation and Wikipedia to avoid depending on a host application.

This is a capability demo, not the canonical evidence showcase. Audio/narration, evidence manifests, host adapters, and the five-job benchmark remain separate implementation stages.
