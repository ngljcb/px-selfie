import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarModifyComponent } from './calendar-modify.component';

describe('CalendarModifyComponent', () => {
  let component: CalendarModifyComponent;
  let fixture: ComponentFixture<CalendarModifyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarModifyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalendarModifyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
