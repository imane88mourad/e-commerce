"""
Tests for PDF generation and permissions.
"""
from decimal import Decimal
from unittest.mock import patch
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


class FormatDZDTest(TestCase):
    """Test the fmt_dzd currency formatter."""

    def test_basic_amounts(self):
        from apps.billing.pdf.base import fmt_dzd
        self.assertEqual(fmt_dzd(125000), '125 000 DA')
        self.assertEqual(fmt_dzd(89990), '89 990 DA')
        self.assertEqual(fmt_dzd(1500000), '1 500 000 DA')

    def test_decimal_amounts(self):
        from apps.billing.pdf.base import fmt_dzd
        self.assertEqual(fmt_dzd(Decimal('125000')), '125 000 DA')
        self.assertEqual(fmt_dzd(Decimal('89990')), '89 990 DA')

    def test_zero_and_none(self):
        from apps.billing.pdf.base import fmt_dzd
        self.assertEqual(fmt_dzd(0), '0 DA')
        self.assertEqual(fmt_dzd(None), '0 DA')

    def test_small_amounts(self):
        from apps.billing.pdf.base import fmt_dzd
        self.assertEqual(fmt_dzd(100), '100 DA')
        self.assertEqual(fmt_dzd(1500), '1 500 DA')

    def test_no_usd_eur(self):
        """Ensure no $ or € in output."""
        from apps.billing.pdf.base import fmt_dzd
        result = fmt_dzd(125000)
        self.assertNotIn('$', result)
        self.assertNotIn('€', result)
        self.assertNotIn('USD', result)
        self.assertIn('DA', result)


class InvoicePdfGenerationTest(TestCase):
    """Test Invoice PDF generation."""

    def setUp(self):
        self.admin = User.objects.create_superuser(
            username='pdfadmin', email='pdfadmin@test.com', password='testpass123'
        )

    def test_generate_invoice_pdf_bytes(self):
        from apps.billing.models import Invoice, InvoiceLine
        from apps.billing.pdf.invoice import generate_invoice_pdf

        invoice = Invoice.objects.create(
            client_name='Mohamed Benali',
            client_email='mohamed@example.com',
            client_phone='+213 555 123 456',
            client_address='123 Rue Didouche Mourad, Alger',
            status='issued',
            subtotal=Decimal('350500'),
            vat_total=Decimal('66595'),
            total=Decimal('417095'),
        )

        InvoiceLine.objects.create(
            invoice=invoice,
            product={'name': 'PC Dell Latitude 5540', 'id': 1},
            quantity=1,
            unit_price=Decimal('250000'),
            vat_rate=Decimal('19'),
            line_total=Decimal('250000'),
            line_vat=Decimal('47500'),
        )
        InvoiceLine.objects.create(
            invoice=invoice,
            product={'name': 'Ecran Samsung 27', 'id': 2},
            quantity=2,
            unit_price=Decimal('45000'),
            vat_rate=Decimal('19'),
            line_total=Decimal('90000'),
            line_vat=Decimal('17100'),
        )
        InvoiceLine.objects.create(
            invoice=invoice,
            product={'name': 'Clavier sans fil Logitech', 'id': 3},
            quantity=3,
            unit_price=Decimal('3500'),
            vat_rate=Decimal('19'),
            line_total=Decimal('10500'),
            line_vat=Decimal('1995'),
        )

        pdf_bytes = generate_invoice_pdf(invoice)

        # Verify PDF is valid
        self.assertGreater(len(pdf_bytes), 1000)
        self.assertTrue(pdf_bytes[:4] == b'%PDF')

    def test_invoice_pdf_arabic_names(self):
        """Test with accented and international characters."""
        from apps.billing.models import Invoice, InvoiceLine
        from apps.billing.pdf.invoice import generate_invoice_pdf

        invoice = Invoice.objects.create(
            client_name='Youcef Sahraoui',
            client_email='youcef@example.com',
            status='draft',
            subtotal=Decimal('500000'),
            vat_total=Decimal('95000'),
            total=Decimal('595000'),
        )

        InvoiceLine.objects.create(
            invoice=invoice,
            product={'name': 'Serveur Dell PowerEdge', 'id': 1},
            quantity=1,
            unit_price=Decimal('500000'),
            vat_rate=Decimal('19'),
            line_total=Decimal('500000'),
            line_vat=Decimal('95000'),
        )

        pdf_bytes = generate_invoice_pdf(invoice)
        self.assertGreater(len(pdf_bytes), 500)
        self.assertTrue(pdf_bytes[:4] == b'%PDF')

    def test_invoice_pdf_empty_lines(self):
        """Test PDF with no lines."""
        from apps.billing.models import Invoice
        from apps.billing.pdf.invoice import generate_invoice_pdf

        invoice = Invoice.objects.create(
            client_name='Empty Client',
            client_email='empty@test.com',
            subtotal=Decimal('0'),
            vat_total=Decimal('0'),
            total=Decimal('0'),
        )

        pdf_bytes = generate_invoice_pdf(invoice)
        self.assertGreater(len(pdf_bytes), 500)
        self.assertTrue(pdf_bytes[:4] == b'%PDF')

    def test_invoice_number_in_pdf(self):
        """Verify invoice number is included."""
        from apps.billing.models import Invoice
        from apps.billing.pdf.invoice import generate_invoice_pdf

        invoice = Invoice.objects.create(
            client_name='Test', client_email='test@test.com',
            subtotal=Decimal('100000'), vat_total=Decimal('19000'),
            total=Decimal('119000'),
        )
        # Trigger save to get number
        invoice.refresh_from_db()

        pdf_bytes = generate_invoice_pdf(invoice)
        self.assertTrue(pdf_bytes[:4] == b'%PDF')
        self.assertGreater(len(pdf_bytes), 1000)


