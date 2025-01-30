import tkinter as tk
from tkinter import scrolledtext, ttk
import subprocess
import threading
import time
import os
import re

# Bazı mesaj kutularını kullanmak için
import tkinter.messagebox

# ==================== .env Dosyası Okuma/Yazma Fonksiyonları ====================

def load_env_vars(env_file=".env"):
    """
    .env benzeri dosyadan anahtar=değer çiftlerini okuyup bir dict döndürür.
    Burada starter.env veya .env kullanabilirsin.
    """
    env_dict = {}
    if os.path.exists(env_file):
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, value = line.split("=", 1)
                env_dict[key.strip()] = value.strip()
    return env_dict

def save_env_vars(env_dict, env_file="starter.env"):
    """
    Verilen sözlüğü env formatında kaydeder.
    Dosya zaten varsa içeriğini siler, baştan yazar.
    """
    with open(env_file, "w", encoding="utf-8") as f:
        for k, v in env_dict.items():
            f.write(f"{k}={v}\n")

# Global env değişkenlerini yüklüyoruz (varsayılan .env'den istersen).
ENV_FILE_DEFAULT = ".env"
ENV_VARS = load_env_vars(ENV_FILE_DEFAULT)

# ==================== Servis Tanımları ====================
# command içinde {XYZ} placeholder kullanarak ENV_VARS'taki değeri yerleştiriyoruz.
services = [
    {
        "name": "Go Backend",
        "command": [
            "cmd", "/c",
            "cd /d C:\\Users\\J.A.R.V.I.S\\Desktop\\dvm\\back-end && go run main.go --port={GO_BACKEND_PORT}"
        ],
        "working_dir": None,
        "port_env_key": "GO_BACKEND_PORT",
        "log_text": "",
        "process": None,
    },
    {
        "name": "Go Consumer",
        "command": [
            "cmd", "/c",
            "cd /d C:\\Users\\J.A.R.V.I.S\\Desktop\\dvm\\back-end\\consumer && go run consumer.go --port={GO_CONSUMER_PORT}"
        ],
        "working_dir": None,
        "port_env_key": "GO_CONSUMER_PORT",
        "log_text": "",
        "process": None
    },
    {
        "name": "Front-End (npm)",
        # npm start -- --port=...  
        "command": [
            "cmd", "/c",
            "cd /d C:\\Users\\J.A.R.V.I.S\\Desktop\\dvm\\front-end && npm start -- --port={FRONTEND_PORT}"
        ],
        "working_dir": None,
        "port_env_key": "FRONTEND_PORT",
        "log_text": "",
        "process": None
    },
    {
        "name": "Django (Ana)",
        # Django runserver 0.0.0.0:{DJANGO_PORT}
        "command": [
            "cmd", "/c",
            "cd /d C:\\Users\\J.A.R.V.I.S\\Desktop\\dvm && python manage.py runserver 0.0.0.0:{DJANGO_PORT}"
        ],
        "working_dir": None,
        "port_env_key": "DJANGO_PORT",
        "log_text": "",
        "process": None
    },
    {
        "name": "MinIO",
        # minio.exe server C:\minio_data --console-address :{MINIO_PORT}
        "command": [
            "cmd", "/c",
            "cd /d C:\\Users\\J.A.R.V.I.S\\Desktop\\dvm && minio.exe server C:\\minio_data --console-address :{MINIO_PORT}"
        ],
        "working_dir": None,
        "port_env_key": "MINIO_PORT",
        "log_text": "",
        "process": None
    },
    {
        "name": "ChatApp (Django)",
        "command": [
            "cmd", "/c",
            "cd /d C:\\Users\\J.A.R.V.I.S\\Desktop\\dvm\\chatapp && python manage.py runserver 0.0.0.0:{CHATAPP_PORT}"
        ],
        "working_dir": None,
        "port_env_key": "CHATAPP_PORT",
        "log_text": "",
        "process": None
    },
    {
        "name": "RabbitMQ",
        # rabbitmq-server -p {RABBITMQ_PORT} (örnek)
        "command": [
            "cmd", "/c",
            "cd /d C:\\Program Files\\RabbitMQ Server\\rabbitmq_server-4.0.2\\sbin && rabbitmq-server -p {RABBITMQ_PORT}"
        ],
        "working_dir": None,
        "port_env_key": "RABBITMQ_PORT",
        "log_text": "",
        "process": None
    },
]

