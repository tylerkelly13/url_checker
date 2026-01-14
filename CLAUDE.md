# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A CLI tool for checking broken links on web pages. It fetches a page, optionally selects a portion via CSS selector, extracts all URLs from various HTML elements, validates them (including anchor links), and outputs results to CSV, JSON, or YAML format.

## Development Commands

### Building
```bash
pnpm build           # Install dependencies and compile TypeScript
pnpm packer          # Build and create npm package
```

### Testing
```bash
pnpm test            # Run all tests once
pnpm test:watch      # Run tests in watch mode
pnpm test:ui         # Run tests with Vitest UI
pnpm test:coverage   # Run tests with coverage report
```

### Linting & Formatting
```bash
pnpm lint            # Check for lint errors
pnpm lint:fix        # Auto-fix lint errors
pnpm format          # Format code with Prettier
pnpm format:check    # Check if code is formatted
```

### Documentation
```bash
pnpm apis            # Generate TypeDoc documentation to docs/
```

## Architecture

### Core Data Flow

The application follows a pipeline architecture:

1. **CLI Entry** (`cli.ts`) - Parses arguments via Commander.js (`argParser.ts`)
2. **URL Validation** (`urlChecker.ts`) - Orchestrates the checking process
3. **HTTP Fetching** (`http.ts`) - Retrieves page content using Needle
4. **Content Selection** (`contentFunctions.ts`) - Uses JSDOM to parse HTML and optionally select a subset via CSS selector
5. **URL Extraction** (`contentFunctions.ts`) - Finds URLs in various HTML elements (a, img, script, etc.)
6. **URL Processing** (`urlFunctions.ts`) - Validates, completes, and checks each URL
7. **Output Formatting** (`csvOut.ts`, `jsonYamlOut.ts`) - Writes results to file

### Module Responsibilities

**`argParser.ts`**: Uses Commander.js to parse CLI arguments. Accepts URL, CSS selector, output file, and output format.

**`http.ts`**: HTTP operations using Needle library. Two key functions:
- `getContent()` - Fetches full page HTML
- `getStatus()` - HEAD/GET request to check URL status codes

**`contentFunctions.ts`**: HTML parsing with JSDOM. Defines which HTML elements contain URLs (via `urlElements` object mapping elements to attributes). Handles elements with single attributes (href, src) and multiple attributes (img with src/srcset, video with src/poster).

**`urlFunctions.ts`**: URL validation and processing. Key concepts:
- URL type detection via regex (`urlStarts` array): anchors, full URLs, implicit protocol, relative paths, parent directory references
- URL completion using native URL constructor for relative URLs
- Anchor checking: validates both page-level anchors (#id on same page) and anchored external URLs (https://example.com#section)
- Custom error codes: Uses status 000 for anchors, 999 for network failures

**`urlChecker.ts`**: Main orchestration function that chains promises to fetch parent page, select content, extract URLs, and validate each URL concurrently via `Promise.all()`.

**`csvOut.ts`**: Simple CSV output by mapping result objects to ordered arrays and joining with commas.

**`jsonYamlOut.ts`**: Groups results by parent URL using `resultsRestructure()` to create nested structure instead of flat array. Both JSON and YAML use this same restructured format.

### Key Types

**`results`** (from `urlFunctions.ts`): The canonical result object with fields:
- `parentURL`: Source page being checked
- `url`: URL that was found
- `status`: HTTP status code (or 000 for anchors, 999 for errors)
- `statusMsg`: HTTP status message
- `elem`: HTML element type (a, img, etc.)
- `anchored`: Boolean indicating if URL contains anchor
- `anchorExists`: Boolean indicating if anchor ID exists in target page

### Test Organization

Tests are colocated with source files using `*.test.ts` naming. Tests use Vitest with jsdom environment. Property-based testing with fast-check for URL validation edge cases.

## Package Manager

This project uses **pnpm**. Always use `pnpm` commands, not `npm` or `yarn`.

## TypeScript Configuration

- Target: ES6 with ES6 modules
- Strict mode enabled
- Source: `src/`
- Output: `dist/`
- Generates declaration files and source maps

## Code Style

### Workflow Requirements
**IMPORTANT**: After making ANY code changes, you MUST:
1. Run `pnpm lint:fix` to auto-fix linting issues
2. Run `pnpm format` to format code with Prettier
3. Run `pnpm lint` to verify all issues are resolved

This ensures code quality and consistency. Do not skip these steps.

### ESLint Rules (enforced)
- Prettier integration (errors on format violations)
- camelCase naming required
- Prefer arrow functions or function declarations (no function expressions)
- Prefer const over let
- Unused vars must start with underscore (or omit parameter entirely if not needed)

### Prettier Configuration
- Semicolons required
- Single quotes
- 2-space indentation
- 80 character line width
- No trailing commas

## Important Patterns

### URL Type Detection
The `urlStarts` regex array in `urlFunctions.ts` defines all supported URL patterns. Order matters - patterns are tested sequentially until first match. When adding new URL types, add both the regex pattern and handling in `urlConstructor()`.

### Element-Attribute Mapping
The `urlElements` object in `contentFunctions.ts` defines which HTML elements are checked for URLs. Some elements have multiple relevant attributes (array values). When adding support for new elements, update this object and tests.

### Async/Promise Chain
The main flow in `urlChecker.ts` chains promises and uses `Promise.all()` for concurrent URL checking. Avoid breaking this chain or converting to async/await without maintaining parallelism.

### Output Format Extension
To add new output formats:
1. Create function in new or existing output module
2. Accept `Promise<results[]>` and output filename
3. Add format option to `argParser.ts`
4. Add condition in `cli.ts` to call new formatter
