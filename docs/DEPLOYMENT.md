# GitHub Pages Deployment Guide

This documentation site is configured to deploy automatically to GitHub Pages using GitHub Actions.

## Setup Instructions

### 1. Enable GitHub Pages

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Pages**
3. Under **Source**, select **GitHub Actions** (not "Deploy from a branch")
4. Save the settings

### 2. Repository Name Configuration

The base path is automatically set based on your repository name. If your repository is named `scaffolder`, the docs will be available at:

```
https://yourusername.github.io/scaffolder/
```

If you need to change the base path, edit `.github/workflows/docs.yml`:

```yaml
VITEPRESS_BASE: /your-repo-name/
```

And update `docs/.vitepress/config.ts`:

```typescript
base: '/your-repo-name/',
```

### 3. Custom Domain (Optional)

If you're using a custom domain:

1. Update `docs/.vitepress/config.ts`:
   ```typescript
   base: '/',
   ```

2. Add your custom domain in GitHub Pages settings
3. Configure DNS as instructed by GitHub

### 4. Deployment

The site deploys automatically when you:

- Push to `main` or `master` branch
- Manually trigger the workflow from the **Actions** tab

### 5. View Your Site

After deployment, your site will be available at:

```
https://yourusername.github.io/your-repo-name/
```

## Local Development

To preview the site locally:

```bash
pnpm docs:dev
```

To build the site locally:

```bash
pnpm docs:build
```

The built files will be in `docs/.vitepress/dist/`

## Troubleshooting

### 404 Errors

- Check that the `base` path in `config.ts` matches your repository name
- Ensure GitHub Pages is set to use **GitHub Actions** as the source
- Verify the workflow completed successfully in the **Actions** tab

### Build Failures

- Check the workflow logs in the **Actions** tab
- Ensure all dependencies are listed in `package.json`
- Verify Node.js and pnpm versions are compatible

### Assets Not Loading

- Verify the `base` path is correct (must start and end with `/`)
- Check that relative paths in markdown files use the correct format
- Clear browser cache