running = True  # Thread’lerin durumu için kullandığımız bayrak

# =============== Servisleri Başlatma/Log Fonksiyonları ===============

def prepare_command(service):
    """
    Servisin command listesindeki {PLACEHOLDER} öğelerini ENV_VARS içindeki
    değerlerle değiştirerek tek bir dize haline getirir (shell=True ile kullanmak üzere).
    """
    cmd_parts = []
    for part in service["command"]:
        for k, v in ENV_VARS.items():
            placeholder = "{"+k+"}"
            if placeholder in part:
                part = part.replace(placeholder, v)
        cmd_parts.append(part)

    # Örneğin ['cmd','/c','cd /d ... && go run main.go --port=4200']
    # shell=True kullandığımız için normalde tek bir string olarak 3. parametreyi kullanacağız.
    if len(cmd_parts) >= 3 and cmd_parts[0].lower() == "cmd" and cmd_parts[1].lower() == "/c":
        main_cmd = " ".join(cmd_parts[2:])
        return [cmd_parts[0], cmd_parts[1], main_cmd]
    else:
        # Normal durum
        return cmd_parts

def read_process_output(service):
    """Process'in stdout'unu okuyup arayüzde log_text'e ekler."""
    if not service["process"]:
        return

    for line in iter(service["process"].stdout.readline, b''):
        decoded_line = line.decode("utf-8", errors="replace")
        service["log_text"] += decoded_line
        update_log_display(service)

    if service["process"] and service["process"].stdout:
        service["process"].stdout.close()

def start_service(service):
    """Seçilen servisi başlatır (eğer zaten çalışmıyorsa)."""
    if service["process"] is not None:
        # Zaten çalışıyorsa tekrar başlatmayalım
        return

    try:
        final_cmd = prepare_command(service)
        service["log_text"] += f"\n[INFO] Starting service with command: {final_cmd}\n"

        service["process"] = subprocess.Popen(
            final_cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            stdin=subprocess.DEVNULL,
            shell=True,  # cmd /c ... diyeceğimiz için shell=True
            universal_newlines=False
        )

        t = threading.Thread(target=read_process_output, args=(service,), daemon=True)
        t.start()
        update_ui()

    except Exception as e:
        service["log_text"] += f"\n[ERROR] Servis başlatılamadı: {str(e)}\n"
        update_log_display(service)
        service["process"] = None

def stop_service(service):
    """Seçilen servisi durdurur (terminate)."""
    if service["process"] is not None:
        try:
            service["process"].terminate()
        except Exception:
            pass
        service["process"] = None
        update_ui()

# =============== UI Güncelleme Fonksiyonları ===============

def update_log_display(service):
    """Log ekranını günceller (sadece seçili olan servisin logunu gösterir)."""
    if service_listbox.curselection():
        selected_index = service_listbox.curselection()[0]
        if services[selected_index] == service:
            log_text_area.config(state="normal")
            log_text_area.delete("1.0", tk.END)
            log_text_area.insert(tk.END, service["log_text"])
            log_text_area.config(state="disabled")

def on_select_service(event):
    """Listbox'ta seçim değişince, ilgili servisin loglarını gösterir."""
    if service_listbox.curselection():
        selected_index = service_listbox.curselection()[0]
        svc = services[selected_index]
        log_text_area.config(state="normal")
        log_text_area.delete("1.0", tk.END)
        log_text_area.insert(tk.END, svc["log_text"])
        log_text_area.config(state="disabled")

def update_ui():
    """Servislerin durumuna göre Online/Offline etiketlerini günceller."""
    for i, svc in enumerate(services):
        status_label = status_labels[i]
        if svc["process"] is not None and svc["process"].poll() is None:
            status_label.config(text="● Online", fg="green")
        else:
            status_label.config(text="● Offline", fg="red")

def start_selected_service():
    """Listbox'ta seçili servisi başlatır."""
    if service_listbox.curselection():
        idx = service_listbox.curselection()[0]
        start_service(services[idx])

def stop_selected_service():
    """Listbox'ta seçili servisi durdurur."""
    if service_listbox.curselection():
        idx = service_listbox.curselection()[0]
        stop_service(services[idx])

# =============== Ports Tab (Port Ayarları) ===============

port_entries = {}

