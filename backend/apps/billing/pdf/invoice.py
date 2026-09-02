"""
Invoice PDF generator.

Generates a professional A4 PDF for a given Invoice model instance.
"""
from .base import build_pdf, fmt_date


def generate_invoice_pdf(invoice):
    """
    Generate a PDF for an Invoice.

    Returns bytes (the PDF content).
    """
    # Build lines from invoice lines
    lines = []
    for line in invoice.lines.all().order_by('id'):
        product = line.product or {}
        lines.append({
            'name': product.get('name', 'Produit'),
            'quantity': line.quantity,
            'unit_price': line.unit_price,
            'vat_rate': line.vat_rate,
            'line_total': line.line_total,
        })

    # Gather extra info
    extra_fields = []
    if invoice.order:
        extra_fields.append(('Commande associée', f"#{invoice.order.id}"))
    if invoice.client_address:
        extra_fields.append(('Adresse de facturation', invoice.client_address))

    extra_fields.append(('Date d\'émission', fmt_date(invoice.issue_date)))

    return build_pdf(
        filename=f"facture-{invoice.number}.pdf",
        doc_title='FACTURE',
        doc_number=invoice.number,
        doc_date=invoice.created_at,
        doc_status=invoice.status,
        client_name=invoice.client_name,
        client_email=invoice.client_email,
        client_phone=invoice.client_phone,
        client_address=invoice.client_address,
        lines=lines,
        subtotal=invoice.subtotal,
        vat_total=invoice.vat_total,
        total=invoice.total,
        notes='',
        extra_fields=extra_fields,
    )
