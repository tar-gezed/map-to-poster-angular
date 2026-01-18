import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface Theme {
    name: string;
    description?: string;
    bg: string;
    text: string;
    gradient_color: string;
    water: string;
    parks: string;
    road_motorway: string;
    road_primary: string;
    road_secondary: string;
    road_tertiary: string;
    road_residential: string;
    road_default: string;
}

@Injectable({
    providedIn: 'root'
})
export class ThemeService {
    private http = inject(HttpClient);
    private themesPath = 'assets/themes/';

    // List of themes from the python repo
    private availableThemes = [
        'autumn', 'blueprint', 'contrast_zones', 'copper_patina', 'feature_based',
        'forest', 'gradient_roads', 'japanese_ink', 'midnight_blue', 'monochrome_blue',
        'neon_cyberpunk', 'noir', 'ocean', 'pastel_dream', 'sunset', 'terracotta', 'warm_beige'
    ];

    getAvailableThemes(): string[] {
        return this.availableThemes;
    }

    loadTheme(themeName: string): Observable<Theme> {
        return this.http.get<Theme>(`${this.themesPath}${themeName}.json`);
    }
}
