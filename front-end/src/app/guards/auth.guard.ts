import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {

  constructor(private http: HttpClient, private router: Router) {}

  canActivate(): Observable<boolean> {
    const token = localStorage.getItem('token');
    
    if (token) {
      // Token'i Authorization başlığına ekle
      const headers = { 'Authorization': `Bearer ${token}` };

      // Token'i back-end'e gönderip doğrulama yapıyoruz
      return this.http.get('http://localhost:8080/validate-token', { headers })
        .pipe(
          map(response => {
            // Eğer geçerliyse, erişime izin veriyoruz
            return true;
          }),
          catchError(error => {
            // Geçersizse, oturum açma sayfasına yönlendiriyoruz
            this.router.navigate(['/login']);
            return of(false);  // Hata durumunda false döndürülür
          })
        );
    } else {
      // Eğer token yoksa, giriş sayfasına yönlendiriyoruz
      this.router.navigate(['/login']);
      return of(false);  // Hemen false döndürür
    }
  }
}
