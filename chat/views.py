import json
import uuid
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render
import google.generativeai as genai
import uuid
from .SiteControl import handle_chat_session

# -- Google Generative AI (Gemini) ayarları --
GENAI_API_KEY = "AIzaSyD0a-Gqk1O964h4laq8xUiLpkvWcWtRPmg"
genai.configure(api_key=GENAI_API_KEY)
model_name = "gemini-1.5-flash"
generation_config = {
    "temperature": 0.5,
    "top_p": 1,
    "max_output_tokens": 1024,
}
model = genai.GenerativeModel(model_name=model_name, generation_config=generation_config)

########################
# Yardımcı Fonksiyonlar
########################


@csrf_exempt
def public_create_chat(request):
    """
    Angular için: POST isteği alır, yeni chat_id oluşturur,
    bu kullanıcıya özel session içinde saklar ve JSON olarak döndürür.
    """
    if request.method == "POST":
        # Session’da public_chats diye bir sözlük yoksa yaratıyoruz
        if "public_chats" not in request.session:
            request.session["public_chats"] = {}

        # Yeni chat_id oluştur
        new_chat_id = str(uuid.uuid4())[:8]
        # Bu chat_id için boş bir history oluştur
        request.session["public_chats"][new_chat_id] = []

        request.session.modified = True

        return JsonResponse({"chat_id": new_chat_id}, status=200)

    return JsonResponse({"error": "Invalid request method"}, status=400)

@csrf_exempt
def public_chat_response(request):
    if request.method == "POST":
        data = json.loads(request.body or "{}")
        chat_id = data.get("chat_id")
        user_input = data.get("message")

        if not chat_id:
            return JsonResponse({"error": "chat_id is required."}, status=400)
        if not user_input:
            return JsonResponse({"error": "message is empty."}, status=400)

        # SiteControl.py içindeki handle_chat_session fonksiyonunu çağır
        response_text = handle_chat_session(request, chat_id, user_input, model)

        return JsonResponse({"response": response_text}, status=200)

    return JsonResponse({"error": "Invalid request method"}, status=400) 
def get_chats_from_session(request):
    """
    Session'da "chats" adında bir sözlük tutuyoruz:
    {
        "chat_id1": {
            "name": "Chat #1",
            "history": [
                { "role": "user",  "parts": ["Merhaba"] },
                { "role": "model", "parts": ["Size nasıl yardımcı olabilirim?"] },
                ...
            ]
        },
        "chat_id2": {
            "name": "Chat #2",
            "history": [ ... ]
        },
        ...
    }

    Ayrıca session["current_chat_id"] anahtarında hangi sohbetin aktif olduğunu tutuyoruz.
    """
    if "chats" not in request.session:
        request.session["chats"] = {}
    if "current_chat_id" not in request.session:
        request.session["current_chat_id"] = None
    return request.session["chats"]

def save_session(request):
    request.session.modified = True

########################
# HTML SAYFASI GÖRÜNTÜLEME
########################

def chat_page(request):
    """
    Tek sayfa (SPA benzeri) olarak HTML döndürüyoruz.
    """
    return render(request, "chat.html")

########################
# CHAT LİSTELEME
########################

def list_chats(request):
    """
    Tüm chat'lerin listesini döndürüyoruz.
    Dönen JSON içinde: [ { "chat_id": "...", "name": "..." }, ... ]
    """
    chats = get_chats_from_session(request)
    chat_list = [
        {
            "chat_id": cid,
            "name": chat_data.get("name", "Unnamed Chat")
        }
        for cid, chat_data in chats.items()
    ]
    return JsonResponse({"chats": chat_list, "current_chat_id": request.session["current_chat_id"]})

########################
# YENİ CHAT OLUŞTURMA
########################
@csrf_exempt
def create_chat(request):
    """
    Yeni bir chat oluşturup session'a ekler.
    """
    chats = get_chats_from_session(request)

    # Rastgele ID
    new_chat_id = str(uuid.uuid4())[:8]  # Kısa bir UUID
    chats[new_chat_id] = {
        "name": f"New Chat {len(chats)+1}",
        "history": []
    }

    # O anda yeni oluşturulan sohbete geçelim
    request.session["current_chat_id"] = new_chat_id
    save_session(request)
    return JsonResponse({"message": "Yeni sohbet oluşturuldu.", "chat_id": new_chat_id})

