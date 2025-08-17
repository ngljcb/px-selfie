import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimerViewComponent } from './timer-view.component';

describe('TimerViewComponent', () => {
  let component: TimerViewComponent;
  let fixture: ComponentFixture<TimerViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimerViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TimerViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
