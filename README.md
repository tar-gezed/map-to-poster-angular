# 🗺️ Map To Poster (Angular)

[![Angular](https://img.shields.io/badge/Angular-21+-DD0031.svg?logo=angular&logoColor=white)](https://angular.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub Pages](https://img.shields.io/badge/Deployed%20to-GitHub%20Pages-222222.svg?logo=github&logoColor=white)](https://tar-gezed.github.io/map-to-poster-angular/)

**Map To Poster** is a high-performance web application designed to generate beautiful, minimalist city map posters. Ported from the original [Python CLI version](https://github.com/originalankur/maptoposter), this Angular implementation brings the power of cartographic art directly to your browser with real-time interactivity.

✨ **[View Live Demo](https://tar-gezed.github.io/map-to-poster-angular/)** ✨

---

## 🚀 Key Features

- 📍 **Interactive Location Search**: Search for any city or landmark worldwide using Nominatim geocoding.
- 🎨 **17+ Premium Themes**: Choose from curated styles like *Neon Cyberpunk*, *Japanese Ink*, *Midnight Blue*, and *Terracotta*.
- 🔍 **Real-time Preview**: Adjust the map position and zoom levels with an interactive Leaflet-powered interface.
- 🖼️ **4K Export**: Generate high-resolution (up to 4K) PNG posters suitable for professional printing.
- ⚡ **Client-Side Processing**: All rendering is done locally in your browser using Konva.js—no backend required.
- 📱 **Responsive Design**: Optimized for both desktop and mobile viewing with a sleek, modern UI.

---

## 📸 Preview

| Neon Cyberpunk | Japanese Ink | Midnight Blue |
|:---:|:---:|:---:|
| <img src="https://raw.githubusercontent.com/originalankur/maptoposter/main/posters/singapore_neon_cyberpunk_20260108_184503.png" width="250"> | <img src="https://raw.githubusercontent.com/originalankur/maptoposter/main/posters/tokyo_japanese_ink_20260108_165830.png" width="250"> | <img src="https://raw.githubusercontent.com/originalankur/maptoposter/main/posters/dubai_midnight_blue_20260108_174920.png" width="250"> |

---

## 🛠️ Tech Stack

- **Framework**: [Angular 21](https://angular.dev) (vNext) using **Signals** for reactive state management.
- **Map Preview**: [Leaflet](https://leafletjs.com/) for interactive map selection.
- **Graphics Engine**: [Konva.js](https://konvajs.org/) for high-resolution canvas rendering.
- **Data Source**: [OpenStreetMap](https://www.openstreetmap.org/) via [Overpass API](https://overpass-api.de/).
- **Styling**: [Sass (SCSS)](https://sass-lang.com/) with a focus on modern, glassmorphic aesthetics.

---

## 🏁 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.x or higher)
- [npm](https://www.npmjs.com/)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/tar-gezed/map-to-poster-angular.git
   cd map-to-poster-angular
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Development
Run the development server:
```bash
npm start
```
Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

### Build
Build the project for production:
```bash
npm run build
```
The build artifacts will be stored in the `dist/` directory.

---

## 🚢 Deployment

The project is configured for GitHub Pages. To deploy your own version:

1. Build with the correct base-href:
   ```bash
   ng build --base-href /map-to-poster-angular/
   ```
2. Deploy the contents of `dist/maptoposter/browser` to your `gh-pages` branch.

---

## 🤝 Contributing

Contributions are welcome! Whether it's adding new themes, optimizing the rendering engine, or fixing bugs, feel free to open an issue or submit a pull request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 💖 Acknowledgments & Credits

This project is an Angular port of the excellent [City Map Poster Generator](https://github.com/originalankur/maptoposter) created by **[Ankur Singh (originalankur)](https://github.com/originalankur)**.

A huge thank you to Ankur for his inspiring work on the original Python CLI version, the beautiful default themes, and the robust logic for processing OpenStreetMap data that made this web version possible.

Additional thanks to:
- Map data by [© OpenStreetMap contributors](https://www.openstreetmap.org/copyright).
- Theme inspirations from various minimalist cartography projects.

---
<p align="center">Made with ❤️ by Targezed</p>
