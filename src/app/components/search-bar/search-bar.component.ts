import { Component, output, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { GeocodingService, GeocodingResult } from '../../services/geocoding.service';
import { debounceTime, distinctUntilChanged, switchMap, filter } from 'rxjs/operators';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="search-container">
      <div class="input-wrapper">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input 
          [formControl]="searchControl" 
          placeholder="Search for a city..." 
          type="text"
          (focus)="showSuggestions.set(true)"
        >
        @if (searchControl.value) {
          <button class="clear-btn" (click)="clearSearch()">×</button>
        }
      </div>

      @if (showSuggestions() && suggestions().length > 0) {
        <ul class="suggestions-list">
          @for (item of suggestions(); track item.place_id) {
            <li (click)="selectSuggestion(item)">
              <span class="main-text">{{ item.display_name.split(',')[0] }}</span>
              <span class="sub-text">{{ item.display_name }}</span>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: [`
    .search-container {
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      width: 90%;
      max-width: 400px;
      z-index: 2000;
      font-family: 'Inter', sans-serif;
    }

    .input-wrapper {
      background: rgba(30, 30, 30, 0.9);
      backdrop-filter: blur(10px);
      border-radius: 25px;
      padding: 10px 20px;
      display: flex;
      align-items: center;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.1);
    }

    .icon {
      color: #aaa;
      margin-right: 10px;
      width: 18px;
      height: 18px;
    }

    input {
      background: transparent;
      border: none;
      color: white;
      width: 100%;
      font-size: 16px;
      outline: none;
    }

    .clear-btn {
      background: none;
      border: none;
      color: #aaa;
      font-size: 20px;
      cursor: pointer;
      padding: 0 5px;
    }

    .suggestions-list {
      list-style: none;
      margin: 10px 0 0;
      padding: 0;
      background: rgba(30, 30, 30, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 15px;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.1);
    }

    li {
      padding: 12px 20px;
      cursor: pointer;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      display: flex;
      flex-direction: column;
      
      &:last-child {
        border-bottom: none;
      }

      &:hover {
        background: rgba(255,255,255,0.1);
      }
    }

    .main-text {
      color: white;
      font-weight: 500;
      font-size: 15px;
    }

    .sub-text {
      color: #aaa;
      font-size: 12px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `]
})
export class SearchBarComponent {
  private geocoding = inject(GeocodingService);

  searchControl = new FormControl('');
  suggestions = signal<GeocodingResult[]>([]);
  showSuggestions = signal(false);

  locationSelected = output<GeocodingResult>();

  constructor() {
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      filter(val => (val?.length ?? 0) > 2),
      switchMap(val => this.geocoding.search(val!))
    ).subscribe(results => {
      this.suggestions.set(results);
      this.showSuggestions.set(true);
    });
  }

  selectSuggestion(item: GeocodingResult) {
    this.searchControl.setValue(item.display_name.split(',')[0], { emitEvent: false });
    this.showSuggestions.set(false);
    this.locationSelected.emit(item);
  }

  clearSearch() {
    this.searchControl.setValue('');
    this.suggestions.set([]);
  }
}
