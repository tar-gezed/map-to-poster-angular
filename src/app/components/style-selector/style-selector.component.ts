import { Component, input, output, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Theme, ThemeService } from '../../services/theme.service';
import { ThemePreviewSvgComponent } from '../theme-preview-svg/theme-preview-svg.component';

@Component({
  selector: 'app-style-selector',
  standalone: true,
  imports: [CommonModule, ThemePreviewSvgComponent],
  template: `
    <div class="selector-container">
      <div class="header">
        <h3>Styles</h3>
        <span class="badge">Curated</span>
      </div>
      
      <div class="styles-scroll" #scrollContainer (wheel)="onWheel($event, scrollContainer)">
        @for (themeName of themes(); track themeName) {
          <div 
            class="style-card" 
            [class.active]="currentTheme() === themeName"
            (click)="selectTheme(themeName)"
          >
            <div class="preview">
              <app-theme-preview-svg [theme]="themeData()[themeName]" />
              <span class="theme-name">{{ themeName }}</span>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .selector-container {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      background: rgba(20, 20, 20, 0.95);
      backdrop-filter: blur(20px);
      border-top-left-radius: 25px;
      border-top-right-radius: 25px;
      padding: 20px 0;
      z-index: 1000;
      box-shadow: 0 -5px 20px rgba(0,0,0,0.5);
      font-family: 'Inter', sans-serif;
    }

    .header {
      padding: 0 25px 15px;
      display: flex;
      align-items: center;
      gap: 10px;

      h3 {
        margin: 0;
        color: white;
        font-size: 18px;
        font-weight: 600;
      }

      .badge {
        background: rgba(255,255,255,0.1);
        color: #aaa;
        font-size: 11px;
        padding: 2px 8px;
        border-radius: 10px;
      }
    }

    .styles-scroll {
      display: flex;
      gap: 15px;
      overflow-x: auto;
      padding: 0 25px 10px;
      scroll-behavior: smooth;

      /* Scrollbar Styling */
      &::-webkit-scrollbar {
        height: 6px; /* Horizontal scrollbar uses height */
      }

      &::-webkit-scrollbar-track {
        background: transparent;
      }

      &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 3px;
        
        &:hover {
           background: rgba(255, 255, 255, 0.3);
        }
      }
    }

    .style-card {
      flex: 0 0 100px;
      cursor: pointer;
      transition: transform 0.2s;

      &:hover {
        transform: translateY(-2px);
      }

      &.active .preview {
        border: 2px solid #fff;
        transform: scale(1.05);
      }
    }

    .preview {
      height: 140px;
      border-radius: 18px;
      display: flex;
      align-items: flex-end;
      padding: 10px;
      background: #333;
      position: relative;
      overflow: hidden;
      border: 2px solid transparent;
      transition: all 0.2s;
    }
    
    app-theme-preview-svg {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 0;
    }

    .theme-name {
      color: white;
      font-size: 12px;
      font-weight: 500;
      text-shadow: 0 1px 3px rgba(0,0,0,1); /* Increased shadow for readability over SVG */
      z-index: 1;
      position: relative; /* Ensure it stays on top */
      text-transform: capitalize;
    }
  `]
})
export class StyleSelectorComponent {
  private themeService = inject(ThemeService);

  themes = input<string[]>([]);
  currentTheme = input<string>('');
  themeSelected = output<string>();

  themeData = signal<Record<string, Theme>>({});

  constructor() {
    effect(() => {
      const themeNames = this.themes();
      if (themeNames.length > 0) {
        this.loadThemes(themeNames);
      }
    });
  }

  loadThemes(names: string[]) {
    names.forEach(name => {
      // Avoid reloading if already present
      if (this.themeData()[name]) return;

      this.themeService.loadTheme(name).subscribe(theme => {
        this.themeData.update(current => ({ ...current, [name]: theme }));
      });
    });
  }

  selectTheme(theme: string) {
    this.themeSelected.emit(theme);
  }

  onWheel(event: WheelEvent, container: HTMLElement) {
    if (event.deltaY !== 0) {
      event.preventDefault();
      container.scrollLeft += event.deltaY + event.deltaX;
    }
  }
}
