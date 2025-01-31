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
  role: number | null = null;
  private backendPort: string | null = null;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    // İlk başta portu çek ve kullanıcı bilgilerini güncelle
    this.updateBackendPort().then(() => {
      this.updateUserState();
    });

    // Rota değişimlerinde user state yenile
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.updateBackendPort().then(() => {
          this.updateUserState();
        });
      }
    });

    // Backend portunu sürekli güncelle (Her 5 saniyede bir)
    setInterval(() => {
      this.updateBackendPort();
    }, 5000);
  }

  /**
   * Backend portunu günceller (9999 numaralı env portundan çeker)
   */
  private async updateBackendPort(): Promise<void> {
    try {
      const portVal = await this.http
        .get('http://127.0.0.1:9999/env/GO_BACKEND_PORT', { responseType: 'text' })
        .toPromise();
      this.backendPort = portVal?.trim() || null;
    } catch (err) {
      console.error('GO_BACKEND_PORT alınamadı => null', err);
      this.backendPort = null;
    }
  }

  updateUserState(): void {
    const token = localStorage.getItem('token');
    this.isLoggedIn = !!token;
    if (this.isLoggedIn) {
      this.getUserInfo();
    } else {
      this.username = '';
      this.role = null;
    }
  }

  async getUserInfo(): Promise<void> {
    await this.updateBackendPort(); // Her istekten önce backend portunu çek

    if (!this.backendPort) {
      console.error('No backendPort => cannot get user info.');
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) return;

    const headers = { Authorization: `Bearer ${token}` };
    const url = `http://localhost:${this.backendPort}/user`;

    this.http.get<{ username: string; role: number }>(url, { headers })
      .subscribe({
        next: (resp) => {
          if (resp) {
            this.username = resp.username;
            this.role = resp.role;
          }
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
    this.role = null;
    this.router.navigate(['/login']);
  }
}
