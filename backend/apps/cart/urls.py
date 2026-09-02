from django.urls import path
from .views import CartDetailView, CartItemCreateView, CartItemUpdateView, CartItemDeleteView

urlpatterns = [
    path('', CartDetailView.as_view(), name='cart-detail'),
    path('items/', CartItemCreateView.as_view(), name='cart-item-create'),
    path('items/<int:pk>/', CartItemUpdateView.as_view(), name='cart-item-update'),
    path('items/<int:pk>/delete/', CartItemDeleteView.as_view(), name='cart-item-delete'),
]
