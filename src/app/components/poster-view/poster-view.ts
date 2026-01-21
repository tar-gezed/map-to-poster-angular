import { Component, ElementRef, input, effect, ViewChild, inject, ChangeDetectionStrategy, signal, untracked, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PosterService, OsmData } from '../../services/poster.service';
import { Theme } from '../../services/theme.service';
import Konva from 'konva';

@Component({
  selector: 'app-poster-view',
  imports: [CommonModule],
  templateUrl: './poster-view.html',
  styleUrl: './poster-view.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PosterViewComponent implements AfterViewInit, OnDestroy {
  roadsData = input<OsmData | null>(null);
  waterData = input<OsmData | null>(null);
  parksData = input<OsmData | null>(null);
  theme = input<Theme | null>(null);
  city = input<string>('');
  country = input<string>('');
  coords = input<{ lat: number, lon: number } | null>(null);
  distance = input<number>(10000);
  isLoading = input<boolean>(false);

  @ViewChild('posterContainer') posterContainer!: ElementRef;
  @ViewChild('posterWrapper') posterWrapper!: ElementRef;

  posterService = inject(PosterService);
  stage = signal<Konva.Stage | null>(null);
  loadingProgress = signal<number>(0);
  loadingMessage = signal<string>('Generating...');
  viewReady = signal(false);

  private resizeObserver?: ResizeObserver;

  constructor() {
    effect(async () => {
      const roads = this.roadsData();
      const water = this.waterData();
      const parks = this.parksData();
      const theme = this.theme();
      const coords = this.coords();
      const distance = this.distance();
      const loading = this.isLoading();
      const viewReady = this.viewReady();

      if (roads && water && parks && theme && coords && !loading && viewReady && this.posterContainer) {
        // Clear previous
        const currentStage = untracked(() => this.stage());
        if (currentStage) {
          currentStage.destroy();
        }

        // Reset progress
        this.loadingProgress.set(0);
        this.loadingMessage.set('Starting...');

        // Generate new with progress callback
        try {
          const newStage = await this.posterService.generatePoster(
            this.posterContainer.nativeElement.id,
            roads,
            water,
            parks,
            theme,
            this.city(),
            this.country(),
            coords,
            distance,
            (msg, progress) => {
              // Update progress signal for the bar
              this.loadingProgress.set(progress);

              // Log to console only when message changes (major step) to avoid spam
              // Use untracked to prevent registering this signal as an effect dependency
              const currentMsg = untracked(() => this.loadingMessage());
              if (currentMsg !== msg) {
                console.log(`[Poster Generation] ${msg} (${progress}%)`);
                this.loadingMessage.set(msg);
              }
            }
          );
          this.stage.set(newStage);

          // Complete
          this.loadingProgress.set(100);
          this.loadingMessage.set('Done');

          // Wait a tick for rendering then update scale
          setTimeout(() => this.updateScale(), 0);

        } catch (error) {
          console.error("Poster Generation Error:", error);
          this.loadingMessage.set('Error generating poster');
          this.loadingProgress.set(0); // Optional: keep progress bar or reset
        }
      }
    });
  }

  ngAfterViewInit() {
    this.viewReady.set(true);

    if (this.posterWrapper) {
      this.resizeObserver = new ResizeObserver(() => {
        this.updateScale();
      });
      this.resizeObserver.observe(this.posterWrapper.nativeElement);
    }
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();

    // Full cleanup of Konva stage to release memory
    const currentStage = this.stage();
    if (currentStage) {
      // Destroy all layers and their children first
      currentStage.getLayers().forEach(layer => {
        layer.destroyChildren();
        layer.destroy();
      });
      currentStage.destroy();
      this.stage.set(null);
    }
  }

  updateScale() {
    const stage = this.stage();
    if (!stage || !this.posterContainer || !this.posterWrapper) return;

    // The wrapper of the whole component (available space)
    const wrapperRect = this.posterWrapper.nativeElement.getBoundingClientRect();

    // Original dimensions
    const posterWidth = stage.width();
    const posterHeight = stage.height();

    if (wrapperRect.width === 0 || wrapperRect.height === 0) return;

    // Scale to fit nicely with some margin
    const margin = 60; // Increased margin for breathing room
    const availableWidth = wrapperRect.width - margin;
    const availableHeight = wrapperRect.height - margin;

    const scale = Math.min(
      availableWidth / posterWidth,
      availableHeight / posterHeight
    );

    // Apply styles to the INNER container (containing Konva)
    const el = this.posterContainer.nativeElement;
    // The inner container needs to stay at full resolution size
    el.style.width = `${posterWidth}px`;
    el.style.height = `${posterHeight}px`;
    el.style.transform = `scale(${scale})`; // Scale it down
    el.style.transformOrigin = 'top left'; // Pivot from top left so it fits into the wrapper

    // The INTERMEDIATE wrapper (poster-container-wrapper) needs to match the visual size
    // We need to find this element. It's the parent of posterContainer.
    const containerWrapper = el.parentElement;
    if (containerWrapper) {
      containerWrapper.style.width = `${posterWidth * scale}px`;
      containerWrapper.style.height = `${posterHeight * scale}px`;
    }
  }

  download(ratio: number = 2) {
    const currentStage = this.stage();
    if (currentStage) {
      const pixelRatio = ratio; // 1 = 1200x1600 (HD/1080p-ish), 2 = 2400x3200 (QHD/4k-ish), 3 = 4k+
      const dataURL = currentStage.toDataURL({ pixelRatio: pixelRatio });
      const link = document.createElement('a');
      const resLabel = pixelRatio === 1 ? 'HD' : pixelRatio === 2 ? 'QHD' : '4K';
      link.download = `${this.city()}_${this.theme()?.name || 'style'}_${resLabel}.png`;
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}
