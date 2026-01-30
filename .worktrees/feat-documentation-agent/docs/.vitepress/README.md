# VitePress Configuration

This directory contains the VitePress configuration for the Scaffolder documentation site.

## Files

- `config.ts` - Main VitePress configuration file

## Usage

### Development Server

Start the development server to preview documentation locally:

```bash
pnpm docs:dev
```

The site will be available at `http://localhost:5173`

### Build Static Site

Build the documentation as static HTML files:

```bash
pnpm docs:build
```

Output will be in `docs/.vitepress/dist/`

### Preview Built Site

Preview the built static site locally:

```bash
pnpm docs:preview
```

## Deployment

The `docs/.vitepress/dist/` directory contains static HTML files that can be deployed to:

- GitHub Pages
- Netlify
- Vercel
- Any static hosting service

## Configuration

Edit `config.ts` to customize:

- Site title and description
- Navigation menu
- Sidebar structure
- Theme settings
- Search configuration

