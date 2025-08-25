import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GradesViewComponent } from './grades-view.component';

describe('GradesViewComponent', () => {
  let component: GradesViewComponent;
  let fixture: ComponentFixture<GradesViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GradesViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GradesViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
