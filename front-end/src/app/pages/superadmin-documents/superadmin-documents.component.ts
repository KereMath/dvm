import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarSuperadminComponent } from '../../components/sidebar-superadmin/sidebar-superadmin.component';

interface FileEntry {
  key: string;
  name: string;
  size: number;
  lastModified: string;
  isDir: boolean;
  ownerName: string;
  originalName: string; 
}

interface ExplorerResponse {
  buckets?: string[];
  files?: FileEntry[];
  isBucket: boolean;
}

@Component({
  selector: 'app-superadmin-documents',
  standalone: true,
  templateUrl: './superadmin-documents.component.html',
  styleUrls: ['./superadmin-documents.component.css'],
  imports: [CommonModule, FormsModule, SidebarSuperadminComponent],
})
export class SuperadminDocumentsComponent implements OnInit {
  bucket: string = '';
  prefix: string = '';
  searchTerm: string = '';
  sortBy: string = 'name';
  recursive: boolean = false;

  bucketList: string[] = [];
  files: FileEntry[] = [];
  isBucketList: boolean = false;

  // Modal için
  selectedFile: FileEntry | null = null;

  // MinIO Browser Link
  minioBrowserUrl: string = '';

  // Çoklu seçim
  selectedKeys = new Set<string>(); 

  // Bucket create/remove
  newBucketName: string = '';
  removeBucketName: string = '';

