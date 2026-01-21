import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PosterViewComponent } from './poster-view';

describe('PosterViewComponent', () => {
  let component: PosterViewComponent;
  let fixture: ComponentFixture<PosterViewComponent>;

  beforeEach(async () => {
    // Mock ResizeObserver
    (window as any).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };

    await TestBed.configureTestingModule({
      imports: [PosterViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PosterViewComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
