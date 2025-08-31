// src/app/components/home/widgets/notes/notes.component.ts
import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotesService } from '../../../../service/notes.service';
import { NotePreview, NoteSortType } from '../../../../model/note.interface';

@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notes.component.html'
})
export class NotesComponent {
  private notesService = inject(NotesService);

  // state
  private _previews = signal<NotePreview[]>([]);

  // exactly 4 slots
  slots = computed(() => new Array(4).fill(0));
  visibleNotes = computed<ReadonlyArray<NotePreview | undefined>>(() => {
    const list = this._previews();
    return [list[0], list[1], list[2], list[3]];
  });

  ngOnInit(): void {
    // get most recent note previews (service already truncates preview text)
    this.notesService
      .getNotePreviews(NoteSortType.CREATION_DATE)
      .subscribe({
        next: (items) => this._previews.set(items.slice(0, 4)),
        error: () => this._previews.set([]),
      });
  }
}