  private backendPort: string | null = null;
  private minioPort: string | null = null; // MinIO port

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    // Env portları çek
    this.updateEnvPorts().then(() => {
      this.fetchData();
    });
    // Arada bir yenile
    setInterval(() => {
      this.updateEnvPorts();
    }, 5000);
  }

  async updateEnvPorts(): Promise<void> {
    try {
      const portVal = await this.http
        .get('http://127.0.0.1:9999/env/GO_BACKEND_PORT', { responseType: 'text' })
        .toPromise();
      this.backendPort = portVal?.trim() || null;
    } catch (err) {
      console.error('GO_BACKEND_PORT alınamadı => null', err);
      this.backendPort = null;
    }

    try {
      const minioVal = await this.http
        .get('http://127.0.0.1:9999/env/MINIO_PORT', { responseType: 'text' })
        .toPromise();
      this.minioPort = minioVal?.trim() || null;
      if (this.minioPort) {
        this.minioBrowserUrl = `http://localhost:${this.minioPort}/browser`;
      } else {
        this.minioBrowserUrl = '';
      }
    } catch (err) {
      console.error('MINIO_PORT alınamadı => null', err);
      this.minioBrowserUrl = '';
      this.minioPort = null;
    }
  }

  fetchData(): void {
    if (!this.backendPort) {
      console.error('No backend port => can not fetch');
      return;
    }
    const url = `http://localhost:${this.backendPort}/superadmin/minio/explorer`;
    const params = new URLSearchParams();
    if (this.bucket) params.set('bucket', this.bucket);
    if (this.prefix) params.set('prefix', this.prefix);
    if (this.searchTerm) params.set('search', this.searchTerm);
    if (this.sortBy) params.set('sort', this.sortBy);
    if (this.recursive) params.set('recursive', 'true');

    this.http.get<ExplorerResponse>(`${url}?${params.toString()}`).subscribe({
      next: (resp) => {
        this.isBucketList = resp.isBucket;
        if (!resp.isBucket) {
          this.bucketList = resp.buckets || [];
          this.files = [];
        } else {
          this.files = resp.files || [];
          this.bucketList = [];
        }
        // Modal ve seçimler sıfırla
        this.selectedFile = null;
        this.selectedKeys.clear();
      },
      error: (err) => {
        console.error('Fetch Data Error:', err);
      },
    });
  }

  openBucket(b: string): void {
    this.bucket = b;
    this.prefix = '';
    this.fetchData();
  }

  openFolder(file: FileEntry): void {
    if (!file.isDir) return;
    this.prefix = file.key;
    this.fetchData();
  }

  goUp(): void {
    if (!this.prefix) return;
    let parts = this.prefix.split('/');
    while (parts.length > 0 && parts[parts.length - 1] === '') {
      parts.pop();
    }
    if (parts.length > 0) {
      parts.pop();
    }
    this.prefix = parts.join('/');
    if (this.prefix && !this.prefix.endsWith('/')) {
      this.prefix += '/';
    }
    this.fetchData();
  }

  goAllBuckets(): void {
    this.bucket = '';
    this.prefix = '';
    this.fetchData();
  }

  // Modal
  showFileDetails(file: FileEntry): void {
    this.selectedFile = file;
  }
  closeModal(): void {
    this.selectedFile = null;
  }

  // Download
  downloadFile(file: FileEntry): void {
    if (!this.backendPort) return;
    const url = `http://localhost:${this.backendPort}/superadmin/minio/download?bucket=${this.bucket}&key=${file.key}`;
    window.open(url, '_blank');
  }

  downloadSelected(): void {
    if (!this.backendPort) return;
    this.selectedKeys.forEach((key) => {
      const url = `http://localhost:${this.backendPort}/superadmin/minio/download?bucket=${this.bucket}&key=${key}`;
      window.open(url, '_blank');
    });
  }

  // Preview
  previewFile(file: FileEntry): void {
    if (!this.backendPort) return;
    const url = `http://localhost:${this.backendPort}/superadmin/minio/download?bucket=${this.bucket}&key=${file.key}`;
    window.open(url, '_blank'); 
  }

  // Delete
  deleteFile(file: FileEntry): void {
    if (!this.backendPort) return;
    const body = { bucket: this.bucket, key: file.key };
    this.http.post<{ message: string }>(`http://localhost:${this.backendPort}/superadmin/minio/delete`, body)
      .subscribe({
        next: (resp) => {
          console.log('Silme başarılı:', resp.message);
          this.fetchData();
        },
        error: (err) => {
          console.error('Dosya silme hatası:', err);
        }
      });
  }

  deleteSelected(): void {
    if (!this.backendPort) return;
    const keys = Array.from(this.selectedKeys);
    let count = 0;
    keys.forEach((key) => {
      const body = { bucket: this.bucket, key };
      this.http.post<{ message: string }>(`http://localhost:${this.backendPort}/superadmin/minio/delete`, body)
        .subscribe({
          next: () => {
            count++;
            if (count === keys.length) {
              this.fetchData();
            }
          },
          error: (err) => {
            console.error('Dosya silme hatası:', err);
          }
        });
    });
  }

  toggleSelection(file: FileEntry, event: any): void {
    if (event.target.checked) {
      this.selectedKeys.add(file.key);
    } else {
      this.selectedKeys.delete(file.key);
    }
  }

  // Bucket Create
  createBucket(): void {
    if (!this.backendPort) return;
    if (!this.newBucketName) {
      alert('Bucket name is required');
      return;
    }
    const body = { bucketName: this.newBucketName };
    this.http.post<{ message: string }>(`http://localhost:${this.backendPort}/superadmin/minio/create-bucket`, body)
      .subscribe({
        next: (resp) => {
          console.log('Bucket oluşturma:', resp.message);
          this.newBucketName = '';
          this.fetchData();
        },
        error: (err) => {
          console.error('Bucket oluşturma hatası:', err);
        }
      });
  }

  // Bucket Remove
  removeBucket(): void {
    if (!this.backendPort) return;
    if (!this.removeBucketName) {
      alert('Bucket name is required');
      return;
    }
    const body = { bucketName: this.removeBucketName };
    this.http.post<{ message: string }>(`http://localhost:${this.backendPort}/superadmin/minio/remove-bucket`, body)
      .subscribe({
        next: (resp) => {
          console.log('Bucket silme:', resp.message);
          this.removeBucketName = '';
          this.fetchData();
        },
        error: (err) => {
          console.error('Bucket silme hatası:', err);
        }
      });
  }
}
