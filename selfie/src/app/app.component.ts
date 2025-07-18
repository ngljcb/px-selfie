import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HomeViewComponent } from './home/home-view/home-view.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HomeViewComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'selfie';
}
