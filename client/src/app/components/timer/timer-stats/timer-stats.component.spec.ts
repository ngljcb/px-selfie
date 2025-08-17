import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimerStatsComponent } from './timer-stats.component';

describe('TimerStatsComponent', () => {
  let component: TimerStatsComponent;
  let fixture: ComponentFixture<TimerStatsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimerStatsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TimerStatsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
