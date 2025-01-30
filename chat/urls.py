from django.urls import path
from .views import (
    chat_page,
    list_chats,
    create_chat,
    delete_chat,
    switch_chat,
    chat_response,
    get_chat_history,
    public_create_chat,
    public_chat_response,
)

urlpatterns = [
    path("", chat_page, name="chat_page"),

    # Chat yönetimi
    path("api/chats/", list_chats, name="list_chats"),
    path("api/chats/create/", create_chat, name="create_chat"),
    path("api/chats/delete/<str:chat_id>/", delete_chat, name="delete_chat"),
    path("api/chats/switch/<str:chat_id>/", switch_chat, name="switch_chat"),
    path("api/chats/<str:chat_id>/history/", get_chat_history, name="get_chat_history"),

    # Chat bot cevabı
    path("api/chat/", chat_response, name="chat_response"),
    path("api/public_chat/create/", public_create_chat, name="public_create_chat"),
    path("api/public_chat/ask/", public_chat_response, name="public_chat_response"),
]
