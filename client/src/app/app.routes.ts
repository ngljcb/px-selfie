import { Routes } from '@angular/router';
import { CalendarViewComponent } from './components/calendar/calendar-view/calendar-view.component';
import { HomeViewComponent } from './components/home/home-view/home-view.component';
import { NotesViewComponent } from './components/notes/notes-view/notes-view.component';
import { NoteEditorComponent } from './components/notes/note-editor/note-editor.component';
import { RegisterComponent } from './components/auth/register/register.component';
import { LoginComponent } from './components/auth/login/login.component';
import { AuthGuard } from './components/auth/guard/auth.guard';
import { TimerViewComponent } from './components/timer/timer-view/timer-view.component';
import { GroupComponent } from './components/notes/group/group.component';
import { GradesViewComponent } from './components/grades/grades-view/grades-view.component';
import { GradesDeleteComponent } from './components/grades/grades-delete/grades-delete.component';

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
  },
  {
    path: 'grades',
    component: GradesViewComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'grades/:id/delete',
    component: GradesDeleteComponent,
    canActivate: [AuthGuard]
  }
];
