import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

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
    { label: 'Pomodoro App', href: 'timer' },
    { label: 'Grades', href: '#' }
  ];

  constructor(private router: Router) {}

  get isRoot(): boolean {
    return this.router.url === '/';
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }
}
