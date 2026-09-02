"""
Quote (Devis) PDF generator.

Generates a professional A4 PDF for a given Quote model instance.
"""
from datetime import timedelta
from django.utils import timezone
from .base import build_pdf, fmt_date


def generate_quote_pdf(quote):
    """
    Generate a PDF for a Quote (Devis).

    Returns bytes (the PDF content).
    """
    # Build lines from quote items
    lines = []
    for item in quote.items.all().order_by('id'):
        product = item.product or {}
        lines.append({
            'name': product.get('name', 'Produit'),
            'quantity': item.quantity,
            'unit_price': item.unit_price,
            'vat_rate': item.vat_rate,
            'line_total': item.line_total,
        })

    # Validity: 30 days from creation
    valid_until = quote.created_at + timedelta(days=30) if quote.created_at else None

    return build_pdf(
        filename=f"devis-{quote.id:06d}.pdf",
        doc_title='DEVIS',
        doc_number=f"DEV-{quote.id:06d}",
        doc_date=quote.created_at,
        doc_status=quote.status,
        client_name=quote.client_name,
        client_email=quote.client_email,
        client_phone=quote.client_phone,
        client_address='',
        lines=lines,
        subtotal=quote.subtotal,
        vat_total=quote.vat_total,
        total=quote.total,
        notes=quote.notes or '',
        valid_until=valid_until,
    )
