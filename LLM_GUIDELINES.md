# LLM Guidelines for Map Poster Generator

You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

## Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

## Accessibility Requirements

- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.

### Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in `@Component` decorator
- Prefer inline templates for small components
- Prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- When using external templates/styles, use paths relative to the component TS file.

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.
- Do not write arrow functions in templates (they are not supported).

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection


This document provides context and guidelines for LLMs (like Claude, Gemini, GPT) working on this Angular project.

## Project Overview
This is an Angular 19+ application that generates minimalist city map posters. It was ported from a Python CLI tool.
It uses:
- **Angular** (Standalone Components, Signals, Reactive Forms)
- **Angular Material** for UI
- **Leaflet** for map preview
- **Konva.js** for high-performance canvas rendering of the poster
- **Nominatim API** for geocoding
- **Overpass API** for fetching OpenStreetMap data

## Architecture

### Services
- `GeocodingService`: Fetches coordinates from Nominatim.
- `OverpassService`: Fetches raw OSM data (nodes/ways) for roads, water, and parks.
- `ThemeService`: Loads theme JSONs from assets.
- `PosterService`: Core logic. Processes OSM data (converts nodes to coordinates, projects to Mercator) and draws layers on a Konva Stage.

### Components
- `AppComponent`: Orchestrator. Manages state and data fetching.
- `PosterControlsComponent`: Form for user input (City, Country, Distance, Theme). Supports custom theme upload.
- `MapPreviewComponent`: Leaflet map showing the selected area.
- `PosterViewComponent`: Displays the generated poster and handles download.

## Key Concepts

### Data Flow
1. User enters City/Country.
2. `GeocodingService` gets lat/lon.
3. `OverpassService` fetches data for the bounding box (calculated from distance).
4. `PosterService` renders the data onto a Canvas (Konva).

### Styling
- Themes are JSON files defining colors for background, roads (by hierarchy), water, parks, and text.
- Fonts are loaded from `assets/fonts`.

### Coordinate System
- We use a simplified Web Mercator projection to map lat/lon to canvas X/Y.
- The map is centered on the city coordinates.

## Common Tasks

### Adding a New Theme
Create a JSON file in `public/assets/themes/` and add it to the list in `ThemeService`.

### improving Rendering
Modify `PosterService.ts`. The `drawWays` function handles drawing lines/polygons.
To add new features (e.g. railways), fetch them in `OverpassService` and add a drawing handler in `PosterService`.

### Deployment
The app is designed to be deployed on GitHub Pages or Vercel.
Build command: `ng build`
Output directory: `dist/maptoposter/browser`
