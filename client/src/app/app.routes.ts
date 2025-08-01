import { Routes } from '@angular/router';
import { CalendarViewComponent } from './calendar/calendar-view/calendar-view.component';
import { HomeViewComponent } from './home/home-view/home-view.component';
import { NotesViewComponent } from './notes/notes-view/notes-view.component';
import { NoteEditorComponent } from './notes/note-editor/note-editor.component';
import { NotesNavigationService } from './service/notes-navigation.service';
import { TimerViewComponent } from './timer/timer-view/timer-view.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeViewComponent
  },


  {
    path: 'timer',
    component: TimerViewComponent
  },









  {
    path: 'calendar',
    component: CalendarViewComponent
  }
];
