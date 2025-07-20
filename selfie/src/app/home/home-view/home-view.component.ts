import { Component } from '@angular/core';
import { HeaderComponent } from '../../components/header/header.component';

@Component({
  selector: 'app-home-view',
  imports: [HeaderComponent],
  templateUrl: './home-view.component.html',
  styleUrl: './home-view.component.scss',
})
export class HomeViewComponent {}
