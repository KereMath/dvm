import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

function isValidFileExtension(fileName: string): boolean {
  const allowedExtensions = ['csv', 'xls', 'xlsx'];
  const fileExtension = fileName.split('.').pop()?.toLowerCase();
  return allowedExtensions.includes(fileExtension || '');
}

@Component({
  selector: 'app-upload',
  standalone: true,
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.css']
})
export class UploadComponent {
  selectedFile: File | null = null;

  private backendPort: string | null = null;

  constructor(private http: HttpClient, private router: Router) {
    setInterval(() => {
      this.http.get('http://127.0.0.1:9999/env/GO_BACKEND_PORT', { responseType: 'text' })
        .subscribe({
          next: (portVal: string) => {
            this.backendPort = portVal.trim();
          },
          error: (err) => {
            console.error('GO_BACKEND_PORT alınamadı => null', err);
            this.backendPort = null;
          }
        });
    }, 1000);
  }

  onFileSelected(event: any): void {
    this.selectedFile = event.target.files[0];
    const file = this.selectedFile;
    if (file) {
      const fileNameElement = document.getElementById('file-name');
      if (fileNameElement) {
        fileNameElement.textContent = file.name;
      }

      if (!isValidFileExtension(file.name)) {
        alert('Invalid file type. Please upload a CSV or Excel file.');
        this.selectedFile = null;
      }
    }
  }

  onSubmit(): void {
    console.log("Submitting the form (upload.component) without page refresh");

    if (!this.backendPort) {
      console.error('No backendPort => cannot upload.');
      alert('Port not loaded; cannot upload file.');
      return;
    }
    if (!this.selectedFile) {
      alert('Please select a file to upload.');
      return;
    }

    const formData = new FormData();
    formData.append('file', this.selectedFile);

    const token = localStorage.getItem('token');
    if (!token) {
      alert('No token found. Please log in again.');
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };
    const url = `http://localhost:${this.backendPort}/upload`;

    this.http.post(url, formData, { headers })
      .subscribe({
        next: (resp) => {
          console.log('File uploaded successfully', resp);
          alert('File uploaded successfully!');
        },
        error: (err) => {
          console.error('Error uploading file', err);
          alert('Error uploading file. Please try again.');
        }
      });
  }

  goToMyDocuments(): void {
    this.router.navigate(['/mydocuments']);
  }
}
