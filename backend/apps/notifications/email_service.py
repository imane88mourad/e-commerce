"""
Email service — sends professional HTML emails for order, payment, invoice, quote events.

Uses Celery for async sending when available, falls back to synchronous.
Console email backend in development (emails printed to stdout).
"""
import logging
from decimal import Decimal

logger = logging.getLogger(__name__)


def _fmt_dzd(value):
    """Format a Decimal/number as DZD: '125 000 DA'."""
    num = Decimal(str(value)) if value else Decimal('0')
    return f"{num:,.0f} DA".replace(",", " ")


def _build_order_items_html(order):
    """Build HTML table rows for order items."""
    rows = ""
    for item in order.items.all():
        product = item.product or {}
        name = product.get('name', 'Produit')
        price = _fmt_dzd(item.price)
        qty = item.quantity
        line_total = _fmt_dzd(item.price * qty)
        rows += f"""
        <tr>
          <td style="padding:12px;border-bottom:1px solid #eee;font-size:14px;">{name}</td>
          <td style="padding:12px;border-bottom:1px solid #eee;font-size:14px;text-align:center;">{qty}</td>
          <td style="padding:12px;border-bottom:1px solid #eee;font-size:14px;text-align:right;">{price}</td>
          <td style="padding:12px;border-bottom:1px solid #eee;font-size:14px;text-align:right;font-weight:600;">{line_total}</td>
        </tr>"""
    return rows


def _build_base_template(title, subtitle, content_html):
    """Reusable email wrapper."""
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7f9;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <!-- Header -->
        <tr><td style="background:#f97316;padding:24px 32px;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">QuickCart</h1>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">{subtitle}</p>
        </td></tr>
        <!-- Content -->
        <tr><td style="padding:32px;">
          {content_html}
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f8f9fb;padding:20px 32px;text-align:center;border-top:1px solid #eee;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">QuickCart E-commerce — {subtitle}</p>
          <p style="margin:4px 0 0;font-size:11px;color:#cbd5e1;">Cet email a été envoyé automatiquement. Merci de ne pas y répondre.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _build_order_summary_html(order):
    """Build the order summary section."""
    discount_html = ""
    if order.discount_amount and order.discount_amount > 0:
        discount_html = f"""
        <tr>
          <td style="padding:8px 0;font-size:14px;color:#64748b;">Remise ({order.promo_code})</td>
          <td style="padding:8px 0;font-size:14px;color:#16a34a;text-align:right;font-weight:500;">−{_fmt_dzd(order.discount_amount)}</td>
        </tr>"""

    return f"""
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
      <tr>
        <td style="padding:8px 0;font-size:14px;color:#64748b;">Sous-total</td>
        <td style="padding:8px 0;font-size:14px;text-align:right;">{_fmt_dzd(order.subtotal_before_discount or order.amount)}</td>
      </tr>
      {discount_html}
      <tr>
        <td style="padding:8px 0;font-size:14px;color:#64748b;">Livraison</td>
        <td style="padding:8px 0;font-size:14px;color:#16a34a;text-align:right;">Gratuite</td>
      </tr>
      <tr style="border-top:2px solid #e2e8f0;">
        <td style="padding:12px 0;font-size:16px;font-weight:700;">TOTAL</td>
        <td style="padding:12px 0;font-size:18px;font-weight:700;color:#f97316;text-align:right;">{_fmt_dzd(order.amount)}</td>
      </tr>
    </table>"""


def _get_status_label(status):
    labels = {
        'pending': 'En attente',
        'confirmed': 'Confirmée',
        'processing': 'En préparation',
        'shipped': 'Expédiée',
        'delivered': 'Livrée',
        'cancelled': 'Annulée',
        'returned': 'Retournée',
    }
    return labels.get(status, status)


# ---------------------------------------------------------------------------
# Email senders
# ---------------------------------------------------------------------------

