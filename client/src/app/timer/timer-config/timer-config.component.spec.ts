import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimerConfigComponent } from './timer-config.component';

describe('TimerConfigComponent', () => {
  let component: TimerConfigComponent;
  let fixture: ComponentFixture<TimerConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimerConfigComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TimerConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
