import { Routes } from '@angular/router';
import { CalendarViewComponent } from './components/calendar/calendar-view/calendar-view.component';
import { CalendarCreateComponent } from './components/calendar/calendar-create/calendar-create.component';
import { HomeViewComponent } from './components/home/home-view/home-view.component';
import { NotesViewComponent } from './notes/notes-view/notes-view.component';
import { NoteEditorComponent } from './notes/note-editor/note-editor.component';
import { RegisterComponent } from './components/auth/register/register.component';
import { LoginComponent } from './components/auth/login/login.component';
import { AuthGuard } from './components/auth/guard/auth.guard';
import { TimerViewComponent } from './timer/timer-view/timer-view.component';
import { GroupComponent } from './notes/group/group.component';

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
    canActivate: [AuthGuard]
  },
  {
    path: 'notes/create',
    component: NoteEditorComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'notes/:id',
    component: NoteEditorComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'notes/:id/edit',
    component: NoteEditorComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'note',
    redirectTo: '/notes',
    pathMatch: 'full'
  },
  {
    path: 'calendar',
    component: CalendarViewComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'timer',
    component: TimerViewComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'groups',
    component: GroupComponent,
    canActivate: [AuthGuard]
  }
];
