# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development Commands

### Package Management
This project uses **Bun** as the package manager (evidenced by `bun.lock`).

```bash
# Install dependencies
bun install

# Add dependencies
bun add <package-name>
bun add -d <package-name>  # dev dependencies
```

### Development Server
```bash
# Start development server with Turbopack
bun dev

# Alternative: npm-style commands also work
bun run dev
```

The dev server runs on http://localhost:3000 with Turbopack for faster builds.

### Build and Deployment
```bash
# Build for production (uses Turbopack)
bun run build

# Start production server
bun run start
```

### TypeScript
```bash
# Type check the project
bunx tsc --noEmit
```

## Architecture Overview

### Technology Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS v4 with PostCSS
- **Fonts**: Geist Sans and Geist Mono via next/font/google
- **Package Manager**: Bun
- **Build Tool**: Turbopack (Next.js's Rust-based bundler)

### Project Structure
```
src/
├── app/                    # App Router directory (Next.js 13+)
│   ├── layout.tsx         # Root layout with fonts and metadata
│   ├── page.tsx           # Home page component
│   ├── globals.css        # Global styles with Tailwind imports
│   └── favicon.ico        # Favicon
public/                     # Static assets
```

### Key Configuration Files
- `next.config.ts`: Next.js configuration (currently minimal)
- `tsconfig.json`: TypeScript configuration with path aliases (`@/*` → `./src/*`)
- `postcss.config.mjs`: PostCSS configuration for Tailwind CSS v4
- `package.json`: Project dependencies and scripts

### Styling System
- Uses Tailwind CSS v4 (latest version)
- Custom CSS variables for theming (`--background`, `--foreground`)
- Dark mode support via `prefers-color-scheme`
- Inline theme configuration in `globals.css`

### Font Configuration
- Geist Sans: Primary font family
- Geist Mono: Monospace font for code
- Fonts are optimized via `next/font/google`
- CSS variables: `--font-geist-sans`, `--font-geist-mono`

### Development Notes
- The project is currently a fresh Next.js installation with default pages
- Uses the modern App Router architecture (not Pages Router)
- TypeScript is strictly configured
- Turbopack is enabled for both development and production builds