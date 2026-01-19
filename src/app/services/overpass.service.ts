import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OverpassService {
  private http = inject(HttpClient);
  // Keep all URLS for later
  // private baseUrl = 'https://overpass-api.de/api/interpreter';
  // private baseUrl = 'https://overpass.private.coffee/api/interpreter';
  // private baseUrl = 'https://api.openstreetmap.fr/oapi/interpreter';
  private baseUrl = 'https://overpass.kumi.systems/api/interpreter';

  // Helper to calculate bbox
  getBbox(lat: number, lon: number, distMetersX: number, distMetersY: number): string {
    const earthRadius = 6378137;
    const latDelta = (distMetersY / earthRadius) * (180 / Math.PI);
    const lonDelta = (distMetersX / earthRadius) * (180 / Math.PI) / Math.cos(lat * Math.PI / 180);

    const south = lat - latDelta;
    const north = lat + latDelta;
    const west = lon - lonDelta;
    const east = lon + lonDelta;

    return `${south},${west},${north},${east}`;
  }

  /**
   * Fetch road data from Overpass API
   * @param bbox Bounding box string
   * @param excludeMinorRoads If true, excludes footways, paths, cycleways, steps for better performance on large areas
   */
  fetchRoads(bbox: string, excludeMinorRoads: boolean = false): Observable<any> {
    // For large areas, exclude pedestrian paths to reduce data size significantly
    const highwayFilter = excludeMinorRoads
      ? 'way["highway"]["highway"!~"footway|path|cycleway|steps|pedestrian|track|service"](${bbox});'
      : 'way["highway"](${bbox});';

    const query = `
      [out:json][timeout:180];
      (
        ${highwayFilter.replace('${bbox}', bbox)}
      );
      out body;
      >;
      out skel qt;
    `;
    return this.http.post(this.baseUrl, `data=${encodeURIComponent(query)}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
  }

  fetchWater(bbox: string): Observable<any> {
    const query = `
      [out:json][timeout:180];
      (
        way["natural"="water"](${bbox});
        relation["natural"="water"](${bbox});
        way["waterway"](${bbox});
      );
      out body;
      >;
      out skel qt;
    `;
    return this.http.post(this.baseUrl, `data=${encodeURIComponent(query)}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
  }

  fetchParks(bbox: string): Observable<any> {
    const query = `
      [out:json][timeout:180];
      (
        way["leisure"="park"](${bbox});
        relation["leisure"="park"](${bbox});
        way["landuse"="grass"](${bbox});
        relation["landuse"="grass"](${bbox});
      );
      out body;
      >;
      out skel qt;
    `;
    return this.http.post(this.baseUrl, `data=${encodeURIComponent(query)}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
  }
}
