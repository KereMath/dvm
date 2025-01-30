import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root' // Tüm uygulama genelinde tek bir instance
})
export class FileService {
  private file: File | null = null;

  setFile(f: File) {
    this.file = f;
  }

  getFile(): File | null {
    return this.file;
  }
}
