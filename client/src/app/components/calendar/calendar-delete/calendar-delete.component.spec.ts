import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarDeleteComponent } from './calendar-delete.component';

describe('CalendarDeleteComponent', () => {
  let component: CalendarDeleteComponent;
  let fixture: ComponentFixture<CalendarDeleteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarDeleteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalendarDeleteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
