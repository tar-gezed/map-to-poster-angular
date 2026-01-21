import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, forkJoin } from 'rxjs';
import {
  OverpassGeomResponse,
  OverpassGeomElement,
  OverpassGeomWay,
  OverpassGeomRelation,
  CategorizedMapData,
  OverpassResponse
} from './overpass.types';

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

  /**
   * Calculate bounding box from center point and distances
   */
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
   * Calculate dynamic timeout based on area size
   * Larger areas need more time to process
   */
  private getTimeout(distanceMeters: number): number {
    if (distanceMeters <= 5000) return 60;
    if (distanceMeters <= 10000) return 120;
    if (distanceMeters <= 15000) return 180;
    return 240; // Max timeout for very large areas
  }

  /**
   * Build highway filter regex based on whether to exclude minor roads.
   * Uses regex anchors (^$) to match exact values, allows _link suffix.
   */
  private getHighwayFilter(excludeMinorRoads: boolean): string {
    if (excludeMinorRoads) {
      // Major roads only
      return 'motorway|trunk|primary|secondary|tertiary|residential|living_street|unclassified';
    }
    // Include all road types
    return 'motorway|trunk|primary|secondary|tertiary|residential|living_street|unclassified|footway|path|cycleway|steps|pedestrian|track|service';
  }

  /**
   * Fetch all map data (roads, water, parks) in a single optimized query.
   *
   * Uses `out geom qt` to:
   * - Embed coordinates directly in ways/relations (no node lookup needed)
   * - Sort by quadtile for faster server processing
   *
   * This is ~3x faster than making separate requests and ~50% less data
   * than separate node fetching.
   *
   * @param bbox Bounding box string "south,west,north,east"
   * @param excludeMinorRoads If true, excludes footways, paths, etc.
   * @param distanceMeters Used to calculate appropriate timeout
   */
  fetchAllMapData(
    bbox: string,
    excludeMinorRoads: boolean = false,
    distanceMeters: number = 10000
  ): Observable<CategorizedMapData> {
    const timeout = this.getTimeout(distanceMeters);
    const highwayFilter = this.getHighwayFilter(excludeMinorRoads);

    // Optimized Overpass query:
    // - Global bbox for all elements
    // - "out body geom(bbox)" = tags + inline geometry cropped at bbox
    // - "qt" = quadtile sorting for faster server processing
    const query = `
      [out:json][timeout:${timeout}][bbox:${bbox}];
      (
        // Roads - regex filter with _link suffix support
        way["highway"~"^(${highwayFilter})(_link)?$"];

        // Water bodies and waterways
        way["natural"="water"];
        relation["natural"="water"];
        way["waterway"];

        // Parks and green spaces
        way["leisure"="park"];
        relation["leisure"="park"];
        way["landuse"~"^(grass|forest|meadow)$"];
        relation["landuse"~"^(grass|forest|meadow)$"];
      );
      // "out body" = include tags, "geom(bbox)" = inline coords cropped at bbox
      out body geom(${bbox}) qt;
    `;

    return this.http.post<OverpassGeomResponse>(
      this.baseUrl,
      `data=${encodeURIComponent(query)}`,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    ).pipe(
      map(response => this.categorizeElements(response.elements))
    );
  }

  /**
   * Categorize Overpass elements into roads, water, parks.
   * With `out geom`, geometry is inline - no node map needed!
   */
  private categorizeElements(elements: OverpassGeomElement[]): CategorizedMapData {
    const roads: OverpassGeomWay[] = [];
    const water: OverpassGeomElement[] = [];
    const parks: OverpassGeomElement[] = [];

    for (const el of elements) {
      const tags = el.tags;
      if (!tags) continue;

      // Check for road (highway tag) - only ways can be roads
      if (el.type === 'way' && tags['highway']) {
        roads.push(el);
        continue;
      }

      // Check for water (natural=water or waterway)
      if (tags['natural'] === 'water' || tags['waterway']) {
        water.push(el);
        continue;
      }

      // Check for parks (leisure=park or landuse=grass/forest/meadow)
      if (tags['leisure'] === 'park' || ['grass', 'forest', 'meadow'].includes(tags['landuse'] || '')) {
        parks.push(el);
        continue;
      }
    }

    return { roads, water, parks };
  }

  // ============================================
  // Parallel Query Methods for Large Areas (>15km)
  // Uses 3 separate requests to distribute server load
  // ============================================

  /**
   * Smart fetcher that auto-selects strategy based on area size.
   * - Areas <= 15km: Single unified query (lower latency)
   * - Areas > 15km: 3 parallel queries (reduces timeout risk)
   */
  fetchMapDataSmart(
    bbox: string,
    excludeMinorRoads: boolean,
    distanceMeters: number
  ): Observable<CategorizedMapData> {
    if (distanceMeters > 15000) {
      console.log('[Overpass] Large area detected, using parallel queries');
      return this.fetchMapDataParallel(bbox, excludeMinorRoads, distanceMeters);
    } else {
      console.log('[Overpass] Normal area, using unified query');
      return this.fetchAllMapData(bbox, excludeMinorRoads, distanceMeters);
    }
  }

  /**
   * Fetch map data using 3 parallel requests.
   * Better for large areas to reduce timeout risk by distributing server load.
   */
  private fetchMapDataParallel(
    bbox: string,
    excludeMinorRoads: boolean,
    distanceMeters: number
  ): Observable<CategorizedMapData> {
    const timeout = this.getTimeout(distanceMeters);
    const highwayFilter = this.getHighwayFilter(excludeMinorRoads);

    // Roads query (heaviest - many small segments)
    const roadsQuery = `
      [out:json][timeout:${timeout}][bbox:${bbox}];
      way["highway"~"^(${highwayFilter})(_link)?$"];
      out body geom(${bbox}) qt;
    `;

    // Water query (complex geometries)
    const waterQuery = `
      [out:json][timeout:${timeout}][bbox:${bbox}];
      (
        way["natural"="water"];
        relation["natural"="water"];
        way["waterway"];
      );
      out body geom(${bbox}) qt;
    `;

    // Parks query (complex geometries)
    const parksQuery = `
      [out:json][timeout:${timeout}][bbox:${bbox}];
      (
        way["leisure"="park"];
        relation["leisure"="park"];
        way["landuse"~"^(grass|forest|meadow)$"];
        relation["landuse"~"^(grass|forest|meadow)$"];
      );
      out body geom(${bbox}) qt;
    `;

    const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };

    return forkJoin({
      roads: this.http.post<OverpassGeomResponse>(
        this.baseUrl,
        `data=${encodeURIComponent(roadsQuery)}`,
        { headers }
      ),
      water: this.http.post<OverpassGeomResponse>(
        this.baseUrl,
        `data=${encodeURIComponent(waterQuery)}`,
        { headers }
      ),
      parks: this.http.post<OverpassGeomResponse>(
        this.baseUrl,
        `data=${encodeURIComponent(parksQuery)}`,
        { headers }
      )
    }).pipe(
      map(results => {
        // Combine results from parallel queries
        const roads: OverpassGeomWay[] = [];
        const water: OverpassGeomElement[] = [];
        const parks: OverpassGeomElement[] = [];

        // Process roads (all are ways with highway tag)
        for (const el of results.roads.elements) {
          if (el.type === 'way' && el.tags?.['highway']) {
            roads.push(el as OverpassGeomWay);
          }
        }

        // Process water
        for (const el of results.water.elements) {
          if (el.tags) {
            water.push(el);
          }
        }

        // Process parks
        for (const el of results.parks.elements) {
          if (el.tags) {
            parks.push(el);
          }
        }

        return { roads, water, parks };
      })
    );
  }
}
