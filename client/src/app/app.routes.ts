import { Routes } from '@angular/router';
import { CalendarViewComponent } from './calendar/calendar-view/calendar-view.component';
import { HomeViewComponent } from './home/home-view/home-view.component';
import { NotesViewComponent } from './notes/notes-view/notes-view.component';
import { NoteEditorComponent } from './notes/note-editor/note-editor.component';
import { RegisterComponent } from './auth/register/register.component';
import { LoginComponent } from './auth/login/login.component';
import { AuthGuard } from './auth/guard/auth.guard';
import { TimerViewComponent } from './timer/timer-view/timer-view.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeViewComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'register',
    component: RegisterComponent
  },
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'notes',
    component: NotesViewComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'notes/new',
    component: NoteEditorComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'notes/:id',
    component: NoteEditorComponent,
    canActivate: [AuthGuard],
    data: { mode: 'view' }
  },
  {
    path: 'notes/:id/edit',
    component: NoteEditorComponent,
    canActivate: [AuthGuard],
    data: { mode: 'edit' }
  },
  {
    path: 'notes/:id/duplicate',
    component: NoteEditorComponent,
    canActivate: [AuthGuard],
    data: { mode: 'duplicate' }
  },
  {
    path: 'note',
    redirectTo: '/notes',
    pathMatch: 'full'
  },
  {
    path: 'calendar',
    component: CalendarViewComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'timer',
    component: TimerViewComponent,
    canActivate: [AuthGuard],
  }
];