def send_order_confirmation(order):
    """Send order confirmation email to customer (guest or registered)."""
    email = order.customer_email
    if not email:
        logger.warning(f"Order #{order.id}: no email address, skipping confirmation")
        return

    items_html = _build_order_items_html(order)
    summary_html = _build_order_summary_html(order)
    customer_name = order.customer_name

    content = f"""
    <p style="font-size:15px;color:#334155;margin:0 0 20px;">Bonjour <strong>{customer_name}</strong>,</p>
    <p style="font-size:15px;color:#334155;margin:0 0 20px;">Votre commande <strong>#{order.id}</strong> a été enregistrée avec succès.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
      <thead><tr style="background:#f8f9fb;">
        <th style="padding:12px;text-align:left;font-size:12px;color:#64748b;text-transform:uppercase;">Produit</th>
        <th style="padding:12px;text-align:center;font-size:12px;color:#64748b;text-transform:uppercase;">Qté</th>
        <th style="padding:12px;text-align:right;font-size:12px;color:#64748b;text-transform:uppercase;">Prix</th>
        <th style="padding:12px;text-align:right;font-size:12px;color:#64748b;text-transform:uppercase;">Total</th>
      </tr></thead>
      <tbody>{items_html}</tbody>
    </table>

    {summary_html}

    <div style="background:#f8f9fb;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0;font-size:13px;color:#64748b;"><strong>Adresse de livraison :</strong></p>
      <p style="margin:4px 0 0;font-size:14px;color:#334155;">
        {order.guest_address or ''}<br>
        {order.guest_city or ''}, {order.guest_state or ''}
        {order.guest_pincode or ''}
      </p>
    </div>

    <p style="font-size:14px;color:#64748b;margin:20px 0 0;">Vous recevrez un email lorsque le statut de votre commande changera.</p>"""

    html = _build_base_template(f"Commande #{order.id}", "Confirmation de commande", content)
    _send_email(
        to_email=email,
        subject=f"Commande #{order.id} confirmée — QuickCart",
        html_content=html,
    )


def send_order_status_update(order, old_status):
    """Send order status change email."""
    email = order.customer_email
    if not email:
        return

    status_label = _get_status_label(order.status)
    content = f"""
    <p style="font-size:15px;color:#334155;margin:0 0 20px;">Bonjour <strong>{order.customer_name}</strong>,</p>
    <p style="font-size:15px;color:#334155;margin:0 0 20px;">
      Le statut de votre commande <strong>#{order.id}</strong> a été mis à jour.
    </p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;text-align:center;">
      <p style="margin:0;font-size:14px;color:#64748b;">Nouveau statut</p>
      <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#16a34a;">{status_label}</p>
    </div>
    <p style="font-size:14px;color:#64748b;margin:20px 0 0;">Montant : <strong>{_fmt_dzd(order.amount)}</strong></p>"""

    html = _build_base_template(f"Commande #{order.id}", f"Statut : {status_label}", content)
    _send_email(
        to_email=email,
        subject=f"Commande #{order.id} — {status_label}",
        html_content=html,
    )


def send_payment_notification(order, status='received'):
    """Send payment status email."""
    email = order.customer_email
    if not email:
        return

    if status == 'received':
        title = "Paiement reçu"
        msg = f"Votre paiement de {_fmt_dzd(order.amount)} pour la commande #{order.id} a été confirmé."
        color = "#16a34a"
    else:
        title = "Paiement échoué"
        msg = f"Le paiement pour la commande #{order.id} a échoué. Veuillez réessayer."
        color = "#dc2626"

    content = f"""
    <p style="font-size:15px;color:#334155;margin:0 0 20px;">Bonjour <strong>{order.customer_name}</strong>,</p>
    <div style="background:{color}10;border:1px solid {color}30;border-radius:8px;padding:16px;margin:16px 0;text-align:center;">
      <p style="margin:0;font-size:20px;font-weight:700;color:{color};">{title}</p>
      <p style="margin:8px 0 0;font-size:14px;color:#64748b;">{_fmt_dzd(order.amount)}</p>
    </div>
    <p style="font-size:14px;color:#334155;">{msg}</p>"""

    html = _build_base_template(f"Commande #{order.id}", title, content)
    _send_email(
        to_email=email,
        subject=f"Commande #{order.id} — {title}",
        html_content=html,
    )


