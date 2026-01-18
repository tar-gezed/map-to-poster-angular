import { Component, ElementRef, input, effect, ViewChild, inject, ChangeDetectionStrategy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PosterService, OsmData } from '../../services/poster.service';
import { Theme } from '../../services/theme.service';
import Konva from 'konva';

@Component({
  selector: 'app-poster-view',
  imports: [MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './poster-view.html',
  styleUrl: './poster-view.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PosterViewComponent {
  roadsData = input<OsmData | null>(null);
  waterData = input<OsmData | null>(null);
  parksData = input<OsmData | null>(null);
  theme = input<Theme | null>(null);
  city = input<string>('');
  country = input<string>('');
  coords = input<{ lat: number, lon: number } | null>(null);
  isLoading = input<boolean>(false);

  @ViewChild('posterContainer') posterContainer!: ElementRef;

  posterService = inject(PosterService);
  stage: Konva.Stage | null = null;

  constructor() {
    effect(async () => {
      const roads = this.roadsData();
      const water = this.waterData();
      const parks = this.parksData();
      const theme = this.theme();
      const coords = this.coords();
      const loading = this.isLoading();

      if (roads && water && parks && theme && coords && !loading && this.posterContainer) {
        // Clear previous
        if (this.stage) {
          this.stage.destroy();
        }

        // Generate new
        this.stage = await this.posterService.generatePoster(
          this.posterContainer.nativeElement.id,
          roads,
          water,
          parks,
          theme,
          this.city(),
          this.country(),
          coords
        );
      }
    });
  }

  download() {
    if (this.stage) {
      const dataURL = this.stage.toDataURL({ pixelRatio: 3 }); // High res
      const link = document.createElement('a');
      link.download = `${this.city()}_${this.theme()?.name || 'poster'}.png`;
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}
