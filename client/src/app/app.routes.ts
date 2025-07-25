import { Routes } from '@angular/router';
import { HomeViewComponent } from './home/home-view/home-view.component';
import { NotesViewComponent } from './notes/notes-view/notes-view.component';
import { NoteEditorComponent } from './notes/note-editor/note-editor.component';
import { NotesNavigationService } from './service/notes-navigation.service';

export const routes: Routes = [
  {
    path: '',
    component: HomeViewComponent
  },
  {
    path: 'notes',
    component: NotesViewComponent
  },
    // Route per creare una nuova nota
  {
    path: 'notes/new',
    component: NoteEditorComponent,
    title: 'Nuova Nota - SELFIE',
    data: { mode: 'create' }
  },

  // Route per modificare una nota esistente
  {
    path: 'notes/:id/edit',
    component: NoteEditorComponent,
    title: 'Modifica Nota - SELFIE',
    data: { mode: 'edit' }
  },

  // Route per duplicare una nota esistente
  {
    path: 'notes/:id/duplicate',
    component: NoteEditorComponent,
    title: 'Duplica Nota - SELFIE',
    data: { mode: 'duplicate' }
  },

  // Redirect da /note a /notes per retrocompatibilità
  {
    path: 'note',
    redirectTo: '/notes',
    pathMatch: 'full'
  },
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
