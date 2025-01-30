import os
from flask import Flask, jsonify, request, Response
from flask_cors import CORS  # <-- 1) import ekleyin

app = Flask(__name__)
CORS(app)  # <-- 2) Tüm rotalar için CORS'u etkinleştir

def load_env_vars(env_file="starter.env"):
    """
    .env veya starter.env dosyasını satır satır okuyup
    key=val sözlüğü olarak döndürür.
    Her istekte çağrıldığında dosyanın güncel hâlini yansıtır.
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

@app.route('/env', methods=['GET'])
def get_all_env():
    """
    Tüm env değişkenlerini JSON olarak döndürür.
    Her istek geldiğinde dosya baştan okunur.
    Örnek: {"GO_BACKEND_PORT": "8080", "DJANGO_PORT": "8000", ...}
    """
    env_data = load_env_vars("starter.env")
    return jsonify(env_data)

@app.route('/env/<var_name>', methods=['GET'])
def get_env_var(var_name):
    """
    İstenen anahtar (var_name) için env değerini döndürür (metin olarak).
    Her istek geldiğinde dosya baştan okunur.
    Örnek: /env/GO_BACKEND_PORT => "8080"
    """
    env_data = load_env_vars("starter.env")
    if var_name in env_data:
        return env_data[var_name], 200
    else:
        return f"{var_name} not found", 404

@app.route('/env/file', methods=['GET'])
def get_env_file():
    """
    .env (starter.env) dosyasının tüm içeriğini
    text/plain olarak döndürür.
    Böylece tarayıcıdan ham hâli görülebilir.
    """
    file_path = "starter.env"
    if not os.path.exists(file_path):
        return "starter.env does not exist.", 404

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    return Response(content, mimetype='text/plain')

if __name__ == '__main__':
    # İstediğiniz portu (ör. 9999) kullanabilirsiniz
    app.run(port=9999, debug=False)
