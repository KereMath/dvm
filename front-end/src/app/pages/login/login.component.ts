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

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    const token = localStorage.getItem('token');
    if (token) {
      this.router.navigate(['/upload']);
    }
  }

  onLogin(): void {
    const loginData = { username: this.username, password: this.password };
    this.http.post('http://localhost:8080/login', loginData).subscribe(
      (response: any) => {
        if (response && response.token) {
          localStorage.setItem('token', response.token); // Token'i kaydet
          alert('Login successful!');
          this.router.navigate(['/upload']); // Yönlendirme yap
        } else {
          alert('Login failed: No token received.');
        }
      },
      (error) => {
        console.error('Login failed:', error);
        alert('Login failed. Please check your username and password.');
      }
    );
  }
}
