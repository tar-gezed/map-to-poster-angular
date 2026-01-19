import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-distance-control',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="distance-container">
      <div class="label">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
           <path d="M21 6H3" />
           <path d="M21 18H3" />
           <path d="M3 6v12" />
           <path d="M21 6v12" />
           <path d="M7 6v12" />
           <path d="M17 6v12" />
        </svg>
        <span>Distance: {{ displayValue() }} km</span>
      </div>
      
      <div class="slider-wrapper">
        <input 
          type="range" 
          min="1000" 
          max="25000" 
          step="500" 
          [ngModel]="distance()" 
          (ngModelChange)="onValueChange($event)"
          class="custom-range"
        >
      </div>
    </div>
  `,
  styles: [`
    .distance-container {
      position: absolute;
      top: 20px; 
      right: 20px;
      left: auto;
      transform: none;
      width: 250px;
      z-index: 1000;
      background: var(--surface-glass, rgba(30, 30, 30, 0.9));
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-radius: 20px;
      padding: 15px 20px;
      box-shadow: var(--shadow-glass, 0 8px 32px 0 rgba(0, 0, 0, 0.37));
      border: 1px solid var(--border-glass, rgba(255,255,255,0.1));
      display: flex;
      flex-direction: column;
      gap: 10px;
      transition: opacity 0.3s;
    }

    .label {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--text-secondary, #aaa);
      font-size: 13px;
      font-weight: 500;
      
      .icon {
        width: 16px;
        height: 16px;
      }
    }

    .slider-wrapper {
      width: 100%;
      padding: 5px 0;
    }

    /* Custom Range Slider */
    .custom-range {
      -webkit-appearance: none;
      width: 100%;
      height: 6px;
      background: #444;
      border-radius: 3px;
      outline: none;
      cursor: pointer;
      
      &::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        background: var(--primary-color, #6200ee);
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        transition: transform 0.1s;
        
        &:hover {
          transform: scale(1.1);
        }
      }

      &::-moz-range-thumb {
        width: 18px;
        height: 18px;
        background: var(--primary-color, #6200ee);
        border-radius: 50%;
        border: 2px solid white;
        cursor: pointer;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      }
    }
  `]
})
export class DistanceControlComponent {
  distance = input.required<number>();
  distanceChange = output<number>();

  displayValue = computed(() => (this.distance() / 1000).toFixed(1));

  onValueChange(value: number) {
    this.distanceChange.emit(value);
  }
}
