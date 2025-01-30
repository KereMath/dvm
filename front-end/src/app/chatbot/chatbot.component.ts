import { Component } from '@angular/core';
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
export class ChatbotComponent {
  expanded = false;
  messages: { role: string; text: string }[] = [];
  userMessage = '';
  currentChatId: string | null = null;

  // Seçilen dosyayı burada da tutabiliriz (ama esas upload işlemi "upload.component"ta)
  selectedChatFile: File | null = null;

  constructor(
    private http: HttpClient,
    private fileService: FileService  // <-- Enjekte et
  ) {}

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
    this.http
      .post('http://127.0.0.1:8001/api/public_chat/create/', {}, {
        withCredentials: true,
      })
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

    this.http
      .post(
        'http://127.0.0.1:8001/api/public_chat/ask/',
        { message, chat_id: this.currentChatId },
        { withCredentials: true }
      )
      .subscribe({
        next: (response: any) => {
          // Asistan cevabını ekle
          this.messages.push({ role: 'assistant', text: response.response });
          // İçindeki komutları incele
          this.handleCommands(response.response);
          // Input temizle
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

    // 1) FileService'e kaydediyoruz
    this.fileService.setFile(file);

    // 2) Chat'te göstermek isterseniz
    this.messages.push({
      role: 'assistant',
      text: `Seçilen dosya: ${file.name}`
    });
  }

  // LLM cevabında [CLICK: #...] komutlarını parse
  handleCommands(assistantText: string) {
    // Regex ile [CLICK: #...] komutlarını bulalım
    const clickRegex = /\[CLICK:\s*([^\]]+)\]/g;
    let match;
    while ((match = clickRegex.exec(assistantText)) !== null) {
      const selector = match[1].trim(); // örn. "#uploadBtn"
  
      // Örneğin eğer #uploadBtn'e tıklanacaksa, önce dosya seçilmiş mi?
      if (selector === '#uploadBtn') {
        // "upload.component.html" içindeki file input'a veya selectedFile durumuna bakacağız
        // En basit yaklaşım: Angular 'disabled' parametresini kontrol veya DOM check
        const uploadBtnEl = document.querySelector('#uploadBtn') as HTMLButtonElement;
        if (uploadBtnEl) {
          // Butonun disable durumunu inceleyelim:
          if (uploadBtnEl.disabled) {
            // Henüz dosya seçilmemiş => Chat'e "dosya seçmen lazım" mesajı ekleyelim
            this.messages.push({
              role: 'assistant',
              text: 'Henüz bir dosya seçilmedi! Lütfen önce dosya ekleyin.'
            });
            // Burada .click() yaptırmıyoruz (ya da yapsak bile disabled = true olduğu için çalışmaz)
            continue; 
          }
        } 
        // Eğer disabled değilse, normal akışta tıklayalım:
      }
  
      // Diğer durumlarda (ör. #attachmentBtn veya #docBtn vs.):
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
