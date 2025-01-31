import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms'; // FormsModule eklendi
import { CommonModule } from '@angular/common'; // Bunu ekledik!
import { SidebarSuperadminComponent } from '../../components/sidebar-superadmin/sidebar-superadmin.component';

@Component({
  selector: 'app-superadmin-users',
  standalone: true,
  templateUrl: './superadmin-users.component.html',
  styleUrls: ['./superadmin-users.component.css'],
  imports: [FormsModule,CommonModule,SidebarSuperadminComponent], // Buraya FormsModule eklenmeli!
})
export class SuperadminUsersComponent implements OnInit {
  users: any[] = [];
  username: string = '';
  password: string = '';
  role: number = 0;
  private backendPort: string | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.updateBackendPort().then(() => {
      this.fetchUsers();
    });

    setInterval(() => {
      this.updateBackendPort();
    }, 5000);
  }

  async updateBackendPort(): Promise<void> {
    try {
      const portVal = await this.http
        .get('http://127.0.0.1:9999/env/GO_BACKEND_PORT', { responseType: 'text' })
        .toPromise();
      this.backendPort = portVal?.trim() || null;
    } catch (err) {
      console.error('GO_BACKEND_PORT alınamadı => null', err);
      this.backendPort = null;
    }
  }

  async fetchUsers(): Promise<void> {
    await this.updateBackendPort();
    if (!this.backendPort) return;

    this.http.get<any[]>(`http://localhost:${this.backendPort}/superadmin/users`)
      .subscribe({
        next: (data) => { this.users = data; },
        error: (err) => { console.error('Kullanıcıları alırken hata:', err); }
      });
  }

  async addUser(): Promise<void> {
    await this.updateBackendPort();
    if (!this.backendPort) return;

    const newUser = { username: this.username, password: this.password, role: this.role };

    this.http.post(`http://localhost:${this.backendPort}/superadmin/users`, newUser)
      .subscribe({
        next: () => {
          this.fetchUsers();
          this.username = '';
          this.password = '';
          this.role = 0;
        },
        error: (err) => { console.error('Kullanıcı ekleme hatası:', err); }
      });
  }

  async deleteUser(userId: string): Promise<void> {
    await this.updateBackendPort();
    if (!this.backendPort) return;

    this.http.delete(`http://localhost:${this.backendPort}/superadmin/users/${userId}`)
      .subscribe({
        next: () => { this.fetchUsers(); },
        error: (err) => { console.error('Kullanıcı silme hatası:', err); }
      });
  }
}
