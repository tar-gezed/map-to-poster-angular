import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Theme } from '../../services/theme.service';

@Component({
  selector: 'app-theme-preview-svg',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (theme(); as t) {
      <svg viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" class="preview-svg">
        <!-- Background -->
        <rect width="100" height="140" [attr.fill]="t.bg" />
        
        <!-- Water (River) -->
        <path d="M0,60 C30,50 40,80 60,75 S90,60 100,70 L100,140 L0,140 Z" [attr.fill]="t.water" opacity="0.3" />
        <path d="M-10,120 C20,115 50,125 100,110 L100,140 L-10,140 Z" [attr.fill]="t.water" />
        
        <!-- Parks -->
        <path d="M10,20 Q25,10 40,25 T70,30 Q80,10 90,25 L95,60 Q80,70 60,65 T20,80 Z" [attr.fill]="t.parks" opacity="0.8" />
        
        <!-- Roads (Grid-like) -->
        <!-- Primary Roads -->
        <g [attr.stroke]="t.road_primary" stroke-width="2" fill="none" stroke-linecap="round">
           <path d="M30,-5 L30,145" />
           <path d="M70,-5 L70,145" />
           <path d="M-5,40 L105,50" />
           <path d="M-5,90 L105,80" />
        </g>
        
        <!-- Secondary Roads -->
        <g [attr.stroke]="t.road_secondary" stroke-width="1" fill="none" stroke-opacity="0.8">
           <path d="M50,-5 L50,145" />
           <path d="M-5,20 L105,25" />
           <path d="M-5,60 L105,65" />
           <path d="M-5,110 L105,105" />
        </g>

        <!-- Motorway (Thicker, sinuous) -->
        <path d="M-5,100 C30,95 60,105 105,90" [attr.stroke]="t.road_motorway" stroke-width="3" fill="none" />
        
        <!-- Text Element -->
         <text x="50" y="125" [attr.fill]="t.text" font-family="Roboto, sans-serif" font-size="8" font-weight="bold" text-anchor="middle" letter-spacing="1">MAP</text>
         <text x="50" y="133" [attr.fill]="t.text" font-family="Roboto, sans-serif" font-size="4" font-weight="normal" text-anchor="middle" letter-spacing="0.5" opacity="0.7">PREVIEW</text>

         <!-- Border/Frame simulation if needed, but styling handles border -->
      </svg>
    } @else {
      <div class="skeleton"></div>
    }
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
    .preview-svg {
      width: 100%;
      height: 100%;
      border-radius: inherit;
    }
    .skeleton {
      width: 100%;
      height: 100%;
      background: #444;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0% { opacity: 0.6; }
      50% { opacity: 1; }
      100% { opacity: 0.6; }
    }
  `]
})
export class ThemePreviewSvgComponent {
  theme = input<Theme | undefined | null>(null);
}
