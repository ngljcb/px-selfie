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
    { label: 'Calendar', href: '#' },
    { label: 'Notes', href: '#' },
    { label: 'Pomodoro App', href: '#' }
  ];

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }
}