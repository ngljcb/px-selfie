import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../service/auth.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  username = '';
  password = '';
  loginError: string | null = null;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit(): void {
    this.loginError = null;

    if (!this.username || !this.password) {
      this.loginError = 'Tutti i campi sono obbligatori.';
      return;
    }

    this.authService.login(this.username, this.password).subscribe({
      next: (res) => {
        if (res?.user?.username) sessionStorage.setItem('username', res.user.username);
        if (res?.user?.id) sessionStorage.setItem('userid', res.user.id);
        this.router.navigate(['/']);
      },
      error: (err: any) => {
        console.error('Errore login:', err);
        this.loginError = err?.error?.error || 'Errore durante il login.';
      }
    });
  }
}
