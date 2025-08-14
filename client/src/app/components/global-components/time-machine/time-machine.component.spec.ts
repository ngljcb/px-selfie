import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimeMachineComponent } from './time-machine.component';

describe('TimeMachineComponent', () => {
  let component: TimeMachineComponent;
  let fixture: ComponentFixture<TimeMachineComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimeMachineComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TimeMachineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
