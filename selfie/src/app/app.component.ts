import { Component } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';
import { HomeViewComponent } from './home/home-view/home-view.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, HomeViewComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'Selfie';
  constructor(public router: Router) {}
}
