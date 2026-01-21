import { Component, inject, signal, ChangeDetectionStrategy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

import { GeocodingService, GeocodingResult } from './services/geocoding.service';
import { ThemeService, Theme } from './services/theme.service';
import { OverpassService } from './services/overpass.service';
import { CategorizedMapData } from './services/overpass.types';

import { MapPreviewComponent } from './components/map-preview/map-preview';
import { PosterViewComponent } from './components/poster-view/poster-view';
import { SearchBarComponent } from './components/search-bar/search-bar.component';
import { StyleSelectorComponent } from './components/style-selector/style-selector.component';
import { DistanceControlComponent } from './components/distance-control/distance-control.component';
import { ToastContainerComponent, ToastService } from './components/toast/toast.component';
import { SidebarStyleSelectorComponent } from './components/sidebar-style-selector/sidebar-style-selector.component';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, of } from 'rxjs';

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

  // Data for Poster - now using CategorizedMapData structure
  mapData = signal<CategorizedMapData | null>(null);
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
    this.mapData.set(null);
  }

  generatePoster() {
    // Warning for large areas
    if (this.distance() > 15000) {
      this.toastService.show('⚠️ Large area selected. This may take a while and use significant memory.', 'info');
    }

    this.showPoster.set(false);
    this.isLoading.set(true);

    // Poster is 3:4 aspect ratio (Portrait)
    // distance() is the horizontal radius. Vertical radius should be larger.
    const distY = this.distance() * (4 / 3);
    const bbox = this.overpassService.getBbox(this.lat(), this.lon(), this.distance(), distY);

    // For large areas (>10km), exclude minor roads to reduce data and memory usage
    const excludeMinorRoads = this.distance() > 10000;

    // Smart API call - auto-selects between unified or parallel queries
    // <= 15km: unified query (lower latency)
    // > 15km: parallel queries (reduces timeout risk)
    this.overpassService.fetchMapDataSmart(bbox, excludeMinorRoads, this.distance()).pipe(
      catchError((err: HttpErrorResponse) => {
        console.error('Error fetching data', err);

        let message = 'Error fetching map data. Try a smaller area or different location.';
        if (err.status === 504) {
          message = 'Server timeout (504). Try a smaller area.';
        } else if (err.status === 429) {
          message = 'Too many requests (429). Please wait a bit.';
        } else if (err.status === 400) {
          message = 'Bad request (400). The area may be too large.';
        }

        this.toastService.show(message, 'error');
        this.isLoading.set(false);
        return of(null);
      })
    ).subscribe(data => {
      if (data) {
        this.mapData.set(data);
        this.showPoster.set(true);
      }
      this.isLoading.set(false);
    });
  }

  resolution = signal(2); // Default 2x (QHD ish)

  downloadPoster(res: number) {
    this.posterView?.download(res);
  }
}
