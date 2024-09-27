import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common'; // CommonModule'u import ediyoruz

@Component({
  selector: 'app-mydocuments',
  standalone: true, // Bu bileşen standalone
  templateUrl: './mydocuments.component.html',
  styleUrls: ['./mydocuments.component.css'],
  imports: [CommonModule] // CommonModule'u imports içerisine ekliyoruz
})
export class MyDocumentsComponent implements OnInit {
  documents: string[] = []; // Belgeleri saklayacağımız dizi

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.getDocuments();
  }

  getDocuments(): void {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('You need to be logged in to see your documents.');
      return;
    }

    const headers = { 'Authorization': `Bearer ${token}` };
    this.http.get<{documents: string[]}>('http://localhost:8080/documents', { headers })
      .subscribe(response => {
        this.documents = response.documents;
        console.log("Documents fetched: ", this.documents);
      }, error => {
        console.error('Error fetching documents:', error);
      });
  }
}
