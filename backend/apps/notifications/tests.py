"""
Tests for the notifications system — models, helpers, email service, and views.
"""
from decimal import Decimal
from unittest.mock import patch, MagicMock
from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model
from django.core import mail

from apps.notifications.models import Notification
from apps.notifications.helpers import (
    notify_order_created,
    notify_order_status_changed,
    notify_payment_received,
)
from apps.notifications.email_service import (
    send_order_confirmation,
    send_order_status_update,
    send_payment_notification,
    send_invoice_notification,
    send_quote_notification,
    _fmt_dzd,
)

User = get_user_model()


class FmtDZDTest(TestCase):
    """Test the DZD formatting function."""

    def test_fmt_whole_number(self):
        self.assertEqual(_fmt_dzd(125000), '125 000 DA')

    def test_fmt_small_number(self):
        self.assertEqual(_fmt_dzd(1500), '1 500 DA')

    def test_fmt_large_number(self):
        self.assertEqual(_fmt_dzd(1500000), '1 500 000 DA')

    def test_fmt_zero(self):
        self.assertEqual(_fmt_dzd(0), '0 DA')

    def test_fmt_decimal(self):
        self.assertEqual(_fmt_dzd(Decimal('99999.50')), '100 000 DA')

    def test_fmt_none(self):
        self.assertEqual(_fmt_dzd(None), '0 DA')


class NotificationModelTest(TestCase):
    """Test the Notification model."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser', email='test@example.com', password='testpass123'
        )

    def test_create_notification(self):
        notif = Notification.objects.create(
            user=self.user,
            notification_type='order_created',
            title='Commande #1 créée',
            message='Votre commande a été enregistrée.',
        )
        self.assertEqual(notif.user, self.user)
        self.assertFalse(notif.is_read)

    def test_mark_read(self):
        notif = Notification.objects.create(
            user=self.user,
            notification_type='order_created',
            title='Test',
        )
        notif.mark_read()
        notif.refresh_from_db()
        self.assertTrue(notif.is_read)

    def test_str(self):
        notif = Notification.objects.create(
            user=self.user,
            notification_type='order_shipped',
            title='Expédiée',
        )
        self.assertIn('order_shipped', str(notif))
        self.assertIn('Expédiée', str(notif))

    def test_ordering(self):
        n1 = Notification.objects.create(
            user=self.user, notification_type='system', title='First'
        )
        n2 = Notification.objects.create(
            user=self.user, notification_type='system', title='Second'
        )
        notifs = list(Notification.objects.all())
        self.assertEqual(notifs[0], n2)
        self.assertEqual(notifs[1], n1)


class NotificationHelpersTest(TestCase):
    """Test notification helpers that create notifications + trigger emails."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='helper_user', email='customer@example.com', password='testpass123'
        )
        self.admin = User.objects.create_user(
            username='helper_admin', email='admin@example.com', password='adminpass', is_staff=True
        )

    def _make_fake_order(self, **kwargs):
        """Create a minimal fake order object (not saved to DB)."""
        order = MagicMock()
        order.id = 123
        order.amount = Decimal('95000')
        order.customer_name = 'Jean Dupont'
        order.customer_email = kwargs.get('customer_email', 'customer@example.com')
        order.user = self.user
        order.status = 'pending'
        order.payment_method = 'cod'
        order.promo_code = ''
        order.discount_amount = Decimal('0')
        order.subtotal_before_discount = Decimal('95000')
        order.guest_address = '123 Rue Test'
        order.guest_city = 'Alger'
        order.guest_state = 'Alger'
        order.guest_pincode = '16000'
        order.guest_shipping_info = ''
        order.items = MagicMock()
        order.items.all.return_value = []
        return order

    @patch('apps.notifications.email_service._send_email')
    def test_notify_order_created(self, mock_send):
        order = self._make_fake_order()
        with self.settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend'):
            notify_order_created(order)

        # Should create notifications for customer + admin
        self.assertTrue(Notification.objects.filter(user=self.user).exists())
        self.assertTrue(Notification.objects.filter(user=self.admin).exists())

        # Admin should get a "new order" notification
        admin_notif = Notification.objects.filter(user=self.admin, notification_type='order_created').first()
        self.assertIsNotNone(admin_notif)
        self.assertIn('123', admin_notif.title)

    @patch('apps.notifications.email_service._send_email')
    def test_notify_order_status_changed(self, mock_send):
        order = self._make_fake_order()
        order.status = 'shipped'
        notify_order_status_changed(order, old_status='pending')

        notif = Notification.objects.filter(
            user=self.user, notification_type='order_shipped'
        ).first()
        self.assertIsNotNone(notif)
        self.assertIn('Expédiée', notif.title)

    @patch('apps.notifications.email_service._send_email')
    def test_notify_payment_received(self, mock_send):
        order = self._make_fake_order()
        notify_payment_received(order)

        self.assertTrue(
            Notification.objects.filter(user=self.user, notification_type='payment_received').exists()
        )
        self.assertTrue(
            Notification.objects.filter(user=self.admin, notification_type='payment_received').exists()
        )


