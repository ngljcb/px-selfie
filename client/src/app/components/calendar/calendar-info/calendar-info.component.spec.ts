import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarInfoComponent } from './calendar-info.component';

describe('CalendarInfoComponent', () => {
  let component: CalendarInfoComponent;
  let fixture: ComponentFixture<CalendarInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarInfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalendarInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
