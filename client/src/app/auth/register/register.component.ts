import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../service/auth.service';
import { RegisterResponse } from '../../model/response/register-response.model'; 

@Component({
  selector: 'app-register',
  imports: [CommonModule, FormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
  standalone: true
})
export class RegisterComponent {
  username = '';
  email = '';
  password = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit(): void {
    console.log('Dati registrazione:', {
      username: this.username,
      email: this.email,
      password: this.password
    });

    this.authService.register(this.email, this.username, this.password).subscribe({
      next: (res: RegisterResponse) => {
        console.log('Registrazione completata:', res);
        this.router.navigate(['/']);
      },
      error: (err: any) => console.error('Errore registrazione:', err)
    });
  }
}
