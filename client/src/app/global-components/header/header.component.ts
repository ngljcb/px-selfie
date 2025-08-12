import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../service/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './header.component.html',
})
export class HeaderComponent {
  menuOpen = false;
  username = sessionStorage.getItem('username')?.toUpperCase();
  home = '/';

  navLinks = [
    { label: 'Calendar', href: 'calendar' },
    { label: 'Notes', href: 'notes' },
    { label: 'Pomodoro App', href: 'timer' },
    { label: 'Grades', href: '#' }
  ];

   constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  get isRoot(): boolean {
    return this.router.url === '/';
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  onLogout(): void {
    this.authService.logout().subscribe({
      next: () => {
        sessionStorage.clear();
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('Errore durante il logout:', err);
        this.router.navigate(['/login']);
      }
    });
  }
}
