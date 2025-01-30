import tkinter as tk
from tkinter import messagebox, scrolledtext
import subprocess
import datetime
import os

# Log dosyası ismi
LOG_FILE = "logs_llm.txt"

# Loglama fonksiyonu
def log_message(message):
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_entry = f"[{timestamp}] {message}\n"
    
    # Logları dosyaya yaz
    with open(LOG_FILE, "a", encoding="utf-8") as log_file:
        log_file.write(log_entry)
    
    # UI'daki log bölümüne ekle
    log_text.config(state=tk.NORMAL)
    log_text.insert(tk.END, log_entry)
    log_text.config(state=tk.DISABLED)
    log_text.yview(tk.END)

def start_server():
    port = port_entry.get()
    
    if not port.isdigit():
        messagebox.showerror("Hata", "Lütfen geçerli bir port numarası girin!")
        log_message("HATA: Geçersiz port numarası girildi.")
        return

    try:
        # Django loglarını ayrı bir dosyaya kaydetmek için
        django_log_file = open("django_logs.txt", "w", encoding="utf-8")
        
        # Django server'ı belirtilen portta çalıştır
        process = subprocess.Popen(
            ["python", "manage.py", "runserver", f"0.0.0.0:{port}"],
            stdout=django_log_file,
            stderr=subprocess.STDOUT,
            creationflags=subprocess.CREATE_NO_WINDOW  # Terminal açılmasını engeller
        )
        
        log_message(f"Server {port} portunda başlatıldı.")
        messagebox.showinfo("Başlatıldı", f"Server {port} portunda çalışıyor!")

    except Exception as e:
        error_message = f"Server başlatılamadı! Hata: {str(e)}"
        log_message(error_message)
        messagebox.showerror("Hata", error_message)

# Tkinter UI
root = tk.Tk()
root.title("Django Başlatıcı")
root.geometry("400x300")

# Port giriş alanı
tk.Label(root, text="Çalıştırmak istediğiniz portu girin:").pack(pady=5)
port_entry = tk.Entry(root)
port_entry.pack(pady=5)

# Başlat butonu
start_button = tk.Button(root, text="Başlat", command=start_server)
start_button.pack(pady=5)

# Log ekranı (readonly scrolled text)
tk.Label(root, text="Loglar:").pack(pady=5)
log_text = scrolledtext.ScrolledText(root, height=10, width=50, state=tk.DISABLED)
log_text.pack(pady=5)

# Tkinter çalıştır
root.mainloop()
