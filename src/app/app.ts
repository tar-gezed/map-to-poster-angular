import { Component, inject, signal, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

import { GeocodingService, GeocodingResult } from './services/geocoding.service';
import { ThemeService, Theme } from './services/theme.service';
import { OverpassService } from './services/overpass.service';
import { PosterService } from './services/poster.service';

import { MapPreviewComponent } from './components/map-preview/map-preview';
import { PosterViewComponent } from './components/poster-view/poster-view';
import { SearchBarComponent } from './components/search-bar/search-bar.component';
import { StyleSelectorComponent } from './components/style-selector/style-selector.component';
import { DistanceControlComponent } from './components/distance-control/distance-control.component';
import { ToastContainerComponent, ToastService } from './components/toast/toast.component';
import { SidebarStyleSelectorComponent } from './components/sidebar-style-selector/sidebar-style-selector.component';
import { ViewChild } from '@angular/core'; // Ensure ViewChild is imported
import { forkJoin, catchError, of } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    MapPreviewComponent,
    PosterViewComponent,
    SearchBarComponent,
    StyleSelectorComponent,
    DistanceControlComponent,
    ToastContainerComponent,
    SidebarStyleSelectorComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  private geocodingService = inject(GeocodingService);
  private themeService = inject(ThemeService);
  private overpassService = inject(OverpassService);
  private toastService = inject(ToastService);

  // State
  lat = signal(45.1885); // Grenoble
  lon = signal(5.7245);
  distance = signal(10000); // Default distance 10km

  city = signal('Grenoble');
  country = signal('France');

  themes = this.themeService.getAvailableThemes();
  currentThemeName = signal('midnight_blue');
  currentTheme = signal<Theme | null>(null);

  // Data for Poster
  roadsData = signal<any>(null);
  waterData = signal<any>(null);
  parksData = signal<any>(null);
  isLoading = signal(false);

  // UI State
  showPoster = signal(false);

  constructor() {
    // Load initial theme
    this.loadTheme(this.currentThemeName());
  }

  onLocationSelected(result: GeocodingResult) {
    this.lat.set(parseFloat(result.lat));
    this.lon.set(parseFloat(result.lon));

    // Extract city/country from display_name roughly or use what we have
    const parts = result.display_name.split(', ');
    this.city.set(parts[0]);
    this.country.set(parts[parts.length - 1]);

    // Reset poster view when location changes
    this.showPoster.set(false);
  }

  onThemeSelected(themeName: string) {
    this.currentThemeName.set(themeName);
    this.loadTheme(themeName);
    this.toastService.show(`Theme '${themeName}' selected.`, 'info');
  }

  loadTheme(name: string) {
    this.themeService.loadTheme(name).subscribe(theme => {
      this.currentTheme.set(theme);
    });
  }

  @ViewChild(PosterViewComponent) posterView?: PosterViewComponent;

  /**
   * Closes the poster view and releases OSM data from memory.
   * This is critical for memory management with large datasets.
   */
  closePoster() {
    this.showPoster.set(false);

    // Release OSM data from memory - critical for large areas
    this.roadsData.set(null);
    this.waterData.set(null);
    this.parksData.set(null);
  }

  generatePoster() {
    // Warning for large areas
    if (this.distance() > 15000) {
      this.toastService.show('⚠️ Large area selected. This may take a while and use significant memory.', 'info');
    }

    this.isLoading.set(true);
    this.showPoster.set(true);

    // Poster is 3:4 aspect ratio (Portrait)
    // distance() is the horizontal radius. Vertical radius should be larger.
    const distY = this.distance() * (4 / 3);
    const bbox = this.overpassService.getBbox(this.lat(), this.lon(), this.distance(), distY);

    // For large areas (>10km), exclude minor roads to reduce data and memory usage
    const excludeMinorRoads = this.distance() > 10000;

    forkJoin({
      roads: this.overpassService.fetchRoads(bbox, excludeMinorRoads),
      water: this.overpassService.fetchWater(bbox),
      parks: this.overpassService.fetchParks(bbox)
    }).pipe(
      catchError(err => {
        console.error('Error fetching data', err);
        this.toastService.show('Error fetching map data. Try a smaller area or different location.', 'error');
        this.isLoading.set(false);
        this.showPoster.set(false);
        return of(null);
      })
    ).subscribe(data => {
      if (data) {
        this.roadsData.set(data.roads);
        this.waterData.set(data.water);
        this.parksData.set(data.parks);
      }
      this.isLoading.set(false);
    });
  }

  resolution = signal(2); // Default 2x (QHD ish)

  downloadPoster(res: number) {
    this.posterView?.download(res);
  }
}
