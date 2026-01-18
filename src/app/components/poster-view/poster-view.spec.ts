import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PosterView } from './poster-view';

describe('PosterView', () => {
  let component: PosterView;
  let fixture: ComponentFixture<PosterView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PosterView]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PosterView);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
