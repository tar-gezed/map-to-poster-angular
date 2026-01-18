import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PosterControls } from './poster-controls';

describe('PosterControls', () => {
  let component: PosterControls;
  let fixture: ComponentFixture<PosterControls>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PosterControls]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PosterControls);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
