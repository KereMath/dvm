import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';  
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';  
import * as Papa from 'papaparse';  
import * as XLSX from 'xlsx';       

@Component({
  selector: 'app-single-document',
  templateUrl: './single-document.component.html',
  styleUrls: ['./single-document.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class SingleDocumentComponent implements OnInit {
  documentId: string = '';  
  documentData: any = {};   
  tableData: any[][] = [];  
  displayedData: any[][] = []; // For pagination
  currentPage: number = 0;
  rowsPerPage: number = 20; // rows per page (excluding header)

  private backendPort: string | null = null; // Başlangıçta port bilinmiyor

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.documentId = params.get('docID') || '';
      // 1) İlk iş => portu yükle, sonra belgeyi fetch et
      this.loadPortAndThenFetch();
    });
  }

  private loadPortAndThenFetch() {
    this.http.get('http://127.0.0.1:9999/env/GO_BACKEND_PORT', { responseType: 'text' })
      .subscribe({
        next: (portVal: string) => {
          this.backendPort = portVal.trim();
          console.log('Loaded port =>', this.backendPort);
          this.fetchDocumentData();  // Port geldikten sonra
        },
        error: (err) => {
          console.error('Port alınamadı => belge getirilemez.', err);
          alert('Could not load port config. Document cannot be fetched.');
        }
      });
  }

  private fetchDocumentData(): void {
    if (!this.backendPort) {
      console.error('No backendPort => cannot fetch document data.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      alert('You need to be logged in to view the document.');
      return;
    }

    const headers = { 'Authorization': `Bearer ${token}` };
    const url = `http://localhost:${this.backendPort}/documents/${this.documentId}`;

    this.http.get(url, { headers })
      .subscribe({
        next: (response: any) => {
          this.documentData = response;
          console.log('Fetched Document Data:', this.documentData);

          if (this.documentData.path.endsWith('.csv')) {
            this.parseCSVBackend();
          } else if (
            this.documentData.path.endsWith('.xls') ||
            this.documentData.path.endsWith('.xlsx')
          ) {
            this.parseExcelBackend();
          }
        },
        error: (error) => {
          console.error('Error fetching document data:', error);
        }
      });
  }

  // CSV parse
  private parseCSVBackend(): void {
    if (!this.backendPort) return;

    const url = `http://localhost:${this.backendPort}/document-content/${this.documentId}`;
    this.http.get(url, { responseType: 'text' })
      .subscribe(csvData => {
        Papa.parse(csvData, {
          complete: (result: Papa.ParseResult<string[]>) => {
            // Boş olmayan satırlar
            this.tableData = result.data.filter(row =>
              row.some(cell => cell && cell.trim() !== '')
            );
            this.updateDisplayedData();
          }
        });
      });
  }

  // Excel parse
  private parseExcelBackend(): void {
    if (!this.backendPort) return;

    const url = `http://localhost:${this.backendPort}/document-content/${this.documentId}`;
    this.http.get(url, { responseType: 'arraybuffer' })
      .subscribe(arrayBuffer => {
        const data = new Uint8Array(arrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

        this.tableData = jsonData.filter((row: any[]) =>
          row.some(cell => cell && cell.toString().trim() !== '')
        );
        this.updateDisplayedData();
      });
  }

  // Pagination
  updateDisplayedData(): void {
    const start = this.currentPage * this.rowsPerPage + 1; // skip header row
    const end = start + this.rowsPerPage;
    this.displayedData = this.tableData.slice(start, end);
  }

  nextPage(): void {
    if ((this.currentPage + 1) * this.rowsPerPage + 1 < this.tableData.length) {
      this.currentPage++;
      this.updateDisplayedData();
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.updateDisplayedData();
    }
  }

  getTotalPages(): number {
    // Exclude header row from pagination
    return Math.ceil((this.tableData.length - 2) / this.rowsPerPage);
  }

  goToStatistician(): void {
    window.location.href = '/statistician';
  }
}
