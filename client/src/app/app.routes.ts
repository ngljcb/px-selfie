import { Routes } from '@angular/router';
import { CalendarViewComponent } from './calendar/calendar-view/calendar-view.component';
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
  {
    path: 'notes/new', // Route per creare una nuova nota
    component: NoteEditorComponent,
    title: 'Nuova Nota - SELFIE',
    data: { mode: 'create' }
  },
  {
    path: 'notes/:id/edit', // Route per modificare una nota esistente
    component: NoteEditorComponent,
    title: 'Modifica Nota - SELFIE',
    data: { mode: 'edit' }
  },
  {
    path: 'notes/:id/duplicate', // Route per duplicare una nota esistente
    component: NoteEditorComponent,
    title: 'Duplica Nota - SELFIE',
    data: { mode: 'duplicate' }
  },
  {
    path: 'notes/:id/view', // Route per visualizzare una nota in sola lettura
    component: NoteEditorComponent,
    title: 'Visualizza Nota - SELFIE',
    data: { mode: 'view' }
  },
  {
    path: 'note', // Redirect da /note a /notes per retrocompatibilità
    redirectTo: '/notes',
    pathMatch: 'full'
  },









  {
    path: 'calendar',
    component: CalendarViewComponent
  }
];
