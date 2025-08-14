import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HomeBoxComponent } from '../home-box/home-box.component';
import { FeatureService, Feature } from '../../../service/feature.service';

@Component({
  selector: 'app-home-view',
  imports: [CommonModule, HomeBoxComponent],
  templateUrl: './home-view.component.html'
})
export class HomeViewComponent {
  boxes: Feature[] = [];

  constructor(private featureService: FeatureService) {}

  ngOnInit(): void {
    this.featureService.getFeatures().subscribe({
      next: (features) => this.boxes = features,
      error: (err) => console.error('Errore nel recupero delle features', err)
    });
  }

}
