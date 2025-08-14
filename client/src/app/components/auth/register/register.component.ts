import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../service/auth.service';
import { RegisterResponse } from '../../../model/response/register-response.model';

@Component({
  selector: 'app-register',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
  standalone: true
})
export class RegisterComponent {
  name = '';
  birthday = '';
  username = '';
  email = '';
  password = '';
  registerError: string | null = null;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit(): void {
    this.registerError = null;

    if (!this.username || !this.email || !this.password || !this.name || !this.birthday) {
      this.registerError = 'Tutti i campi sono obbligatori.';
      return;
    }

    this.authService.register(this.email, this.username, this.password, this.name, this.birthday).subscribe({
      next: (res: RegisterResponse) => {
        console.log('Registrazione completata:', res);
        this.router.navigate(['/login']);
      },
      error: (err: any) => {
        console.error('Errore registrazione:', err);
        this.registerError =
          err?.error?.error || 'Errore imprevisto durante la registrazione.';
      }
    });
  }
}
