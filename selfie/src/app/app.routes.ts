import { Routes } from '@angular/router';
import { HomeViewComponent } from './home/home-view/home-view.component';
import { NotesViewComponent } from './notes/client/notes-view/notes-view.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeViewComponent
  },
  {
    path: 'notes',
    component: NotesViewComponent
  }
  /*
  {
    path: 'calendar',
    component: CalendarComponent
  },
  {
    path: 'pomodoro',
    component: PomodoroComponent
  }*/
];