def send_invoice_notification(invoice, event='created'):
    """Send invoice email."""
    email = invoice.client_email
    if not email:
        return

    if event == 'created':
        title = "Facture créée"
    else:
        title = "Facture émise"

    content = f"""
    <p style="font-size:15px;color:#334155;margin:0 0 20px;">Bonjour <strong>{invoice.client_name}</strong>,</p>
    <p style="font-size:15px;color:#334155;margin:0 0 20px;">
      Une facture <strong>{invoice.number or f'#{invoice.id}'}</strong> a été {title.split()[1]}.
    </p>
    <div style="background:#f8f9fb;border-radius:8px;padding:16px;margin:16px 0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:4px 0;font-size:14px;color:#64748b;">Numéro</td>
          <td style="padding:4px 0;font-size:14px;text-align:right;font-weight:600;">{invoice.number or f'#{invoice.id}'}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:14px;color:#64748b;">Total</td>
          <td style="padding:4px 0;font-size:16px;font-weight:700;color:#f97316;text-align:right;">{_fmt_dzd(invoice.total)}</td>
        </tr>
      </table>
    </div>"""

    html = _build_base_template(f"Facture {invoice.number or f'#{invoice.id}'}", title, content)
    _send_email(
        to_email=email,
        subject=f"{title} — {invoice.number or f'#{invoice.id}'}",
        html_content=html,
    )


def send_quote_notification(quote, event='sent'):
    """Send quote email."""
    email = quote.client_email
    if not email:
        return

    event_labels = {
        'sent': ('Devis envoyé', 'Votre devis a été envoyé.'),
        'accepted': ('Devis accepté', 'Votre devis a été accepté.'),
        'declined': ('Devis refusé', 'Votre devis a été refusé.'),
        'expired': ('Devis expiré', 'Votre devis a expiré.'),
    }
    title, msg = event_labels.get(event, ('Devis', 'Mise à jour de votre devis.'))

    content = f"""
    <p style="font-size:15px;color:#334155;margin:0 0 20px;">Bonjour <strong>{quote.client_name}</strong>,</p>
    <p style="font-size:15px;color:#334155;margin:0 0 20px;">{msg}</p>
    <div style="background:#f8f9fb;border-radius:8px;padding:16px;margin:16px 0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:4px 0;font-size:14px;color:#64748b;">Devis</td>
          <td style="padding:4px 0;font-size:14px;text-align:right;font-weight:600;">#{quote.id}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:14px;color:#64748b;">Total</td>
          <td style="padding:4px 0;font-size:16px;font-weight:700;color:#f97316;text-align:right;">{_fmt_dzd(quote.total)}</td>
        </tr>
      </table>
    </div>"""

    html = _build_base_template(f"Devis #{quote.id}", title, content)
    _send_email(
        to_email=email,
        subject=f"{title} — Devis #{quote.id}",
        html_content=html,
    )


def _send_email(to_email, subject, html_content):
    """Send an email. Uses Celery if available, otherwise sends synchronously.

    In development with console backend, emails are printed to stdout.
    """
    from django.core.mail import EmailMultiAlternatives

    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body='',  # plain text fallback
            from_email=None,  # uses DEFAULT_FROM_EMAIL
            to=[to_email],
        )
        msg.attach_alternative(html_content, "text/html")

        # Try to send via Celery for async
        try:
            from config.celery import app as celery_app
            celery_app.send_task(
                'apps.notifications.tasks.send_email_task',
                kwargs={
                    'subject': subject,
                    'from_email': None,
                    'to_email': to_email,
                    'html_content': html_content,
                }
            )
            logger.info(f"Email queued for {to_email}: {subject}")
        except (ImportError, Exception):
            # Celery not running — send synchronously
            msg.send()
            logger.info(f"Email sent to {to_email}: {subject}")

    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        # Email failure must NOT cancel the order