def create_ports_ui(frame):
    """
    'Ports' sekmesinde tüm servislerin port_env_key'lerine göre satırlar oluşturur.
    Kullanıcı bu alanlara port değeri girebilir.
    """
    row = 0
    for svc in services:
        key = svc.get("port_env_key")
        if not key:
            continue  # port_env_key yoksa atla

        label = tk.Label(frame, text=f"{svc['name']} ({key}):")
        label.grid(row=row, column=0, padx=5, pady=5, sticky="e")

        current_val = ENV_VARS.get(key, "")
        entry = tk.Entry(frame, width=10)
        entry.insert(0, current_val)
        entry.grid(row=row, column=1, padx=5, pady=5, sticky="w")

        port_entries[key] = entry
        row += 1

    # En altta buton
    save_export_button = tk.Button(frame, text="Save & Export Ports", command=save_and_export_ports)
    save_export_button.grid(row=row, column=0, columnspan=2, padx=5, pady=10)

def save_and_export_ports():
    """
    Hem portları kaydeder (ENV_VARS’a), hem de starter.env dosyasına yazar.
    """
    # 1) Save Ports
    for key, entry in port_entries.items():
        val = entry.get().strip()
        if val:
            ENV_VARS[key] = val
        else:
            ENV_VARS.pop(key, None)  # boş ise sil

    # 2) Export
    save_env_vars(ENV_VARS, env_file="starter.env")
    tk.messagebox.showinfo("Save & Export", "Port bilgileri kaydedildi ve starter.env'ye yazıldı.")

# =============== Port Checking (Kill) Tab ===============

def create_port_check_ui(frame):
    """
    Bu sekmede kullanıcı bir port girip 'Search' yapar,
    netstat -ano | findstr :{port} sonucu liste halinde gösterilir.
    Yanında Kill butonu vardır, tıklayınca o PID taskkill ile kapatılır.
    """
    # Üst kısım: Arama alanı
    search_frame = tk.Frame(frame)
    search_frame.pack(fill=tk.X, padx=5, pady=5)

    tk.Label(search_frame, text="Enter Port:").pack(side=tk.LEFT)
    port_search_entry = tk.Entry(search_frame, width=10)
    port_search_entry.pack(side=tk.LEFT, padx=5)

    def do_search():
        port = port_search_entry.get().strip()
        if not port:
            return
        # Netstat ile arama yap
        clear_port_results()
        search_port_usage(port)

    search_button = tk.Button(search_frame, text="Search", command=do_search)
    search_button.pack(side=tk.LEFT, padx=5)

    # Alt kısım: Sonuçların listeleneceği frame
    global port_result_frame
    port_result_frame = tk.Frame(frame)
    port_result_frame.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)

def clear_port_results():
    """port_result_frame içindeki her şeyi temizler."""
    for widget in port_result_frame.winfo_children():
        widget.destroy()

def search_port_usage(port):
    """
    netstat -ano | findstr :{port} çıktısını al, satır satır parse et.
    Örnek satır: TCP    0.0.0.0:8080         0.0.0.0:0      LISTENING       17004
    Biz oradan PID = 17004 bulacağız.
    """
    try:
        cmd = f'netstat -ano | findstr :{port}'
        proc = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, universal_newlines=True)
        out, err = proc.communicate(timeout=5)
        lines = out.strip().splitlines()
        if not lines and not err.strip():
            # Hiç sonuç yok
            lbl = tk.Label(port_result_frame, text="No processes found for this port.", fg="blue")
            lbl.pack(anchor="w")
            return

        for line in lines:
            line = line.strip()
            if not line:
                continue
            # Genelde "TCP    0.0.0.0:8080    0.0.0.0:0    LISTENING    17004"
            # Split edelim
            # Bazı satırlarda UDP olur, bazılarında LISTENING, ESTABLISHED vb.
            parts = re.split(r"\s+", line)
            # parts[0] = TCP/UDP
            # parts[1] = Local Address (0.0.0.0:8080)
            # parts[2] = Foreign Address
            # parts[3] = State (LISTENING/ESTABLISHED vs.)
            # parts[4] = PID
            pid = None
            protocol = None
            state = None
            local_addr = None

            if len(parts) >= 5:
                protocol = parts[0]
                local_addr = parts[1]
                state = parts[3]
                pid = parts[4]
            else:
                # Farklı format olabilir
                continue

            # Ekrana basalım
            row_frame = tk.Frame(port_result_frame)
            row_frame.pack(fill=tk.X, pady=2)

            info_label = tk.Label(row_frame, text=f"{protocol} {local_addr} {state} PID={pid}")
            info_label.pack(side=tk.LEFT)

            kill_btn = tk.Button(row_frame, text="Kill", fg="red", command=lambda p=pid: kill_pid(p))
            kill_btn.pack(side=tk.RIGHT, padx=5)

    except subprocess.TimeoutExpired:
        lbl = tk.Label(port_result_frame, text="Timeout while searching netstat.", fg="red")
        lbl.pack(anchor="w")
    except Exception as e:
        lbl = tk.Label(port_result_frame, text=f"Error: {e}", fg="red")
        lbl.pack(anchor="w")

