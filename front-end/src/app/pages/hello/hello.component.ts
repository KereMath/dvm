import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http'; // Import HttpClient
import { Router } from '@angular/router'; // Import Router
import { trigger, style, animate, transition } from '@angular/animations'; // Angular animasyonları

@Component({
  selector: 'app-hello',
  standalone: true,
  templateUrl: './hello.component.html',
  styleUrls: ['./hello.component.css'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-50px)' }),
        animate('800ms ease-in', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class HelloComponent {
  constructor(private http: HttpClient, private router: Router) {}

  onActionClick(): void {
    this.router.navigate(['/login']);
  }

  onRegClick(): void {
    this.router.navigate(['/register']);
  }

  onBackendButtonClick(): void {
    this.http.get('http://localhost:8080/hello-backend').subscribe(
      response => {
        console.log('Backend Response:', response);
        alert('Response from backend: ' + JSON.stringify(response));
      },
      error => {
        console.error('Error from backend:', error);
        alert('An error occurred while contacting the backend: ' + error.message);
      }
    );
  }
}