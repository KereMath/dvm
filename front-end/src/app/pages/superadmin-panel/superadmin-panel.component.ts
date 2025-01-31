import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SidebarSuperadminComponent } from '../../components/sidebar-superadmin/sidebar-superadmin.component';

@Component({
  selector: 'app-superadmin-panel',
  standalone: true,
  templateUrl: './superadmin-panel.component.html',
  styleUrls: ['./superadmin-panel.component.css'],
  imports: [SidebarSuperadminComponent], // Sidebar bileşenini ekledik!
})
export class SuperadminPanelComponent implements OnInit {
  superadminTitle = 'Superadmin Panel';
  totalUsers = 0;
  totalDocuments = 0;
  totalErrors = 0;
  private backendPort: string | null = null;

  constructor(private http: HttpClient) {
    // Backend portunu çek
    this.http.get('http://127.0.0.1:9999/env/GO_BACKEND_PORT', { responseType: 'text' })
  .subscribe({
    next: (portVal: string) => {
      this.backendPort = portVal.trim();
      this.fetchStats(); // Port gelince API çağrısını yap
    },
    error: (err) => {
      console.error('GO_BACKEND_PORT alınamadı => null', err);
      this.backendPort = null;
    }
  });

  }

  ngOnInit(): void {}

  fetchStats(): void {
    if (!this.backendPort) {
      console.error('Backend port yok, stats çekilemiyor.');
      return;
    }

    this.http.get<{ totalUsers: number, totalDocuments: number, totalErrors: number }>(
      `http://localhost:${this.backendPort}/superadmin/stats`
    ).subscribe((data) => {
      this.totalUsers = data.totalUsers;
      this.totalDocuments = data.totalDocuments;
      this.totalErrors = data.totalErrors;
    });
  }
}
