from django.urls import path
from . import views

urlpatterns = [
    # Initiate online payment
    path('initiate/<int:order_id>/',
         views.PaymentInitiateView.as_view(),
         name='payment-initiate'),

    # Poll payment status
    path('status/<int:order_id>/',
         views.PaymentStatusView.as_view(),
         name='payment-status'),

    # Provider webhook callback
    path('webhook/<str:provider_slug>/',
         views.payment_webhook,
         name='payment-webhook'),

    # Mock simulator (dev only)
    path('mock/simulate/',
         views.MockPaymentSimulateView.as_view(),
         name='payment-mock-simulate'),
]
