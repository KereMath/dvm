import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  username: string = '';
  password: string = '';

  // Başlangıçta null => fallback yok
  private backendPort: string | null = null;

  constructor(private http: HttpClient, private router: Router) {
    // Her 1 saniyede port çek
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

  ngOnInit(): void {
    const token = localStorage.getItem('token');
    if (token) {
      this.router.navigate(['/upload']);
    }
  }

  onLogin(): void {
    if (!this.backendPort) {
      console.error('No backendPort => cannot do login request.');
      alert('Port not loaded; cannot login.');
      return;
    }

    const loginData = { username: this.username, password: this.password };
    const url = `http://localhost:${this.backendPort}/login`;

    this.http.post(url, loginData).subscribe({
      next: (response: any) => {
        if (response && response.token) {
          localStorage.setItem('token', response.token);
          alert('Login successful!');
          this.router.navigate(['/upload']);
        } else {
          alert('Login failed: No token received.');
        }
      },
      error: (err) => {
        console.error('Login failed:', err);
        alert('Login failed. Please check your username and password.');
      }
    });
  }
}
