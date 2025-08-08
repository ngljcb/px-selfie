import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';
import { HeaderComponent } from './global-components/header/header.component';
import { TimeMachineComponent } from './global-components/time-machine/time-machine.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, HeaderComponent, TimeMachineComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'Selfie';
  hiddenHeaderRoutes = ['/login', '/register'];

  constructor(public router: Router) {}

  get showHeader(): boolean {
    if (this.router.url === '/' || this.router.url === '')
      return true;

    return !this.hiddenHeaderRoutes.some(route => this.router.url.startsWith(route));
  }
}
