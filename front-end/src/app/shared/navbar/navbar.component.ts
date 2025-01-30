import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-navbar',
  standalone: true,
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
  imports: [CommonModule, RouterModule],
})
export class NavbarComponent implements OnInit {
  isLoggedIn = false;
  username: string = '';
  private backendPort: string | null = null;

  constructor(private http: HttpClient, private router: Router) {
    // İlk sefer portu çek
    this.http.get('http://127.0.0.1:9999/env/GO_BACKEND_PORT', { responseType: 'text' })
      .subscribe({
        next: (portVal: string) => {
          this.backendPort = portVal.trim();
          this.updateUserState(); // İlk seferde port geldi => user info vs.
        },
        error: (err) => {
          console.error('GO_BACKEND_PORT alınamadı => null', err);
          this.backendPort = null;
          // Yine de updateUserState => belki 401 vs.
          this.updateUserState();
        }
      });

    // Sonra her 1 saniyede yenile
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
    // Rota değişimlerinde user state yenile
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.updateUserState();
      }
    });
  }

  updateUserState(): void {
    const token = localStorage.getItem('token');
    this.isLoggedIn = !!token;
    if (this.isLoggedIn) {
      this.getUserInfo();
    } else {
      this.username = '';
    }
  }

  getUserInfo(): void {
    if (!this.backendPort) {
      console.error('No backendPort => cannot get user info.');
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) return;

    const headers = { Authorization: `Bearer ${token}` };
    const url = `http://localhost:${this.backendPort}/user`;

    this.http.get<{ user: { username: string } }>(url, { headers })
      .subscribe({
        next: (resp) => {
          this.username = resp.user.username;
        },
        error: (err) => {
          console.error('Error fetching user info:', err);
        }
      });
  }

  logout(): void {
    localStorage.removeItem('token');
    this.isLoggedIn = false;
    this.username = '';
    this.router.navigate(['/login']);
  }
}