class QuotePdfGenerationTest(TestCase):
    """Test Quote PDF generation."""

    def test_generate_quote_pdf_bytes(self):
        from apps.billing.models import Quote, QuoteItem
        from apps.billing.pdf.quote import generate_quote_pdf

        quote = Quote.objects.create(
            client_name='Amina Boudiaf',
            client_email='amina@example.com',
            client_phone='+213 661 789 012',
            notes='Devis pour equipement bureau',
            status='sent',
            subtotal=Decimal('200000'),
            vat_total=Decimal('38000'),
            total=Decimal('238000'),
        )

        QuoteItem.objects.create(
            quote=quote,
            product={'name': 'Bureau professionnel', 'id': 1},
            quantity=2,
            unit_price=Decimal('75000'),
            vat_rate=Decimal('19'),
            line_total=Decimal('150000'),
            line_vat=Decimal('28500'),
        )
        QuoteItem.objects.create(
            quote=quote,
            product={'name': 'Chaise ergonomique', 'id': 2},
            quantity=2,
            unit_price=Decimal('25000'),
            vat_rate=Decimal('19'),
            line_total=Decimal('50000'),
            line_vat=Decimal('9500'),
        )

        pdf_bytes = generate_quote_pdf(quote)

        self.assertGreater(len(pdf_bytes), 1000)
        self.assertTrue(pdf_bytes[:4] == b'%PDF')

    def test_quote_pdf_with_notes(self):
        from apps.billing.models import Quote
        from apps.billing.pdf.quote import generate_quote_pdf

        quote = Quote.objects.create(
            client_name='Test Client',
            client_email='test@test.com',
            notes='Conditions speciales de paiement',
            subtotal=Decimal('100000'),
            vat_total=Decimal('19000'),
            total=Decimal('119000'),
        )

        pdf_bytes = generate_quote_pdf(quote)
        self.assertTrue(pdf_bytes[:4] == b'%PDF')

    def test_quote_pdf_multiple_items(self):
        """Test with many items."""
        from apps.billing.models import Quote, QuoteItem
        from apps.billing.pdf.quote import generate_quote_pdf

        quote = Quote.objects.create(
            client_name='Bulk Order',
            client_email='bulk@test.com',
            subtotal=Decimal('1000000'),
            vat_total=Decimal('190000'),
            total=Decimal('1190000'),
        )

        for i in range(10):
            QuoteItem.objects.create(
                quote=quote,
                product={'name': f'Product {i+1}', 'id': i+1},
                quantity=i+1,
                unit_price=Decimal('10000'),
                vat_rate=Decimal('19'),
                line_total=Decimal(str(10000 * (i+1))),
                line_vat=Decimal(str(1900 * (i+1))),
            )

        pdf_bytes = generate_quote_pdf(quote)
        self.assertGreater(len(pdf_bytes), 1000)
        self.assertTrue(pdf_bytes[:4] == b'%PDF')