def kill_pid(pid):
    """
    taskkill /PID {pid} /F
    """
    if not pid:
        return
    try:
        cmd = f'taskkill /PID {pid} /F'
        subprocess.run(cmd, shell=True)
        # İşlem sonrası belki mevcut frame'i tekrar yenilemek istersin.
        tk.messagebox.showinfo("Killed", f"PID {pid} has been killed.")
    except Exception as e:
        tk.messagebox.showerror("Error", f"Failed to kill PID {pid}: {e}")

# =============== Program Kapanışı ve Thread ===============

def periodic_check():
    """Her 2 saniyede bir process'lerin canlı olup olmadığını kontrol eder."""
    while running:
        for svc in services:
            if svc["process"] is not None:
                if svc["process"].poll() is not None:
                    svc["process"] = None
        update_ui()
        time.sleep(2)

def on_closing():
    """Pencere kapatılırken çalışan tüm process'leri terminate et."""
    global running
    running = False
    for svc in services:
        if svc["process"] is not None:
            try:
                svc["process"].terminate()
            except Exception:
                pass
    root.destroy()

# ==================== Tkinter Arayüz (Notebook'lu) ====================
root = tk.Tk()
root.title("DVM Starter (XAMPP Benzeri)")

notebook = ttk.Notebook(root)
notebook.pack(fill="both", expand=True)

# 1) Services (Servisler) Sekmesi
frame_services = ttk.Frame(notebook)
notebook.add(frame_services, text="Services")

# 2) Ports Sekmesi
frame_ports = ttk.Frame(notebook)
notebook.add(frame_ports, text="Ports")

# 3) Port Checking Sekmesi
frame_port_check = ttk.Frame(notebook)
notebook.add(frame_port_check, text="Port Checking")

# =========== Services Sekmesi İçeriği ===========
left_frame = tk.Frame(frame_services)
left_frame.pack(side=tk.LEFT, fill=tk.Y, padx=5, pady=5)

service_listbox = tk.Listbox(left_frame, height=15)
service_listbox.pack(side=tk.TOP, fill=tk.BOTH, expand=True)
service_listbox.bind("<<ListboxSelect>>", on_select_service)

status_labels = []
for svc in services:
    service_listbox.insert(tk.END, svc["name"])

button_frame = tk.Frame(left_frame)
button_frame.pack(side=tk.TOP, fill=tk.X)

start_button = tk.Button(button_frame, text="Start", command=start_selected_service)
start_button.pack(side=tk.LEFT, expand=True, fill=tk.X)

stop_button = tk.Button(button_frame, text="Stop", command=stop_selected_service)
stop_button.pack(side=tk.LEFT, expand=True, fill=tk.X)

status_frame = tk.Frame(left_frame)
status_frame.pack(side=tk.BOTTOM, fill=tk.X)
for _ in services:
    lbl = tk.Label(status_frame, text="● Offline", fg="red")
    lbl.pack()
    status_labels.append(lbl)

right_frame = tk.Frame(frame_services)
right_frame.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=5, pady=5)

log_label = tk.Label(right_frame, text="Log Ekranı:")
log_label.pack(anchor="nw")

log_text_area = scrolledtext.ScrolledText(right_frame, state="disabled", wrap=tk.WORD, width=80, height=20)
log_text_area.pack(fill=tk.BOTH, expand=True)

# =========== Ports Sekmesi İçeriği ===========
create_ports_ui(frame_ports)

# =========== Port Checking Sekmesi İçeriği ===========
create_port_check_ui(frame_port_check)

# =========== Arka Plan Threadleri ve Kapanış ===========
checker_thread = threading.Thread(target=periodic_check, daemon=True)
checker_thread.start()

root.protocol("WM_DELETE_WINDOW", on_closing)
root.mainloop()
