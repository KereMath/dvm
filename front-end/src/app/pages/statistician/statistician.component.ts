import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';  // Import FormsModule

interface Document {
  ID: string;
  OriginalName: string;
  Path: string;
  Owner: string;
}

@Component({
  selector: 'app-statistician',
  standalone: true,
  templateUrl: './statistician.component.html',
  styleUrls: ['./statistician.component.css'],
  imports: [CommonModule, FormsModule]
})
export class StatisticianComponent implements OnInit {
  documents: Document[] = [];
  selectedDocument: Document | null = null;
  isDocumentLocked: boolean = false;

  selectedOption: string | null = null; // 'ml' veya 'report'
  mlQuestions = [
    {
      question: 'Delete data to simulate missing data',
      options: ['Yes', 'No']
    },
    {
      question: 'Which imputation method would you like to use for filling missing values?',
      options: [
        'constant', 'mean', 'median', 'knn', 'linear_regression', 
        'multiple_imputation', 'ffill', 'bfill', 'drop_rows', 
        'drop_columns', 'pchip', 'linear_interpolation', 
        'neighbor_avg', 'mice'
      ]
    },
    {
      question: 'Question 3 for ML',
      options: ['True', 'False']
    }
  ];
  reportQuestions = [
    {
      question: 'Delete data to simulate missing data',
      options: ['Yes', 'No']
    },
    {
      question: 'Which imputation method would you like to use for filling missing values?',
      options: [
        'constant', 'mean', 'median', 'knn', 'linear_regression', 
        'multiple_imputation', 'ffill', 'bfill', 'drop_rows', 
        'drop_columns', 'pchip', 'linear_interpolation', 
        'neighbor_avg', 'mice'
      ]
    },
  ];

  mlAnswers: string[] = Array(this.mlQuestions.length).fill('');
  reportAnswers: string[] = Array(this.reportQuestions.length).fill('');

  currentQuestionIndex: number = 0;

  private backendPort: string | null = null; // Başlangıçta port yok

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    // 1) component açılınca port al, sonra getDocuments
    this.loadPortAndThenGetDocs();
  }

  private loadPortAndThenGetDocs(): void {
    this.http.get('http://127.0.0.1:9999/env/GO_BACKEND_PORT', { responseType: 'text' })
      .subscribe({
        next: (portVal: string) => {
          this.backendPort = portVal.trim();
          console.log('Statistician => port loaded:', this.backendPort);
          this.getDocuments();
        },
        error: (err) => {
          console.error('Port alınamadı => belgelere erişilemez.', err);
          alert('Cannot load port. Documents not fetched.');
        }
      });
  }

  private getDocuments(): void {
    if (!this.backendPort) {
      console.error('No backendPort => cannot get documents.');
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
          console.log("Documents fetched:", this.documents);
        },
        error: (err) => {
          console.error('Error fetching documents:', err);
        }
      });
  }

  selectDocument(document: Document): void {
    this.selectedDocument = document;
  }

  lockSelectedDocument(): void {
    if (this.selectedDocument) {
      this.isDocumentLocked = true;
      this.currentQuestionIndex = 0;
    }
  }

  onSelectOption(option: string): void {
    this.selectedOption = option;
    this.currentQuestionIndex = 0;
  }

  showNextQuestion(): void {
    this.currentQuestionIndex += 1;
  }

  canProceed(): boolean {
    if (this.selectedOption === 'ml') {
      return this.mlAnswers.every(answer => answer.trim() !== '');
    } else if (this.selectedOption === 'report') {
      return this.reportAnswers.every(answer => answer.trim() !== '');
    }
    return false;
  }

  proceed(): void {
    if (this.selectedOption === 'ml') {
      console.log('ML Prediction with answers:', this.mlAnswers);
    } else if (this.selectedOption === 'report') {
      console.log('Creating report with answers:', this.reportAnswers);
    }
  }

  sendAnswerToBackend(questionId: number, answer: string): void {
    if (!this.selectedDocument) {
      console.error('No document selected.');
      return;
    }
    if (!this.backendPort) {
      console.error('No backendPort => cannot send answer to backend.');
      return;
    }

    const body = {
      question_id: questionId,
      answer: answer,
      document_path: this.selectedDocument.Path,
      document_id: this.selectedDocument.ID
    };

    const url = `http://localhost:${this.backendPort}/process-question`;
    this.http.post(url, body)
      .subscribe({
        next: (resp) => {
          console.log('Answer processed:', resp);
          this.showNextQuestion();
        },
        error: (err) => {
          console.error('Error processing question:', err);
        }
      });
  }
}
