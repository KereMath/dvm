import json
from django.http import JsonResponse

def check_intent(model, user_input):
    """
    Kullanıcının mesajından niyeti (intent) belirler.
    """
    prompt_intent = f"""
    Aşağıdaki kullanıcı mesajı hangi niyette:
    - 'upload': dosya yüklemek, belge eklemek, csv veya excel eklemek vb.
    - 'documents': belgeleri listelemek, görmek, dosyaları listelemek
    - 'other': bunların dışında
    Kullanıcı mesajı: "{user_input}"
    Cevabın sadece 'upload', 'documents' veya 'other' olmalı.
    """

    # Sadece niyet için boş bir history ile istek yapıyoruz
    intent_session = model.start_chat(history=[])
    intent_resp = intent_session.send_message(prompt_intent)
    detected_intent = intent_resp.text.strip().lower()

    return detected_intent


def handle_chat_session(request, chat_id, user_input, model):
    """
    Kullanıcının chat geçmişini yönetir ve uygun yanıtı döndürür.
    """

    # HATA ÖNLEYİCİ: Session’da public_chats yoksa oluştur
    if "public_chats" not in request.session:
        request.session["public_chats"] = {}

    detected_intent = check_intent(model, user_input)

    if detected_intent == "upload":
        return "[CLICK: #uploadBtn]"
    
    if detected_intent == "documents":
        return "[CLICK: #docBtn]"

    # Eğer 'other' ise, normal GPT cevabı üret
    chat_history = request.session["public_chats"].get(chat_id, [])

    # Kullanıcı mesajını ekle
    chat_history.append({"role": "user", "parts": [user_input]})

    # Modele gönder
    chat_session = model.start_chat(history=chat_history)
    real_response = chat_session.send_message(user_input)
    gpt_reply = real_response.text

    # Cevabı ekle
    chat_history.append({"role": "model", "parts": [gpt_reply]})
    request.session["public_chats"][chat_id] = chat_history
    request.session.modified = True

    return gpt_reply
