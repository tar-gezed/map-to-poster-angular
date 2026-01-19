import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface GeocodingResult {
    place_id: number;
    licence: string;
    osm_type: string;
    osm_id: number;
    boundingbox: string[];
    lat: string;
    lon: string;
    display_name: string;
    class: string;
    type: string;
    importance: number;
}

@Injectable({
    providedIn: 'root'
})
export class GeocodingService {
    private http = inject(HttpClient);
    private baseUrl = 'https://nominatim.openstreetmap.org/search';

    search(query: string): Observable<GeocodingResult[]> {
        const params = {
            q: query,
            format: 'json',
            addressdetails: '1',
            limit: '5'
        };
        return this.http.get<GeocodingResult[]>(this.baseUrl, { params });
    }
}
