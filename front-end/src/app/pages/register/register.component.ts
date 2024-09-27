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

  constructor(private http: HttpClient, private router: Router) {}

  // Method to handle user registration
  onRegister(): void {
    const registerData = { username: this.username, password: this.password };

    this.http.post('http://localhost:8080/register', registerData).subscribe(
      response => {
        console.log('Registration successful:', response);
        alert('Registration successful!');
        this.router.navigate(['/login']); // Redirect to login after successful registration
      },
      error => {
        console.error('Registration failed:', error);
        alert('Registration failed. Please try again.');
      }
    );
  }
}
