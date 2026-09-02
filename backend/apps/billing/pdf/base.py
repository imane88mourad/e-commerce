"""
Shared PDF utilities for invoices and quotes.

Uses reportlab to generate professional A4 documents in DZD / DA.
"""
from decimal import Decimal
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable,
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ---------------------------------------------------------------------------
# Company information (can be overridden via settings later)
# ---------------------------------------------------------------------------
COMPANY = {
    'name': 'QuickCart',
    'tagline': 'Équipements Informatiques & Bureau',
    'address': 'Alger, Algérie',
    'phone': '+213 XXX XXX XXX',
    'email': 'contact@quickcart.dz',
    'website': 'www.quickcart.dz',
    'rc': 'RC: XXXXXX',          # Registre de commerce
    'nif': 'NIF: XXXXXXXXXX',    # Numéro d'identification fiscale
    'nis': 'NIS: XXXXXXXXXX',    # Numéro d'identification statistique
}

# ---------------------------------------------------------------------------
# Colors
# ---------------------------------------------------------------------------
PRIMARY = HexColor('#f97316')      # orange-500
PRIMARY_DARK = HexColor('#ea580c') # orange-600
HEADER_BG = HexColor('#1f2937')    # gray-800
LIGHT_GRAY = HexColor('#f3f4f6')   # gray-100
MID_GRAY = HexColor('#d1d5db')     # gray-300
TEXT_COLOR = HexColor('#111827')    # gray-900
TEXT_LIGHT = HexColor('#6b7280')    # gray-500

PAGE_W, PAGE_H = A4
MARGIN = 20 * mm


# ---------------------------------------------------------------------------
# Format helpers
# ---------------------------------------------------------------------------
def fmt_dzd(value):
    """Format a Decimal or numeric value as '125 000 DA'."""
    if value is None:
        value = Decimal('0')
    d = Decimal(str(value))
    # Round to integer for DA display
    rounded = d.quantize(Decimal('1'))
    # French-style thousands separator
    formatted = f"{rounded:,.0f}".replace(',', ' ')
    return f"{formatted} DA"


def fmt_date(dt):
    """Format a date/datetime as DD/MM/YYYY."""
    if dt is None:
        return ''
    if hasattr(dt, 'strftime'):
        return dt.strftime('%d/%m/%Y')
    return str(dt)


