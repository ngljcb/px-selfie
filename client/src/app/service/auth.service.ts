import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { AuthResponse, createClient } from '@supabase/supabase-js'
import { Observable, from } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  supabase = createClient(
    environment.SUPABASE_URL,
    environment.SUPABASE_KEY
  );
}