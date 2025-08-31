import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HomeBoxComponent } from '../home-box/home-box.component';
import { FeatureService, Feature } from '../../../service/feature.service';
import { DragDropModule, CdkDragDrop, transferArrayItem, moveItemInArray } from '@angular/cdk/drag-drop';
import { CalendarComponent } from '../widgets/calendar/calendar.component';
import { NotesComponent } from '../widgets/notes/notes.component';
import { StatsComponent } from '../widgets/stats/stats.component';

@Component({
  selector: 'app-home-view',
  imports: [CommonModule, HomeBoxComponent, DragDropModule, CalendarComponent, NotesComponent, StatsComponent],
  templateUrl: './home-view.component.html',
  styleUrl: './home-view.component.scss'
})
export class HomeViewComponent {
  boxes: Feature[] = [];

  // Tre slot (ognuno contiene al più 1 elemento). Gli ID sono: 'calendar' | 'notes' | 'stats'
  leftSlot: string[] = ['calendar'];
  rightTopSlot: string[] = ['stats'];
  rightBottomSlot: string[] = ['notes'];

  constructor(private featureService: FeatureService) {}

  ngOnInit(): void {
    this.featureService.getFeatures().subscribe({
      next: (features) => this.boxes = features,
      error: (err) => console.error('Errore nel recupero delle features', err)
    });
  }

  onDrop(evt: CdkDragDrop<string[]>) {
    if (evt.previousContainer === evt.container) {
      moveItemInArray(evt.container.data, evt.previousIndex, evt.currentIndex);
      return;
    }

    const src = evt.previousContainer.data;
    const dest = evt.container.data;

    // Ogni slot ha max 1 elemento: se occupato, scambialo con la sorgente
    if (dest.length) {
      src.push(dest[0]);
      dest.splice(0, 1);
    }

    transferArrayItem(src, dest, evt.previousIndex, 0);
  }
}
