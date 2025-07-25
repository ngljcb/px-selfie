import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
})
export class HeaderComponent {
  menuOpen = false;

  navLinks = [
    { label: 'Calendar', href: 'calendar' },
    { label: 'Notes', href: 'notes' },
    { label: 'Pomodoro App', href: 'pomodoro' }
  ];

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }
}
