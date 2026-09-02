from django.urls import path
from .views import PromotionAdminListView, PromotionAdminDetailView, PromoValidateView

urlpatterns = [
    # Public: validate a promo code
    path('validate/', PromoValidateView.as_view(), name='promo-validate'),

    # Admin: CRUD (must be after validate/ to avoid conflicts)
    path('', PromotionAdminListView.as_view(), name='promo-admin-list'),
    path('<int:pk>/', PromotionAdminDetailView.as_view(), name='promo-admin-detail'),
]
