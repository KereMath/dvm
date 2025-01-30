import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http'; 
import { Router } from '@angular/router';
import { trigger, style, animate, transition } from '@angular/animations';

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
  // Port başlangıçta null => fallback yok
  private backendPort: string | null = null;

  constructor(private http: HttpClient, private router: Router) {
    // Her 1 saniyede port çekiyoruz
    setInterval(() => {
      this.http.get('http://127.0.0.1:9999/env/GO_BACKEND_PORT', { responseType: 'text' })
        .subscribe({
          next: (portVal: string) => {
            this.backendPort = portVal.trim();
          },
          error: (err) => {
            console.error('GO_BACKEND_PORT alınamadı => backendPort=null', err);
            this.backendPort = null;
          }
        });
    }, 1000);
  }

  onActionClick(): void {
    this.router.navigate(['/login']);
  }

  onRegClick(): void {
    this.router.navigate(['/register']);
  }

  onBackendButtonClick(): void {
    // Port yoksa istek atma
    if (!this.backendPort) {
      console.error('No backendPort => cannot contact backend.');
      alert('Port not loaded; cannot reach backend.');
      return;
    }
    const url = `http://localhost:${this.backendPort}/hello-backend`;
    this.http.get(url).subscribe({
      next: response => {
        console.log('Backend Response:', response);
        alert('Response from backend: ' + JSON.stringify(response));
      },
      error: (err) => {
        console.error('Error from backend:', err);
        alert('An error occurred while contacting the backend: ' + err.message);
      }
    });
  }
}
