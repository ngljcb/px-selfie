import { Routes } from '@angular/router';
import { HomeViewComponent } from './home/home-view/home-view.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeViewComponent
  }
  /*
  {
    path: 'calendar',
    component: CalendarComponent
  },
  {
    path: 'notes',
    component: NotesComponent
  },
  {
    path: 'pomodoro',
    component: PomodoroComponent
  }*/
];
