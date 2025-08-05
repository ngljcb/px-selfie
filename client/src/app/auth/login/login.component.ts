import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../service/auth.service';
import { StatisticsService } from '../../service/statistics.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  email = '';
  password = '';
  loginError: string | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private statisticsService: StatisticsService
  ) {}
  
  onSubmit(): void {
    this.loginError = null;

    if (!this.email || !this.password) {
      this.loginError = 'Tutti i campi sono obbligatori.';
      return;
    }

    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        // Login riuscito, ora controlla lo streak
        this.statisticsService.checkLoginStreak().subscribe({
          next: (streakInfo) => {
            console.log('Controllo streak completato:', streakInfo);
            this.router.navigate(['/']);
          },
          error: (streakError) => {
            console.error('Errore nel controllo dello streak (non bloccante):', streakError);
            // Non bloccare il login per questo errore
            this.router.navigate(['/']);
          }
        });
      },
      error: (err: any) => {
        console.error('Errore login:', err);
        this.loginError = err?.error?.error || 'Errore durante il login.';
      }
    });
  }
}