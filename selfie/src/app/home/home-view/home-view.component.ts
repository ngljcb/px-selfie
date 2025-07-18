import { Component } from '@angular/core';
import { HomeHeaderComponent } from '../home-header/home-header.component';

@Component({
  selector: 'app-home-view',
  imports: [HomeHeaderComponent],
  templateUrl: './home-view.component.html',
  styleUrl: './home-view.component.scss',
})
export class HomeViewComponent {}
