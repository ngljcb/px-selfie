// src/app/components/home/widgets/todos/todos.component.ts
import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivitiesService } from '../../../../service/activities.service';
import { Activity } from '../../../../model/activity.model';
import { TimeMachineService } from '../../../../service/time-machine.service';

@Component({
  selector: 'app-todos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './todos.component.html',
  styleUrl: './todos.component.scss'
})
export class TodosComponent implements OnInit {
  private activitiesService = inject(ActivitiesService);
  private timeMachine = inject(TimeMachineService);

  private _items = signal<Activity[]>([]);
  readonly items = computed(() => this._items());
  readonly hasItems = computed(() => this.items().length > 0);

  ngOnInit(): void {
    // fetch all, then filter client-side by due date & status
    this.activitiesService.list({}).subscribe({
      next: (res) => {
        const todayISO = this.timeMachine.getNow().toISOString().slice(0, 10);
        const list = (res.items || [])
          .filter(a => !!a.due_date && (a.status ?? 'pending') !== 'done')
          .filter(a => (a.due_date as string).slice(0, 10) >= todayISO)
          .sort((a, b) => (a.due_date as string).localeCompare(b.due_date as string))
          .slice(0, 8); // show up to 8 items
        this._items.set(list);
      },
      error: () => this._items.set([]),
    });
  }

  formatDue(d?: string | null): string {
    if (!d) return '';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return (d as string).slice(0, 10);
    return dt.toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  trackById = (_: number, a: Activity) => a?.id ?? a?.title ?? _;
}
