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
  isLoggedIn = false; // Kullanıcı giriş yapmış mı
  username: string = ''; // Kullanıcı adı

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.updateUserState(); // İlk durumu güncelle

    // Her rota değişikliğinde kullanıcı durumunu kontrol et
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.updateUserState();
      }
    });
  }

  updateUserState(): void {
    const token = localStorage.getItem('token');
    this.isLoggedIn = !!token; // Token varsa true, yoksa false

    if (this.isLoggedIn) {
      this.getUserInfo(); // Kullanıcı bilgilerini al
    } else {
      this.username = ''; // Kullanıcı çıkış yapmışsa kullanıcı adını sıfırla
    }
  }

  getUserInfo(): void {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    this.http
      .get<{ user: { username: string } }>('http://localhost:8080/user', { headers })
      .subscribe(
        (response) => {
          this.username = response.user.username; // Kullanıcı adı alındı
        },
        (error) => {
          console.error('Error fetching user info:', error);
        }
      );
  }

  logout(): void {
    localStorage.removeItem('token'); // Token'ı kaldır
    this.isLoggedIn = false; // Kullanıcı giriş durumunu sıfırla
    this.username = ''; // Kullanıcı adını sıfırla
    this.router.navigate(['/login']); // Kullanıcıyı login sayfasına yönlendir
  }
}
