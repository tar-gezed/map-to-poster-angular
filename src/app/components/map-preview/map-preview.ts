import { Component, ElementRef, input, effect, ViewChild, AfterViewInit, OnDestroy, inject, PLATFORM_ID, ChangeDetectionStrategy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import * as L from 'leaflet';

@Component({
  selector: 'app-map-preview',
  imports: [],
  templateUrl: './map-preview.html',
  styleUrl: './map-preview.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MapPreviewComponent implements AfterViewInit, OnDestroy {
  lat = input<number>(48.8566);
  lon = input<number>(2.3522);
  distance = input<number>(10000);

  @ViewChild('map') mapContainer!: ElementRef;

  private map: L.Map | undefined;
  private rectangle: L.Rectangle | undefined;
  private platformId = inject(PLATFORM_ID);

  constructor() {
    effect(() => {
      const lat = this.lat();
      const lon = this.lon();
      const dist = this.distance();

      if (isPlatformBrowser(this.platformId) && this.map) {
        this.updateMap(lat, lon, dist);
      }
    });
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.initMap();
    }
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }

  private initMap() {
    this.map = L.map(this.mapContainer.nativeElement).setView([this.lat(), this.lon()], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    this.updateMap(this.lat(), this.lon(), this.distance());
  }

  private updateMap(lat: number, lon: number, dist: number) {
    if (!this.map) return;

    this.map.setView([lat, lon]);

    if (this.rectangle) {
      this.map.removeLayer(this.rectangle);
    }

    const bounds = this.getBounds(lat, lon, dist);
    this.rectangle = L.rectangle(bounds, { color: '#ff7800', weight: 1 }).addTo(this.map);

    this.map.fitBounds(bounds);
  }

  private getBounds(lat: number, lon: number, distMeters: number): L.LatLngBoundsExpression {
    const earthRadius = 6378137;
    const latDelta = (distMeters / earthRadius) * (180 / Math.PI);
    const lonDelta = (distMeters / earthRadius) * (180 / Math.PI) / Math.cos(lat * Math.PI / 180);

    return [
      [lat - latDelta, lon - lonDelta],
      [lat + latDelta, lon + lonDelta]
    ];
  }
}
