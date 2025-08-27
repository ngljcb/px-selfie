import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GradesDeleteComponent } from './grades-delete.component';

describe('GradesDeleteComponent', () => {
  let component: GradesDeleteComponent;
  let fixture: ComponentFixture<GradesDeleteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GradesDeleteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GradesDeleteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
