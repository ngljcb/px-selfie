import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GradesCreateComponent } from './grades-create.component';

describe('GradesCreateComponent', () => {
  let component: GradesCreateComponent;
  let fixture: ComponentFixture<GradesCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GradesCreateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GradesCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
