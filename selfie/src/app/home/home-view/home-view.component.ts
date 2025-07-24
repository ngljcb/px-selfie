import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HomeBoxComponent } from '../home-box/home-box.component';

@Component({
  selector: 'app-home-view',
  imports: [CommonModule, HomeBoxComponent],
  templateUrl: './home-view.component.html'
})
export class HomeViewComponent {
  boxes = [
    {
      title: 'Calendario',
      description: 'Visualizza e gestisci i tuoi eventi, scadenze e appuntamenti.',
      link: 'calendar'
    },
    {
      title: 'Note',
      description: 'Prendi appunti e organizza promemoria importanti.',
      link: '/'
    },
    {
      title: 'Pomodoro',
      description: 'Usa il timer per migliorare la concentrazione e la produttività.',
      link: '/'
    }
  ];
}
