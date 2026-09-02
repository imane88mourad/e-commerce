"""
Helper functions to create notifications and trigger emails
for order, invoice, and quote events.

Called from views — never fails the main transaction.
"""
import logging

logger = logging.getLogger(__name__)


def _get_admin_users():
    """Return queryset of admin/staff users who should receive admin notifications."""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    return User.objects.filter(is_staff=True)


def _create_notification(user, notification_type, title, message='',
                         link='', reference_id=None, reference_model=''):
    """Create a single notification record. Never raises."""
    try:
        from apps.notifications.models import Notification
        Notification.objects.create(
            user=user,
            notification_type=notification_type,
            title=title,
            message=message,
            link=link,
            reference_id=reference_id,
            reference_model=reference_model,
        )
    except Exception as e:
        logger.error(f"Failed to create notification: {e}")


def _notify_admins(notification_type, title, message='', link='',
                    reference_id=None, reference_model=''):
    """Send a notification to all admin/staff users."""
    for admin in _get_admin_users():
        _create_notification(
            user=admin,
            notification_type=notification_type,
            title=title,
            message=message,
            link=link,
            reference_id=reference_id,
            reference_model=reference_model,
        )


def notify_order_created(order):
    """Notify customer + admins when an order is placed."""
    # Customer notification
    _create_notification(
        user=order.user,
        notification_type='order_created',
        title=f'Commande #{order.id} créée',
        message=f'Votre commande de {order.amount} DA a été enregistrée.',
        link=f'/admin/orders/{order.id}',
        reference_id=order.id,
        reference_model='Order',
    )
    # Admin notifications
    _notify_admins(
        'order_created',
        f'Nouvelle commande #{order.id}',
        f'Nouvelle commande de {order.customer_name} — {order.amount} DA',
        link=f'/admin/orders/{order.id}',
        reference_id=order.id,
        reference_model='Order',
    )
    # Email
    try:
        from apps.notifications.email_service import send_order_confirmation
        send_order_confirmation(order)
    except Exception as e:
        logger.error(f"Failed to send order confirmation email: {e}")


def notify_order_status_changed(order, old_status):
    """Notify customer when order status changes."""
    from apps.notifications.email_service import send_order_status_update
    status_labels = {
        'confirmed': 'Confirmée',
        'processing': 'En préparation',
        'shipped': 'Expédiée',
        'delivered': 'Livrée',
        'cancelled': 'Annulée',
    }
    label = status_labels.get(order.status, order.status)
    _create_notification(
        user=order.user,
        notification_type=f'order_{order.status}',
        title=f'Commande #{order.id} — {label}',
        message=f'Le statut de votre commande est maintenant : {label}',
        link=f'/admin/orders/{order.id}',
        reference_id=order.id,
        reference_model='Order',
    )
    try:
        send_order_status_update(order, old_status)
    except Exception as e:
        logger.error(f"Failed to send status update email: {e}")


def notify_payment_received(order):
    """Notify customer + admins on successful payment."""
    _create_notification(
        user=order.user,
        notification_type='payment_received',
        title=f'Paiement reçu — Commande #{order.id}',
        message=f'Paiement de {order.amount} DA confirmé.',
        reference_id=order.id,
        reference_model='Order',
    )
    _notify_admins(
        'payment_received',
        f'Paiement reçu — Commande #{order.id}',
        f'{order.customer_name} — {order.amount} DA',
        reference_id=order.id,
        reference_model='Order',
    )
    try:
        from apps.notifications.email_service import send_payment_notification
        send_payment_notification(order, status='received')
    except Exception as e:
        logger.error(f"Failed to send payment email: {e}")


def notify_invoice(invoice, event='created'):
    """Notify on invoice creation or issuance."""
    try:
        from apps.notifications.email_service import send_invoice_notification
        send_invoice_notification(invoice, event=event)
    except Exception as e:
        logger.error(f"Failed to send invoice email: {e}")


def notify_quote(quote, event='sent'):
    """Notify on quote events."""
    try:
        from apps.notifications.email_service import send_quote_notification
        send_quote_notification(quote, event=event)
    except Exception as e:
        logger.error(f"Failed to send quote email: {e}")