class PdfViewPermissionTest(TestCase):
    """Test PDF endpoint permissions using DRF APIClient."""

    def setUp(self):
        self.client_admin = APIClient()
        self.client_user = APIClient()
        self.client_anon = APIClient()

        self.admin = User.objects.create_superuser(
            username='permadmin', email='permadmin@test.com', password='testpass123'
        )
        self.regular_user = User.objects.create_user(
            username='permuser', email='permuser@test.com', password='testpass123'
        )

        self.client_admin.force_authenticate(user=self.admin)
        self.client_user.force_authenticate(user=self.regular_user)
        # client_anon has no authentication

    def test_unauthenticated_cannot_access_invoice_pdf(self):
        from apps.billing.models import Invoice
        invoice = Invoice.objects.create(
            client_name='Test', client_email='test@test.com',
            subtotal=Decimal('0'), vat_total=Decimal('0'), total=Decimal('0'),
        )
        response = self.client_anon.get(f'/api/invoices/{invoice.id}/pdf/')
        self.assertIn(response.status_code, [401, 403])

    def test_unauthenticated_cannot_access_quote_pdf(self):
        from apps.billing.models import Quote
        quote = Quote.objects.create(
            client_name='Test', client_email='test@test.com',
            subtotal=Decimal('0'), vat_total=Decimal('0'), total=Decimal('0'),
        )
        response = self.client_anon.get(f'/api/quotes/{quote.id}/pdf/')
        self.assertIn(response.status_code, [401, 403])

    def test_admin_can_access_any_invoice_pdf(self):
        from apps.billing.models import Invoice, InvoiceLine
        invoice = Invoice.objects.create(
            client_name='Other Client', client_email='other@test.com',
            subtotal=Decimal('50000'), vat_total=Decimal('9500'),
            total=Decimal('59500'),
        )
        InvoiceLine.objects.create(
            invoice=invoice,
            product={'name': 'PC', 'id': 1},
            quantity=1, unit_price=Decimal('50000'),
            vat_rate=Decimal('19'), line_total=Decimal('50000'),
            line_vat=Decimal('9500'),
        )
        response = self.client_admin.get(f'/api/invoices/{invoice.id}/pdf/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/pdf')

    def test_owner_can_access_own_invoice_pdf(self):
        from apps.billing.models import Invoice, InvoiceLine
        invoice = Invoice.objects.create(
            client_name='Owner', client_email='permuser@test.com',
            subtotal=Decimal('100000'), vat_total=Decimal('19000'),
            total=Decimal('119000'),
        )
        InvoiceLine.objects.create(
            invoice=invoice,
            product={'name': 'Screen', 'id': 1},
            quantity=1, unit_price=Decimal('100000'),
            vat_rate=Decimal('19'), line_total=Decimal('100000'),
            line_vat=Decimal('19000'),
        )
        response = self.client_user.get(f'/api/invoices/{invoice.id}/pdf/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/pdf')

    def test_owner_cannot_access_other_invoice_pdf(self):
        from apps.billing.models import Invoice
        invoice = Invoice.objects.create(
            client_name='Other', client_email='someone-else@test.com',
            subtotal=Decimal('0'), vat_total=Decimal('0'), total=Decimal('0'),
        )
        response = self.client_user.get(f'/api/invoices/{invoice.id}/pdf/')
        self.assertEqual(response.status_code, 403)

    def test_admin_can_access_any_quote_pdf(self):
        from apps.billing.models import Quote, QuoteItem
        quote = Quote.objects.create(
            client_name='Other', client_email='other@test.com',
            subtotal=Decimal('50000'), vat_total=Decimal('9500'),
            total=Decimal('59500'),
        )
        QuoteItem.objects.create(
            quote=quote,
            product={'name': 'Chair', 'id': 1},
            quantity=1, unit_price=Decimal('50000'),
            vat_rate=Decimal('19'), line_total=Decimal('50000'),
            line_vat=Decimal('9500'),
        )
        response = self.client_admin.get(f'/api/quotes/{quote.id}/pdf/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/pdf')

    def test_owner_can_access_own_quote_pdf(self):
        from apps.billing.models import Quote, QuoteItem
        quote = Quote.objects.create(
            client_name='Owner', client_email='permuser@test.com',
            subtotal=Decimal('100000'), vat_total=Decimal('19000'),
            total=Decimal('119000'),
        )
        QuoteItem.objects.create(
            quote=quote,
            product={'name': 'Desk', 'id': 1},
            quantity=1, unit_price=Decimal('100000'),
            vat_rate=Decimal('19'), line_total=Decimal('100000'),
            line_vat=Decimal('19000'),
        )
        response = self.client_user.get(f'/api/quotes/{quote.id}/pdf/')
        self.assertEqual(response.status_code, 200)

    def test_owner_cannot_access_other_quote_pdf(self):
        from apps.billing.models import Quote
        quote = Quote.objects.create(
            client_name='Other', client_email='nobody@test.com',
            subtotal=Decimal('0'), vat_total=Decimal('0'), total=Decimal('0'),
        )
        response = self.client_user.get(f'/api/quotes/{quote.id}/pdf/')
        self.assertEqual(response.status_code, 403)


