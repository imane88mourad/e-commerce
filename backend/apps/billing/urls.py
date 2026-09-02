from django.urls import path
from .views import (
    QuoteListView, QuoteDetailView,
    InvoiceListView, InvoiceDetailView, InvoiceGenerateFromOrderView,
    InvoicePdfView, QuotePdfView,
    InvoiceEmailPdfView, QuoteEmailPdfView,
)

urlpatterns = [
    path('quotes/', QuoteListView.as_view(), name='quote-list'),
    path('quotes/<int:pk>/', QuoteDetailView.as_view(), name='quote-detail'),
    path('quotes/<int:pk>/pdf/', QuotePdfView.as_view(), name='quote-pdf'),
    path('quotes/<int:pk>/email-pdf/', QuoteEmailPdfView.as_view(), name='quote-email-pdf'),
    path('invoices/', InvoiceListView.as_view(), name='invoice-list'),
    path('invoices/<int:pk>/', InvoiceDetailView.as_view(), name='invoice-detail'),
    path('invoices/<int:pk>/pdf/', InvoicePdfView.as_view(), name='invoice-pdf'),
    path('invoices/<int:pk>/email-pdf/', InvoiceEmailPdfView.as_view(), name='invoice-email-pdf'),
    path('invoices/generate-from-order/<int:order_id>/', InvoiceGenerateFromOrderView.as_view(), name='invoice-generate-from-order'),
]
