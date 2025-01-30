import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  username: string = '';
  password: string = '';

  // Port yoksa istek atma => fallback yok
  private backendPort: string | null = null;

  constructor(private http: HttpClient, private router: Router) {
    setInterval(() => {
      this.http.get('http://127.0.0.1:9999/env/GO_BACKEND_PORT', { responseType: 'text' })
        .subscribe({
          next: (portVal: string) => {
            this.backendPort = portVal.trim();
          },
          error: (err) => {
            console.error('GO_BACKEND_PORT alınamadı => null', err);
            this.backendPort = null;
          }
        });
    }, 1000);
  }

  onRegister(): void {
    if (!this.backendPort) {
      console.error('No backendPort => cannot register.');
      alert('Port not loaded; cannot register user.');
      return;
    }
    const registerData = { username: this.username, password: this.password };
    const url = `http://localhost:${this.backendPort}/register`;

    this.http.post(url, registerData).subscribe({
      next: (resp) => {
        console.log('Registration successful:', resp);
        alert('Registration successful!');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('Registration failed:', err);
        alert('Registration failed. Please try again.');
      }
    });
  }
}