########################
# CHAT SİLME
########################

def delete_chat(request, chat_id):
    """
    İlgili chat_id'yi session'dan siliyoruz.
    Eğer silinen chat 'current_chat_id' ise, current_chat_id'yi None'a çekiyoruz (veya ilk varsa ona geçebiliriz).
    """
    chats = get_chats_from_session(request)
    if chat_id in chats:
        del chats[chat_id]

        # Eğer silinen aktif chat ise current_chat_id güncelle
        if request.session["current_chat_id"] == chat_id:
            request.session["current_chat_id"] = None
            # İsterseniz otomatik olarak başka bir sohbete geçirebilirsiniz:
            # örn. listede ilk kalan sohbete geçmek gibi
            if len(chats) > 0:
                any_id = list(chats.keys())[0]
                request.session["current_chat_id"] = any_id

        save_session(request)
        return JsonResponse({"message": f"Chat {chat_id} silindi."})
    else:
        return JsonResponse({"error": "Belirtilen chat ID bulunamadı."}, status=404)

########################
# CHAT'LER ARASINDA GEÇİŞ
########################

def switch_chat(request, chat_id):
    """
    Mevcut aktif chat'i değiştirmemizi sağlar.
    """
    chats = get_chats_from_session(request)
    if chat_id in chats:
        request.session["current_chat_id"] = chat_id
        save_session(request)
        return JsonResponse({"message": f"Chat {chat_id} aktif hale getirildi."})
    else:
        return JsonResponse({"error": "Chat ID bulunamadı."}, status=404)

########################
# CHAT BOT CEVABI
########################

@csrf_exempt
def chat_response(request):
    """
    Mevcut (current) chat'e kullanıcıdan gelen mesajı ekler,
    Generative AI'ye gönderir, cevabı alır ve geri gönderir.
    """
    if request.method == "POST":
        data = json.loads(request.body)
        user_input = data.get("message", "")

        # Mevcut chat ID'sini al
        current_chat_id = request.session.get("current_chat_id", None)
        if not current_chat_id:
            return JsonResponse({"error": "Herhangi bir aktif sohbet yok. Yeni bir chat oluşturun veya geçiş yapın."}, status=400)

        # Session içindeki "chats" dict'ini al
        chats = get_chats_from_session(request)
        chat_data = chats.get(current_chat_id, None)
        if not chat_data:
            return JsonResponse({"error": "Geçerli chat bulunamadı."}, status=400)

        # 1) Kullanıcı mesajını ekle
        chat_data["history"].append({
            "role": "user",
            "parts": [user_input]
        })

        try:
            # 2) Model'e gönderilecek history'i hazırlayalım
            # Gemini arayüzü, her iletinin "role" ve "parts" şeklinde alınmasını bekliyor.
            chat_session = model.start_chat(history=chat_data["history"])
            response = chat_session.send_message(user_input)
            response_text = response.text

            # 3) Asistan cevabını ekle
            chat_data["history"].append({
                "role": "model",
                "parts": [response_text]
            })

            # Session'ı güncelle
            save_session(request)

            # 4) Cevabı döndür
            return JsonResponse({"response": response_text}, status=200)

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

    return JsonResponse({"error": "Invalid request method"}, status=400)

def get_chat_history(request, chat_id):
    chats = get_chats_from_session(request)
    chat_data = chats.get(chat_id)
    if not chat_data:
        return JsonResponse({"error": "Chat not found."}, status=404)

    # History yapısını frontend’in kolay okuyacağı biçime dönüştürelim
    messages = []
    for msg in chat_data["history"]:
        # Gemini "model" rolünü "assistant" olarak dönüştürüyoruz
        role = "assistant" if msg["role"] == "model" else "user"
        text = "".join(msg["parts"])  # parts içinde text parçaları varsa birleştir
        messages.append({"role": role, "text": text})

    return JsonResponse({"history": messages}, status=200)