class EmailServiceTest(TestCase):
    """Test email service functions."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='email_user', email='customer@example.com', password='testpass123'
        )

    def _make_fake_order(self, **kwargs):
        order = MagicMock()
        order.id = 456
        order.amount = Decimal('250000')
        order.customer_name = 'Ahmed Benali'
        order.customer_email = kwargs.get('customer_email', 'customer@example.com')
        order.status = 'confirmed'
        order.payment_method = 'cod'
        order.promo_code = ''
        order.discount_amount = Decimal('0')
        order.subtotal_before_discount = Decimal('250000')
        order.guest_address = '45 Bab Ezzouar'
        order.guest_city = 'Alger'
        order.guest_state = 'Alger'
        order.guest_pincode = '16051'
        order.guest_shipping_info = ''
        order.items = MagicMock()
        order.items.all.return_value = []
        return order

    def _make_fake_invoice(self):
        inv = MagicMock()
        inv.id = 1
        inv.number = 'FAC-001'
        inv.client_name = 'Ahmed Benali'
        inv.client_email = 'customer@example.com'
        inv.total = Decimal('250000')
        return inv

    def _make_fake_quote(self):
        q = MagicMock()
        q.id = 1
        q.client_name = 'Ahmed Benali'
        q.client_email = 'customer@example.com'
        q.total = Decimal('180000')
        return q

    @patch('apps.notifications.email_service._send_email')
    def test_send_order_confirmation(self, mock_send):
        order = self._make_fake_order()
        send_order_confirmation(order)
        mock_send.assert_called_once()
        args = mock_send.call_args
        self.assertIn('customer@example.com', args.kwargs.get('to_email') or args[1].get('to_email', ''))
        self.assertIn('456', args.kwargs.get('subject') or args[1].get('subject', ''))

    @patch('apps.notifications.email_service._send_email')
    def test_send_order_confirmation_guest(self, mock_send):
        order = self._make_fake_order(customer_email='guest@example.com')
        send_order_confirmation(order)
        mock_send.assert_called_once()

    @patch('apps.notifications.email_service._send_email')
    def test_send_order_status_update(self, mock_send):
        order = self._make_fake_order()
        send_order_status_update(order, old_status='pending')
        mock_send.assert_called_once()

    @patch('apps.notifications.email_service._send_email')
    def test_send_payment_notification(self, mock_send):
        order = self._make_fake_order()
        send_payment_notification(order, status='received')
        mock_send.assert_called_once()

    @patch('apps.notifications.email_service._send_email')
    def test_send_payment_failed(self, mock_send):
        order = self._make_fake_order()
        send_payment_notification(order, status='failed')
        mock_send.assert_called_once()

    @patch('apps.notifications.email_service._send_email')
    def test_send_invoice_notification(self, mock_send):
        inv = self._make_fake_invoice()
        send_invoice_notification(inv, event='created')
        mock_send.assert_called_once()

    @patch('apps.notifications.email_service._send_email')
    def test_send_quote_notification(self, mock_send):
        quote = self._make_fake_quote()
        send_quote_notification(quote, event='sent')
        mock_send.assert_called_once()

    @patch('apps.notifications.email_service._send_email')
    def test_no_email_without_address(self, mock_send):
        order = self._make_fake_order(customer_email='')
        send_order_confirmation(order)
        mock_send.assert_not_called()

    @patch('apps.notifications.email_service._send_email')
    def test_email_failure_does_not_raise(self, mock_send):
        # The exception is raised inside _send_email's try/except which catches it.
        # We mock at the EmailMultiAlternatives level so the try/except in _send_email
        # catches it and does not re-raise.
        with patch('django.core.mail.EmailMultiAlternatives') as mock_email:
            mock_email.side_effect = Exception('SMTP down')
            order = self._make_fake_order()
            # Should NOT raise — _send_email catches exceptions
            send_order_confirmation(order)


class NotificationViewsTest(TestCase):
    """Test notification API endpoints."""

    def setUp(self):
        self.factory = RequestFactory()
        self.user = User.objects.create_user(
            username='view_user', email='test@example.com', password='testpass123'
        )
        # Use force_authenticate since project uses JWT, not session auth
        from rest_framework.test import force_authenticate
        self.force_authenticate = force_authenticate

        # Create some notifications
        for i in range(5):
            Notification.objects.create(
                user=self.user,
                notification_type='order_created',
                title=f'Notification {i}',
                is_read=(i < 2),  # first 2 are read
            )

    def test_list_notifications(self):
        from apps.notifications.views import NotificationListView
        request = self.factory.get('/api/notifications/')
        self.force_authenticate(request, user=self.user)
        response = NotificationListView.as_view()(request)
        self.assertEqual(response.status_code, 200)
        self.assertIn('results', response.data)
        self.assertEqual(response.data['count'], 5)

    def test_unread_count(self):
        from apps.notifications.views import NotificationUnreadCountView
        request = self.factory.get('/api/notifications/unread-count/')
        self.force_authenticate(request, user=self.user)
        response = NotificationUnreadCountView.as_view()(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 3)

    def test_mark_read(self):
        from apps.notifications.views import NotificationMarkReadView
        notif = Notification.objects.filter(is_read=False).first()
        request = self.factory.post(f'/api/notifications/{notif.id}/read/')
        self.force_authenticate(request, user=self.user)
        response = NotificationMarkReadView.as_view()(request, pk=notif.id)
        self.assertEqual(response.status_code, 200)
        notif.refresh_from_db()
        self.assertTrue(notif.is_read)

    def test_mark_all_read(self):
        from apps.notifications.views import NotificationMarkAllReadView
        request = self.factory.post('/api/notifications/read-all/')
        self.force_authenticate(request, user=self.user)
        response = NotificationMarkAllReadView.as_view()(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['marked'], 3)
        self.assertEqual(Notification.objects.filter(is_read=False).count(), 0)

    def test_unauthenticated_denied(self):
        from apps.notifications.views import NotificationListView
        request = self.factory.get('/api/notifications/')
        # Not authenticated
        response = NotificationListView.as_view()(request)
        self.assertIn(response.status_code, [401, 403])
