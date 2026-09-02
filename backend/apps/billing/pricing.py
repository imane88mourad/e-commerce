"""Backend pricing core for quotes and invoices.

The backend is the single source of truth for all money calculations. These
helpers centralise the rounding and VAT logic so it can be unit-tested
independently of the model/serializer layer, and so quotes and invoices are
computed with the same convention as the cart/checkout frontend
(line VAT = lineTotal x (vat/100), total = subtotal + vatTotal).
"""
from decimal import Decimal, ROUND_HALF_UP

DEC = Decimal('0.01')


def round2(value):
    """Round a number to 2 decimal places, half-up."""
    return Decimal(value).quantize(DEC, rounding=ROUND_HALF_UP)


def line_amounts(unit_price, quantity, vat_rate):
    """Return { line_total, line_vat } for a single line.

    line_total = round(unit_price * quantity)
    line_vat   = round(line_total * (vat_rate / 100))
    """
    unit_price = Decimal(unit_price)
    quantity = Decimal(quantity)
    vat_rate = Decimal(vat_rate or 0)
    line_total = round2(unit_price * quantity)
    line_vat = round2(line_total * (vat_rate / Decimal(100)))
    return {'line_total': line_total, 'line_vat': line_vat}


def document_totals(lines):
    """Compute subtotal / vat_total / total plus per-line amounts.

    `lines` : iterable of (unit_price, quantity, vat_rate)
    Returns { subtotal, vat_total, total, lines: [ {...}, ... ] }
    """
    subtotal = Decimal('0')
    vat_total = Decimal('0')
    computed = []
    for unit_price, quantity, vat_rate in lines:
        a = line_amounts(unit_price, quantity, vat_rate)
        computed.append({'unit_price': round2(unit_price),
                         'quantity': int(quantity),
                         'vat_rate': Decimal(vat_rate or 0),
                         **a})
        subtotal += a['line_total']
        vat_total += a['line_vat']
    subtotal = round2(subtotal)
    vat_total = round2(vat_total)
    return {
        'subtotal': subtotal,
        'vat_total': vat_total,
        'total': round2(subtotal + vat_total),
        'lines': computed,
    }
