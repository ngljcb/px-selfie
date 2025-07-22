import { Routes } from '@angular/router';
import { HomeViewComponent } from './home/home-view/home-view.component';
import { CalendarViewComponent } from './calendar/calendar-view/calendar-view.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeViewComponent
  },
  {
    path: 'calendar',
    component: CalendarViewComponent
  }/*
  {
    path: 'notes',
    component: NotesComponent
  },
  {
    path: 'pomodoro',
    component: PomodoroComponent
  }*/
];