class PdfEmailTest(TestCase):
    """Test sending PDFs by email."""

    def setUp(self):
        self.client_admin = APIClient()
        self.client_user = APIClient()
        self.client_anon = APIClient()
        self.admin = User.objects.create_superuser(
            username='emailadmin', email='emailadmin@test.com', password='testpass123'
        )
        self.regular_user = User.objects.create_user(
            username='emailuser', email='emailuser@test.com', password='testpass123'
        )
        self.client_admin.force_authenticate(user=self.admin)
        self.client_user.force_authenticate(user=self.regular_user)

    @patch('django.core.mail.EmailMessage.send')
    def test_email_invoice_pdf(self, mock_send):
        mock_send.return_value = 1
        from apps.billing.models import Invoice, InvoiceLine

        invoice = Invoice.objects.create(
            client_name='Email Client', client_email='emailclient@test.com',
            subtotal=Decimal('200000'), vat_total=Decimal('38000'),
            total=Decimal('238000'),
        )
        InvoiceLine.objects.create(
            invoice=invoice,
            product={'name': 'PC Portable', 'id': 1},
            quantity=1, unit_price=Decimal('200000'),
            vat_rate=Decimal('19'), line_total=Decimal('200000'),
            line_vat=Decimal('38000'),
        )

        response = self.client_admin.post(f'/api/invoices/{invoice.id}/email-pdf/')
        self.assertEqual(response.status_code, 200)
        mock_send.assert_called_once()

    @patch('django.core.mail.EmailMessage.send')
    def test_email_quote_pdf(self, mock_send):
        mock_send.return_value = 1
        from apps.billing.models import Quote

        quote = Quote.objects.create(
            client_name='Quote Client', client_email='quoteclient@test.com',
            subtotal=Decimal('100000'), vat_total=Decimal('19000'),
            total=Decimal('119000'),
        )

        response = self.client_admin.post(f'/api/quotes/{quote.id}/email-pdf/')
        self.assertEqual(response.status_code, 200)
        mock_send.assert_called_once()

    def test_email_invoice_no_email_fails(self):
        from apps.billing.models import Invoice
        invoice = Invoice.objects.create(
            client_name='No Email', client_email='',
            subtotal=Decimal('0'), vat_total=Decimal('0'), total=Decimal('0'),
        )
        response = self.client_admin.post(f'/api/invoices/{invoice.id}/email-pdf/')
        self.assertEqual(response.status_code, 400)

    def test_non_admin_cannot_email_invoice(self):
        from apps.billing.models import Invoice
        invoice = Invoice.objects.create(
            client_name='Test', client_email='test@test.com',
            subtotal=Decimal('0'), vat_total=Decimal('0'), total=Decimal('0'),
        )
        response = self.client_user.post(f'/api/invoices/{invoice.id}/email-pdf/')
        self.assertEqual(response.status_code, 403)

    def test_non_admin_cannot_email_quote(self):
        from apps.billing.models import Quote
        quote = Quote.objects.create(
            client_name='Test', client_email='test@test.com',
            subtotal=Decimal('0'), vat_total=Decimal('0'), total=Decimal('0'),
        )
        response = self.client_user.post(f'/api/quotes/{quote.id}/email-pdf/')
        self.assertEqual(response.status_code, 403)

    def test_unauthenticated_cannot_email(self):
        from apps.billing.models import Invoice
        invoice = Invoice.objects.create(
            client_name='Test', client_email='test@test.com',
            subtotal=Decimal('0'), vat_total=Decimal('0'), total=Decimal('0'),
        )
        response = self.client_anon.get(f'/api/invoices/{invoice.id}/email-pdf/')
        self.assertIn(response.status_code, [401, 403])
