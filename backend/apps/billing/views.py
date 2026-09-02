from decimal import Decimal
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db import transaction
from django.shortcuts import get_object_or_404
from .models import Quote, QuoteItem, Invoice, InvoiceLine
from .serializers import (
    QuoteSerializer, QuoteCreateSerializer,
    InvoiceSerializer, InvoiceCreateSerializer,
)
from .pricing import line_amounts
from apps.products.models import Product
from apps.products.pagination import ProductPagination


class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


def _snapshot(product):
    first_image = ''
    images = product.images.all()
    if images.exists() and images[0].image:
        first_image = images[0].image.url
    return {
        'id': product.id,
        'name': product.name,
        'sku': getattr(product, 'sku', ''),
        'description': product.description,
        'image': first_image,
        'category': product.category.name if product.category else None,
    }


def _resolve_lines(items):
    """Resolve input lines to (product, quantity, unit_price) using server data.

    unit_price defaults to the product's offer price (server source of truth).
    vat_rate comes from the product. Raises ValidationError via DRF-style
    dictionary if a product is missing/inactive.
    """
    resolved = []
    for item in items:
        product_id = item['product_id']
        qty = item['quantity']
        try:
            product = Product.objects.select_related('category').get(id=product_id, is_active=True)
        except Product.DoesNotExist:
            raise ValueError(f"Produit {product_id} indisponible")
        unit_price = Decimal(item.get('unit_price')) if item.get('unit_price') is not None else (
            product.offer_price or product.price
        )
        resolved.append({'product': product, 'quantity': qty, 'unit_price': unit_price})
    return resolved


# ---------------------------------------------------------------------------
# Quotes
# ---------------------------------------------------------------------------

class QuoteListView(generics.ListCreateAPIView):
    """Admin: list all quotes + create a new quote (server-computed pricing)."""
    permission_classes = [IsAdminUser]
    pagination_class = ProductPagination

    def get_queryset(self):
        qs = Quote.objects.prefetch_related('items')
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return QuoteCreateSerializer
        return QuoteSerializer

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            resolved = _resolve_lines(data['items'])
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        quote = Quote.objects.create(
            client_name=data['client_name'],
            client_email=data.get('client_email', ''),
            client_phone=data.get('client_phone', ''),
            notes=data.get('notes', ''),
            status=data.get('status', 'draft'),
        )

        for r in resolved:
            product = r['product']
            vat_rate = product.vat or Decimal('0')
            a = line_amounts(r['unit_price'], r['quantity'], vat_rate)
            QuoteItem.objects.create(
                quote=quote,
                product=_snapshot(product),
                quantity=r['quantity'],
                unit_price=r['unit_price'],
                vat_rate=vat_rate,
                line_total=a['line_total'],
                line_vat=a['line_vat'],
            )

        quote.recalculate()
        return Response(QuoteSerializer(quote).data, status=status.HTTP_201_CREATED)


class QuoteDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Admin: view a quote, update its status, or delete it."""
    permission_classes = [IsAdminUser]
    serializer_class = QuoteSerializer
    queryset = Quote.objects.prefetch_related('items')

    def partial_update(self, request, *args, **kwargs):
        quote = self.get_object()
        valid = dict(Quote.STATUS_CHOICES)
        new_status = (request.data or {}).get('status')
        if not new_status or new_status not in valid:
            return Response({'error': f"Statut invalide. Allowed: {', '.join(valid)}"},
                            status=status.HTTP_400_BAD_REQUEST)
        quote.status = new_status
        quote.save(update_fields=['status', 'updated_at'])
        return Response(QuoteSerializer(quote).data)


# ---------------------------------------------------------------------------
# Invoices
# ---------------------------------------------------------------------------

class InvoiceListView(generics.ListCreateAPIView):
    """Admin: list all invoices + create a manual invoice (server-computed)."""
    permission_classes = [IsAdminUser]
    pagination_class = ProductPagination

    def get_queryset(self):
        qs = Invoice.objects.prefetch_related('lines')
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return InvoiceCreateSerializer
        return InvoiceSerializer

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            resolved = _resolve_lines(data['items'])
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        invoice = Invoice.objects.create(
            client_name=data['client_name'],
            client_email=data.get('client_email', ''),
            client_phone=data.get('client_phone', ''),
            client_address=data.get('client_address', ''),
            status=data.get('status', 'draft'),
        )
        invoice.number = invoice._next_number()

        for r in resolved:
            product = r['product']
            vat_rate = product.vat or Decimal('0')
            a = line_amounts(r['unit_price'], r['quantity'], vat_rate)
            InvoiceLine.objects.create(
                invoice=invoice,
                product=_snapshot(product),
                quantity=r['quantity'],
                unit_price=r['unit_price'],
                vat_rate=vat_rate,
                line_total=a['line_total'],
                line_vat=a['line_vat'],
            )

        invoice.recalculate()
        return Response(InvoiceSerializer(invoice).data, status=status.HTTP_201_CREATED)


class InvoiceDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Admin: view an invoice, update status, or delete it."""
    permission_classes = [IsAdminUser]
    serializer_class = InvoiceSerializer
    queryset = Invoice.objects.prefetch_related('lines')

    def partial_update(self, request, *args, **kwargs):
        invoice = self.get_object()
        valid = dict(Invoice.STATUS_CHOICES)
        new_status = (request.data or {}).get('status')
        if not new_status or new_status not in valid:
            return Response({'error': f"Statut invalide. Allowed: {', '.join(valid)}"},
                            status=status.HTTP_400_BAD_REQUEST)
        invoice.status = new_status
        invoice.save(update_fields=['status', 'updated_at'])
        return Response(InvoiceSerializer(invoice).data)


