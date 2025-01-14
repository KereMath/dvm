import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

@Injectable({
  providedIn: 'root', // Bu Guard global olarak sağlanacak
})
export class RedirectGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): boolean {
    const token = localStorage.getItem('token'); // Kullanıcının giriş durumunu kontrol ediyoruz

    if (token) {
      // Giriş yapmışsa upload sayfasına yönlendir
      this.router.navigate(['/upload']);
      return false; // Mevcut rotaya erişimi engelle
    }

    // Giriş yapılmamışsa hello rotasına erişime izin ver
    return true;
  }
}
