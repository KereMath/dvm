import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface Document {
  ID: string;
  OriginalName: string;
  Path: string;
  Owner: string;
}

@Component({
  selector: 'app-mydocuments',
  standalone: true,
  templateUrl: './mydocuments.component.html',
  styleUrls: ['./mydocuments.component.css'],
  imports: [CommonModule],
})
export class MyDocumentsComponent implements OnInit {
  documents: Document[] = [];
  
  private backendPort: string | null = null; // Başlangıçta null => port bilinmiyor

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    // 1) Component açılırken önce portu tek sefer çek
    this.loadPortAndThenDocuments();
  }

  /**
   * 2) Portu config API'den çek. Başarılı olursa getDocuments() çağır.
   *    Başarısız olursa alert/hata/log vb.
   */
  private loadPortAndThenDocuments() {
    this.http.get('http://127.0.0.1:9999/env/GO_BACKEND_PORT', { responseType: 'text' })
      .subscribe({
        next: (portVal: string) => {
          this.backendPort = portVal.trim();
          console.log('Port loaded =>', this.backendPort);
          // Şimdi evrakları çekelim
          this.getDocuments();
        },
        error: (err) => {
          console.error('Port bilgisi alınamadı, bu sayfada işlem yapılamaz.', err);
          alert('Could not load port configuration. Please check conf.py or .env.');
        }
      });
  }

  /**
   * Asıl documents çekme
   */
  private getDocuments(): void {
    if (!this.backendPort) {
      console.error('No backendPort loaded => cannot fetch documents.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      alert('You need to be logged in to see your documents.');
      return;
    }
  
    const headers = { 'Authorization': `Bearer ${token}` };
    const url = `http://localhost:${this.backendPort}/documents`;

    this.http.get<{ documents: Document[] }>(url, { headers })
      .subscribe({
        next: (response) => {
          this.documents = response.documents;
          console.log('Documents fetched:', this.documents);
        },
        error: (error) => {
          console.error('Error fetching documents:', error);
          alert('Failed to fetch documents. Check console for details.');
        }
      });
  }

  confirmDelete(documentId: string): void {
    const userConfirmed = confirm('Are you sure you want to delete this document?');
    if (userConfirmed) {
      this.deleteDocument(documentId);
    }
  }

  private deleteDocument(documentId: string): void {
    if (!this.backendPort) {
      console.error('No backendPort => cannot delete documents.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      alert('You need to be logged in to delete your documents.');
      return;
    }

    const headers = { 'Authorization': `Bearer ${token}` };
    const url = `http://localhost:${this.backendPort}/delete-file/${documentId}`;

    this.http.delete(url, { headers })
      .subscribe({
        next: () => {
          // Başarıyla silindikten sonra listeden kaldır
          this.documents = this.documents.filter(doc => doc.ID !== documentId);
          console.log(`Document ${documentId} deleted successfully.`);
        },
        error: (err) => {
          console.error('Error deleting document:', err);
          alert('Failed to delete the document.');
        }
      });
  }

  viewInsights(documentId: string): void {
    this.router.navigate([`/singleDoc/${documentId}`]);
  }
}
