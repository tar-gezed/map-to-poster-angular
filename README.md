# Map Poster Generator (Angular Version)

A web application to generate beautiful, minimalist city map posters. Ported from the [Python CLI version](https://github.com/originalankur/maptoposter).

## Features
- **Interactive UI**: Real-time preview of the area.
- **Customizable**: Choose from 17+ themes or upload your own.
- **High Resolution**: Exports 4K-ready PNG posters.
- **Client-Side**: Runs entirely in the browser (fetches data from OSM APIs).

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run Locally**
   ```bash
   ng serve
   ```
   Navigate to `http://localhost:4200`.

3. **Build**
   ```bash
   ng build
   ```
   The artifacts will be stored in the `dist/` directory.

## Deployment

### GitHub Pages
1. Build the project:
   ```bash
   ng build --base-href /maptoposter/
   ```
2. Deploy the `dist/maptoposter/browser` folder.

### Vercel
Simply connect your repository and set the build command to `ng build` and output directory to `dist/maptoposter/browser`.

## Technologies
- Angular 19+
- Angular Material
- Leaflet
- Konva.js
- OpenStreetMap (Nominatim & Overpass API)

## License
MIT
