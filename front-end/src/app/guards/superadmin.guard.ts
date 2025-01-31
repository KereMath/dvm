import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class SuperadminGuard implements CanActivate {
  private backendPort: string | null = null;
  private userRole: number | null = null;

  constructor(private router: Router, private http: HttpClient) {}

  async getBackendPort(): Promise<string | null> {
    try {
      const port = await this.http
        .get('http://127.0.0.1:9999/env/GO_BACKEND_PORT', { responseType: 'text' })
        .toPromise();
      return port?.trim() || null;
    } catch (error) {
      console.error('Backend port alınamadı:', error);
      return null;
    }
  }

  async getUserRole(): Promise<number | null> {
    this.backendPort = await this.getBackendPort();
    if (!this.backendPort) return null;

    const token = localStorage.getItem('token');
    if (!token) return null;

    try {
      const response = await this.http
        .get<{ role: number }>(`http://localhost:${this.backendPort}/user`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .toPromise();
      return response?.role ?? null;
    } catch (error) {
      console.error('User role alınamadı:', error);
      return null;
    }
  }

  async canActivate(): Promise<boolean | UrlTree> {
    this.userRole = await this.getUserRole();

    if (this.userRole === 2) {
      return true; // Kullanıcı süperadmin, erişime izin ver
    } else {
      console.warn('Superadmin sayfasına yetkisiz erişim. /upload sayfasına yönlendiriliyor.');
      return this.router.createUrlTree(['/upload']); // Yetkisi yoksa yönlendir
    }
  }
}