# ---------------------------------------------------------------------------
# Document builder
# ---------------------------------------------------------------------------
def build_pdf(filename, doc_title, doc_number, doc_date, doc_status,
              client_name, client_email='', client_phone='',
              client_address='',
              lines=None, subtotal=None, vat_total=None,
              total=None, notes='', extra_fields=None,
              company=None, valid_until=None):
    """
    Build a complete professional PDF document.

    Returns the PDF as bytes.
    """
    company = company or COMPANY
    lines = lines or []

    from io import BytesIO
    buffer = BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=MARGIN,
        bottomMargin=25 * mm,
    )

    styles = getSampleStyleSheet()
    elements = []

    # -- Custom styles --
    s_title = ParagraphStyle(
        'DocTitle', parent=styles['Title'],
        fontSize=22, textColor=white, fontName='Helvetica-Bold',
        spaceAfter=4, alignment=TA_LEFT,
    )
    s_company = ParagraphStyle(
        'Company', parent=styles['Normal'],
        fontSize=10, textColor=TEXT_COLOR, fontName='Helvetica-Bold',
        spaceAfter=2,
    )
    s_company_light = ParagraphStyle(
        'CompanyLight', parent=styles['Normal'],
        fontSize=8, textColor=TEXT_LIGHT, fontName='Helvetica',
        spaceAfter=1,
    )
    s_section = ParagraphStyle(
        'Section', parent=styles['Heading3'],
        fontSize=10, textColor=PRIMARY_DARK, fontName='Helvetica-Bold',
        spaceBefore=12, spaceAfter=6,
    )
    s_normal = ParagraphStyle(
        'NormalSmall', parent=styles['Normal'],
        fontSize=9, textColor=TEXT_COLOR, fontName='Helvetica',
        leading=13,
    )
    s_bold = ParagraphStyle(
        'NormalBold', parent=styles['Normal'],
        fontSize=9, textColor=TEXT_COLOR, fontName='Helvetica-Bold',
        leading=13,
    )
    s_right = ParagraphStyle(
        'RightSmall', parent=styles['Normal'],
        fontSize=9, textColor=TEXT_COLOR, fontName='Helvetica',
        alignment=TA_RIGHT, leading=13,
    )
    s_right_bold = ParagraphStyle(
        'RightBold', parent=styles['Normal'],
        fontSize=9, textColor=TEXT_COLOR, fontName='Helvetica-Bold',
        alignment=TA_RIGHT, leading=13,
    )
    s_footer = ParagraphStyle(
        'Footer', parent=styles['Normal'],
        fontSize=7, textColor=TEXT_LIGHT, fontName='Helvetica',
        alignment=TA_CENTER,
    )

    # ======================== HEADER ========================
    # Company info on the left + Document badge on the right
    company_data = [
        [
            [
                Paragraph(company['name'], s_company),
                Paragraph(company.get('tagline', ''), s_company_light),
                Paragraph(company['address'], s_company_light),
                Paragraph(f"{company['phone']}  |  {company['email']}", s_company_light),
            ],
            [
                Paragraph(doc_title, s_title),
                Paragraph(f"N° {doc_number}", ParagraphStyle(
                    'DocNum', parent=styles['Normal'],
                    fontSize=11, textColor=PRIMARY_DARK, fontName='Helvetica-Bold',
                    alignment=TA_RIGHT, spaceAfter=2,
                )),
                Paragraph(f"Date : {fmt_date(doc_date)}", ParagraphStyle(
                    'DocDate', parent=styles['Normal'],
                    fontSize=9, textColor=TEXT_LIGHT, fontName='Helvetica',
                    alignment=TA_RIGHT,
                )),
            ],
        ]
    ]

    company_table = Table(company_data, colWidths=[90 * mm, 80 * mm])
    company_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    elements.append(company_table)
    elements.append(Spacer(1, 4 * mm))

    # Divider
    elements.append(HRFlowable(width='100%', thickness=1, color=PRIMARY, spaceAfter=4 * mm))

    # ======================== STATUS ========================
    if doc_status:
        status_colors = {
            'draft': TEXT_LIGHT,
            'issued': HexColor('#16a34a'),
            'sent': HexColor('#2563eb'),
            'accepted': HexColor('#16a34a'),
            'declined': HexColor('#dc2626'),
            'expired': HexColor('#9ca3af'),
            'converted': HexColor('#7c3aed'),
            'void': HexColor('#dc2626'),
        }
        status_labels = {
            'draft': 'BROUILLON',
            'issued': 'ÉMISE',
            'sent': 'ENVOYÉ',
            'accepted': 'ACCEPTÉ',
            'declined': 'REFUSÉ',
            'expired': 'EXPIRÉ',
            'converted': 'CONVERTI',
            'void': 'ANNULÉ',
        }
        sc = status_colors.get(doc_status, TEXT_LIGHT)
        sl = status_labels.get(doc_status, doc_status.upper())
        status_style = ParagraphStyle(
            'Status', parent=styles['Normal'],
            fontSize=8, textColor=sc, fontName='Helvetica-Bold',
            alignment=TA_RIGHT,
        )
        elements.append(Paragraph(sl, status_style))
        elements.append(Spacer(1, 2 * mm))

    # ======================== CLIENT INFO ========================
    elements.append(Paragraph('CLIENT', s_section))

    client_rows = []
    if client_name:
        client_rows.append([Paragraph('Nom', s_normal), Paragraph(client_name, s_bold)])
    if client_email:
        client_rows.append([Paragraph('Email', s_normal), Paragraph(client_email, s_normal)])
    if client_phone:
        client_rows.append([Paragraph('Téléphone', s_normal), Paragraph(client_phone, s_normal)])
    if client_address:
        client_rows.append([Paragraph('Adresse', s_normal), Paragraph(client_address, s_normal)])

    if client_rows:
        client_table = Table(client_rows, colWidths=[30 * mm, 140 * mm])
        client_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 1),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
        ]))
        elements.append(client_table)

    if valid_until:
        elements.append(Spacer(1, 2 * mm))
        elements.append(Paragraph(f"Validité : {fmt_date(valid_until)}", s_bold))

    elements.append(Spacer(1, 5 * mm))

    # ======================== ITEMS TABLE ========================
    elements.append(Paragraph('DÉTAIL DES ARTICLES', s_section))

    # Header row
    header = [
        Paragraph('<b>Produit</b>', ParagraphStyle('TH', parent=s_normal, textColor=white, fontSize=8)),
        Paragraph('<b>Qté</b>', ParagraphStyle('TH', parent=s_normal, textColor=white, fontSize=8, alignment=TA_CENTER)),
        Paragraph('<b>Prix unitaire</b>', ParagraphStyle('TH', parent=s_normal, textColor=white, fontSize=8, alignment=TA_RIGHT)),
        Paragraph('<b>TVA</b>', ParagraphStyle('TH', parent=s_normal, textColor=white, fontSize=8, alignment=TA_CENTER)),
        Paragraph('<b>Total</b>', ParagraphStyle('TH', parent=s_normal, textColor=white, fontSize=8, alignment=TA_RIGHT)),
    ]

    data = [header]
    for line in lines:
        product_name = line.get('name', 'Produit')
        if isinstance(product_name, dict):
            product_name = product_name.get('name', 'Produit')
        qty = line.get('quantity', 0)
        unit_price = line.get('unit_price', 0)
        vat_rate = line.get('vat_rate', 0)
        line_total = line.get('line_total', 0)

        vat_str = f"{vat_rate}%" if Decimal(str(vat_rate or 0)) > 0 else "—"

        data.append([
            Paragraph(str(product_name), s_normal),
            Paragraph(str(qty), ParagraphStyle('Qty', parent=s_normal, alignment=TA_CENTER)),
            Paragraph(fmt_dzd(unit_price), s_right),
            Paragraph(vat_str, ParagraphStyle('VAT', parent=s_normal, alignment=TA_CENTER)),
            Paragraph(fmt_dzd(line_total), s_right_bold),
        ])

    col_widths = [65 * mm, 18 * mm, 32 * mm, 20 * mm, 35 * mm]
    items_table = Table(data, colWidths=col_widths, repeatRows=1)

    items_style = [
        # Header row
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_BG),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 6),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        # Data rows
        ('TOPPADDING', (0, 1), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        # Grid
        ('LINEBELOW', (0, 0), (-1, 0), 0.5, PRIMARY),
        ('LINEBELOW', (0, -1), (-1, -1), 0.5, MID_GRAY),
        ('LINEAFTER', (0, 0), (-2, -1), 0.3, MID_GRAY),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]

    # Zebra striping
    for i in range(1, len(data)):
        if i % 2 == 0:
            items_style.append(('BACKGROUND', (0, i), (-1, i), LIGHT_GRAY))

    items_table.setStyle(TableStyle(items_style))
    elements.append(items_table)

    elements.append(Spacer(1, 5 * mm))

    # ======================== TOTALS ========================
    totals_data = []

    totals_data.append([
        Paragraph('Sous-total HT', s_normal),
        Paragraph(fmt_dzd(subtotal or 0), s_right_bold),
    ])

    if vat_total and Decimal(str(vat_total)) > 0:
        totals_data.append([
            Paragraph('TVA', s_normal),
            Paragraph(fmt_dzd(vat_total), s_right),
        ])

    totals_data.append([
        Paragraph('', s_normal),  # spacer
        Paragraph('', s_normal),
    ])

    totals_data.append([
        Paragraph('TOTAL TTC', ParagraphStyle(
            'TotalLabel', parent=s_bold, fontSize=12, textColor=PRIMARY_DARK,
        )),
        Paragraph(fmt_dzd(total or 0), ParagraphStyle(
            'TotalValue', parent=s_right_bold, fontSize=13, textColor=PRIMARY_DARK,
        )),
    ])

    totals_table = Table(totals_data, colWidths=[120 * mm, 50 * mm])
    totals_style = [
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LINEABOVE', (0, -1), (-1, -1), 1, PRIMARY),
        ('LINEBELOW', (0, -1), (-1, -1), 2, PRIMARY),
    ]
    totals_table.setStyle(TableStyle(totals_style))
    elements.append(totals_table)

    # ======================== NOTES ========================
    if notes:
        elements.append(Spacer(1, 8 * mm))
        elements.append(Paragraph('NOTES', s_section))
        elements.append(Paragraph(notes, s_normal))

    # ======================== EXTRA FIELDS ========================
    if extra_fields:
        elements.append(Spacer(1, 5 * mm))
        for label, value in extra_fields:
            elements.append(Paragraph(f"<b>{label}</b> : {value}", s_normal))

    # ======================== PAYMENT INFO ========================
    elements.append(Spacer(1, 10 * mm))
    elements.append(HRFlowable(width='100%', thickness=0.5, color=MID_GRAY, spaceAfter=3 * mm))
    elements.append(Paragraph(
        "Conditions de paiement : Virement bancaire, Espèces à la livraison, Chèque",
        ParagraphStyle('PaymentInfo', parent=s_normal, fontSize=8, textColor=TEXT_LIGHT),
    ))

    # ======================== FOOTER ========================
    elements.append(Spacer(1, 8 * mm))
    elements.append(HRFlowable(width='100%', thickness=0.5, color=MID_GRAY, spaceAfter=3 * mm))
    footer_text = f"{company['name']} — {company['address']} — {company['phone']} — {company['email']}"
    footer_text2 = f"{company.get('rc', '')}  {company.get('nif', '')}  {company.get('nis', '')}"
    elements.append(Paragraph(footer_text, s_footer))
    elements.append(Paragraph(footer_text2, s_footer))
    elements.append(Paragraph(
        "Ce document est généré électroniquement. Il est valable sans signature ni cachet.",
        ParagraphStyle('FooterNote', parent=s_footer, spaceBefore=2),
    ))

    # ======================== BUILD ========================
    doc.build(elements)
    return buffer.getvalue()
