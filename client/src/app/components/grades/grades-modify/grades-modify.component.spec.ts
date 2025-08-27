import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GradesModifyComponent } from './grades-modify.component';

describe('GradesModifyComponent', () => {
  let component: GradesModifyComponent;
  let fixture: ComponentFixture<GradesModifyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GradesModifyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GradesModifyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
