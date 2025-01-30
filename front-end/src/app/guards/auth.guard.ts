import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, of, from } from 'rxjs';
import { switchMap, catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  private backendPort: string | null = null;  // Başlangıçta null
  private portLoaded = false;                 // İlk sefer port yüklendi mi?

  constructor(private http: HttpClient, private router: Router) {}

  canActivate(): Observable<boolean> {
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/login']);
      return of(false);
    }

    // Aşağıdaki akış: "portLoaded?" => Evet: validate-token; Hayır: önce portu al, sonra validate-token
    return this.ensurePortLoaded().pipe(
      switchMap(port => {
        // Port elde ettik. Şimdi validate-token isteğini yapalım
        const headers = { 'Authorization': `Bearer ${token}` };
        const url = `http://localhost:${port}/validate-token`;
        return this.http.get(url, { headers }).pipe(
          map(() => true),
          catchError(err => {
            // Token geçersiz
            this.router.navigate(['/login']);
            return of(false);
          })
        );
      })
    );
  }

  /**
   * ensurePortLoaded() => Portu döndüren bir Observable<string>.
   * Eğer 'portLoaded' true ise direkt 'this.backendPort' döneriz.
   * Değilse 9999'a istek atar, sonrasında 'this.backendPort' set ederiz.
   */
  private ensurePortLoaded(): Observable<string> {
    if (this.portLoaded && this.backendPort) {
      // Zaten yüklendi
      return of(this.backendPort);
    } else {
      // 9999'dan çekelim
      return this.http.get('http://127.0.0.1:9999/env/GO_BACKEND_PORT', { responseType: 'text' })
        .pipe(
          map(portVal => {
            const p = portVal.trim();
            this.backendPort = p;
            this.portLoaded = true;
            return p;
          }),
          catchError(err => {
            console.error('Port yüklenemedi, login sayfasına yönlendiriliyor.', err);
            this.router.navigate(['/login']);
            // Hata durumunda 'of("")' gibi bir şey dönebiliyoruz, canActivate false olsun
            return of("");
          })
        );
    }
  }
}
