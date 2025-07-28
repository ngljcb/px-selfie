import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HomeBoxComponent } from '../home-box/home-box.component';
import { FeatureService, Feature } from '../../service/feature.service';

@Component({
  selector: 'app-home-view',
  imports: [CommonModule, HomeBoxComponent],
  templateUrl: './home-view.component.html'
})
export class HomeViewComponent {
  
  /*
  boxes = [
    {
      title: 'Calendar',
      description: 'Gestisci eventi, scadenze e attività con una vista intuitiva e sempre aggiornata.',
      link: '/calendar',
      iconClass: 'box-calendar'
    },
    {
      title: 'Notes',
      description: 'Annota idee, to-do e appunti importanti in uno spazio ordinato e accessibile.',
      link: '/notes',
      iconClass: 'box-notes'
    },
    {
      title: 'Pomodoro',
      description: 'Lavora con sessioni mirate e pause intelligenti per mantenere alta la produttività.',
      link: '/pomodoro',
      iconClass: 'box-pomodoro'
    },
    {
      title: 'Grades',
      description: 'Tieni sotto controllo i tuoi voti e calcola la media finale in modo semplice.',
      link: '/grades',
      iconClass: 'box-voto'
    }
  ];*/

  boxes: Feature[] = [];

  constructor(private featureService: FeatureService) {}

  ngOnInit(): void {
    this.featureService.getFeatures().subscribe({
      next: (features) => this.boxes = features,
      error: (err) => console.error('Errore nel recupero delle features', err)
    });
  }

}
