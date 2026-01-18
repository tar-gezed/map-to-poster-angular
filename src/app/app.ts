import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { forkJoin, switchMap, tap, catchError, of } from 'rxjs';

import { PosterControlsComponent } from './components/poster-controls/poster-controls';
import { MapPreviewComponent } from './components/map-preview/map-preview';
import { PosterViewComponent } from './components/poster-view/poster-view';
import { GeocodingService } from './services/geocoding.service';
import { OverpassService } from './services/overpass.service';
import { ThemeService, Theme } from './services/theme.service';
import { OsmData } from './services/poster.service';

@Component({
  selector: 'app-root',
  imports: [
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatSnackBarModule,
    PosterControlsComponent,
    MapPreviewComponent,
    PosterViewComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  private geocoding = inject(GeocodingService);
  private overpass = inject(OverpassService);
  private themeService = inject(ThemeService);
  private snackBar = inject(MatSnackBar);

  // State
  isLoading = false;
  city = 'Paris';
  country = 'France';
  distance = 10000;
  lat = 48.8566;
  lon = 2.3522;
  theme: Theme | null = null;
  roadsData: OsmData | null = null;
  waterData: OsmData | null = null;
  parksData: OsmData | null = null;

  async onGenerate(data: { city: string; country: string; distance: number; theme: string | Theme }) {
    this.isLoading = true;
    this.city = data.city;
    this.country = data.country;
    this.distance = data.distance;

    // 1. Geocode
    this.geocoding.search(data.city, data.country).pipe(
      switchMap(results => {
        if (!results || results.length === 0) {
          throw new Error('City not found');
        }
        const res = results[0];
        this.lat = parseFloat(res.lat);
        this.lon = parseFloat(res.lon);

        // 2. Load Theme
        if (typeof data.theme === 'string') {
          return this.themeService.loadTheme(data.theme);
        } else {
          return of(data.theme);
        }
      }),
      switchMap(theme => {
        this.theme = theme;
        const bbox = this.overpass.getBbox(this.lat, this.lon, this.distance);

        // 3. Fetch Data in parallel
        return forkJoin({
          roads: this.overpass.fetchRoads(bbox),
          water: this.overpass.fetchWater(bbox),
          parks: this.overpass.fetchParks(bbox)
        });
      }),
      tap({
        next: (results) => {
          this.roadsData = results.roads;
          this.waterData = results.water;
          this.parksData = results.parks;
          this.isLoading = false;
        },
        error: (err) => {
          console.error(err);
          this.snackBar.open(`Error: ${err.message}`, 'Close', { duration: 5000 });
          this.isLoading = false;
        }
      })
    ).subscribe();
  }
}
