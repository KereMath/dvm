import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FileService } from '../services/file.service'; // <-- Servisi içe aktarın

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [HttpClientModule, FormsModule, CommonModule],
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css'],
})
export class ChatbotComponent implements OnInit {
  
  expanded = false;
  messages: { role: string; text: string }[] = [];
  userMessage = '';
  currentChatId: string | null = null;
  selectedChatFile: File | null = null;

  // Başlangıçta varsayılan portu 8001 olarak atayabiliriz (ya da 8015 vb.)
  chatAppPort = '8001';

  constructor(
    private http: HttpClient,
    private fileService: FileService
  ) {}

  ngOnInit(): void {
    // Her 1 saniyede bir /env/CHATAPP_PORT'tan portu çekip "chatAppPort" değişkenine at.
    setInterval(() => {
      this.http.get('http://127.0.0.1:9999/env/CHATAPP_PORT', { responseType: 'text' })
        .subscribe({
          next: (portVal: string) => {
            const trimmedPort = portVal.trim();
            this.chatAppPort = trimmedPort;  // en güncel port
          },
          error: (err) => {
            console.error('CHATAPP_PORT alınamadı:', err);
          }
        });
    }, 1000); // 1000 ms = 1 saniye
  }

  toggleChat() {
    this.expanded = !this.expanded;
    if (this.expanded) {
      this.createNewChat();
    }
  }

  closeChat() {
    this.expanded = false;
  }

  createNewChat() {
    // Artık sabit 8001 yerine dinamik chatAppPort değeri kullanıyoruz
    const createUrl = `http://127.0.0.1:${this.chatAppPort}/api/public_chat/create/`;

    this.http.post(createUrl, {}, { withCredentials: true })
      .subscribe({
        next: (response: any) => {
          console.log('Yeni sohbet oluşturuldu:', response);
          this.currentChatId = response.chat_id;
          this.messages = [];
        },
        error: (error) => {
          console.error('Yeni sohbet oluşturulurken hata oluştu:', error);
        },
      });
  }

  sendMessage() {
    if (this.userMessage.trim() === '') {
      console.error('Mesaj boş olamaz');
      return;
    }
    if (!this.currentChatId) {
      console.error('Aktif bir sohbet yok');
      return;
    }

    const message = this.userMessage.trim();
    this.messages.push({ role: 'user', text: message });

    const askUrl = `http://127.0.0.1:${this.chatAppPort}/api/public_chat/ask/`;

    this.http.post(
      askUrl,
      { message, chat_id: this.currentChatId },
      { withCredentials: true }
    )
    .subscribe({
      next: (response: any) => {
        // Asistan cevabını ekle
        this.messages.push({ role: 'assistant', text: response.response });
        this.handleCommands(response.response);
        this.userMessage = '';
      },
      error: (error) => {
        console.error('Mesaj gönderme sırasında hata oluştu:', error);
      },
    });
  }

  // ChatBot içerisinde "Ataş" butonuna (id="attachmentBtn") tıklama
  triggerAttachmentInput() {
    const fileInput = document.getElementById('chatAttachInput') as HTMLElement;
    fileInput.click();
  }

  // Dosya seçildiğinde
  onChatFileSelected(event: any) {
    const file = event.target.files[0];
    this.selectedChatFile = file;
    this.fileService.setFile(file);
    this.messages.push({
      role: 'assistant',
      text: `Seçilen dosya: ${file.name}`
    });
  }

  // Komutları parse
  handleCommands(assistantText: string) {
    const clickRegex = /\[CLICK:\s*([^\]]+)\]/g;
    let match;
    while ((match = clickRegex.exec(assistantText)) !== null) {
      const selector = match[1].trim();
      if (selector === '#uploadBtn') {
        const uploadBtnEl = document.querySelector('#uploadBtn') as HTMLButtonElement;
        if (uploadBtnEl && uploadBtnEl.disabled) {
          this.messages.push({
            role: 'assistant',
            text: 'Henüz bir dosya seçilmedi! Lütfen önce dosya ekleyin.'
          });
          continue;
        }
      }

      setTimeout(() => {
        const el = document.querySelector(selector) as HTMLElement;
        if (el) {
          el.click();
          console.log(`Clicked element: ${selector}`);
        } else {
          console.warn(`Element not found: ${selector}`);
        }
      }, 200);
    }
  }
}
