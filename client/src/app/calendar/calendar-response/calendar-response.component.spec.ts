import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarResponseComponent } from './calendar-response.component';

describe('CalendarResponseComponent', () => {
  let component: CalendarResponseComponent;
  let fixture: ComponentFixture<CalendarResponseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarResponseComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalendarResponseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
