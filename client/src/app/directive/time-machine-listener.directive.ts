import { Directive, Input, OnDestroy, OnInit } from '@angular/core';
import { TimeMachineService } from '../service/time-machine.service';
import { Subscription } from 'rxjs';

@Directive({
  selector: '[appTimeMachineListenerDirective]',
  standalone: true
})
export class TimeMachineListenerDirective implements OnInit, OnDestroy {
  @Input('appTimeMachineListenerDirective') refreshFn!: () => void;

  private sub!: Subscription;

  constructor(private timeMachine: TimeMachineService) {}

  ngOnInit(): void {
    this.sub = this.timeMachine.virtualNow$().subscribe(() => {
      console.log('[TimeMachineListener] trigger');
      if (typeof this.refreshFn === 'function') {
        this.refreshFn();
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