class InvoiceGenerateFromOrderView(APIView):
    """Admin: generate an invoice from an existing order.

    Reuses the order's frozen item snapshot (unit price) and the product's
    current VAT rate. All totals are recomputed server-side.
    """
    permission_classes = [IsAdminUser]

    @transaction.atomic
    def post(self, request, order_id):
        from apps.orders.models import Order
        order = get_object_or_404(Order.objects.prefetch_related('items'), pk=order_id)

        client_address = order.guest_address or ''
        invoice = Invoice.objects.create(
            order=order,
            client_name=order.customer_name,
            client_email=order.customer_email or '',
            client_phone=order.guest_phone or '',
            client_address=client_address,
            status='draft',
        )
        invoice.number = invoice._next_number()

        for oi in order.items.all():
            snap = oi.product or {}
            product_id = snap.get('id')
            product = None
            if product_id:
                product = Product.objects.filter(id=product_id).first()
            vat_rate = (product.vat if product else Decimal('0')) or Decimal('0')
            unit_price = snap.get('offerPrice') or snap.get('price') or Decimal('0')
            a = line_amounts(unit_price, oi.quantity, vat_rate)
            InvoiceLine.objects.create(
                invoice=invoice,
                product=snap,
                quantity=oi.quantity,
                unit_price=unit_price,
                vat_rate=vat_rate,
                line_total=a['line_total'],
                line_vat=a['line_vat'],
            )

        invoice.recalculate()
        return Response(InvoiceSerializer(invoice).data, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# PDF Download
# ---------------------------------------------------------------------------

class IsAuthenticated(permissions.BasePermission):
    """Authenticated user (any role)."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)


class InvoicePdfView(APIView):
    """GET /api/invoices/<id>/pdf/
    Download the PDF for an invoice.
    Admin: all invoices. Client: only own invoices (by email match).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        invoice = get_object_or_404(Invoice.objects.prefetch_related('lines'), pk=pk)

        if not request.user.is_staff:
            if invoice.client_email != getattr(request.user, 'email', ''):
                return Response({'error': 'Accès refusé'}, status=status.HTTP_403_FORBIDDEN)

        from .pdf.invoice import generate_invoice_pdf
        pdf_bytes = generate_invoice_pdf(invoice)

        from django.http import HttpResponse
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        filename = f"facture-{invoice.number}.pdf"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


class QuotePdfView(APIView):
    """GET /api/quotes/<id>/pdf/
    Download the PDF for a quote.
    Admin: all quotes. Client: only own quotes (by email match).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        quote = get_object_or_404(Quote.objects.prefetch_related('items'), pk=pk)

        if not request.user.is_staff:
            if quote.client_email != getattr(request.user, 'email', ''):
                return Response({'error': 'Accès refusé'}, status=status.HTTP_403_FORBIDDEN)

        from .pdf.quote import generate_quote_pdf
        pdf_bytes = generate_quote_pdf(quote)

        from django.http import HttpResponse
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        filename = f"devis-{quote.id:06d}.pdf"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


class InvoiceEmailPdfView(APIView):
    """POST /api/invoices/<id>/email-pdf/
    Send the invoice PDF by email. Admin only.
    """
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        invoice = get_object_or_404(Invoice.objects.prefetch_related('lines'), pk=pk)

        if not invoice.client_email:
            return Response({'error': "Pas d'adresse email pour ce client"},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            from .pdf.invoice import generate_invoice_pdf
            pdf_bytes = generate_invoice_pdf(invoice)

            from django.core.mail import EmailMessage
            email = EmailMessage(
                subject=f"Facture {invoice.number} — QuickCart",
                body=(
                    f"Bonjour {invoice.client_name},\n\n"
                    f"Veuillez trouver ci-joint votre facture n° {invoice.number}.\n\n"
                    f"Montant total : {invoice.total} DA\n\n"
                    f"Cordialement,\n"
                    f"L'équipe QuickCart"
                ),
                from_email=None,
                to=[invoice.client_email],
            )
            email.attach(
                f"facture-{invoice.number}.pdf",
                pdf_bytes,
                'application/pdf',
            )
            email.send(fail_silently=False)
            return Response({'success': True, 'message': f'Email envoyé à {invoice.client_email}'})
        except Exception as exc:
            import logging
            logging.getLogger('billing').error('Failed to email invoice %s: %s', pk, exc)
            return Response({'error': f"Erreur lors de l'envoi : {str(exc)}"},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class QuoteEmailPdfView(APIView):
    """POST /api/quotes/<id>/email-pdf/
    Send the quote PDF by email. Admin only.
    """
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        quote = get_object_or_404(Quote.objects.prefetch_related('items'), pk=pk)

        if not quote.client_email:
            return Response({'error': "Pas d'adresse email pour ce client"},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            from .pdf.quote import generate_quote_pdf
            pdf_bytes = generate_quote_pdf(quote)

            from django.core.mail import EmailMessage
            email = EmailMessage(
                subject=f"Devis DEV-{quote.id:06d} — QuickCart",
                body=(
                    f"Bonjour {quote.client_name},\n\n"
                    f"Veuillez trouver ci-joint votre devis.\n\n"
                    f"Montant total : {quote.total} DA\n\n"
                    f"Ce devis est valable 30 jours.\n\n"
                    f"Cordialement,\n"
                    f"L'équipe QuickCart"
                ),
                from_email=None,
                to=[quote.client_email],
            )
            email.attach(
                f"devis-{quote.id:06d}.pdf",
                pdf_bytes,
                'application/pdf',
            )
            email.send(fail_silently=False)
            return Response({'success': True, 'message': f'Email envoyé à {quote.client_email}'})
        except Exception as exc:
            import logging
            logging.getLogger('billing').error('Failed to email quote %s: %s', pk, exc)
            return Response({'error': f"Erreur lors de l'envoi : {str(exc)}"},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)
