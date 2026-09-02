from decimal import Decimal
from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from .models import Promotion
from .views import validate_and_apply_promo


class PromotionModelTest(TestCase):
    """Tests for the Promotion model."""

    def test_create_percentage_promo(self):
        promo = Promotion.objects.create(
            name='Test 10%',
            code='TEST10',
            discount_type='percentage',
            discount_value=Decimal('10'),
        )
        self.assertEqual(promo.discount_type, 'percentage')
        self.assertEqual(promo.discount_value, Decimal('10'))

    def test_create_fixed_promo(self):
        promo = Promotion.objects.create(
            name='Test 5000 DA',
            code='FIXED5000',
            discount_type='fixed',
            discount_value=Decimal('5000'),
        )
        self.assertEqual(promo.discount_type, 'fixed')
        self.assertEqual(promo.discount_value, Decimal('5000'))

    def test_is_valid_now_active(self):
        promo = Promotion.objects.create(
            name='Active', code='ACTIVE', is_active=True,
            discount_type='percentage', discount_value=Decimal('10'),
        )
        self.assertTrue(promo.is_valid_now)

    def test_is_valid_now_inactive(self):
        promo = Promotion.objects.create(
            name='Inactive', code='INACTIVE', is_active=False,
            discount_type='percentage', discount_value=Decimal('10'),
        )
        self.assertFalse(promo.is_valid_now)

    def test_is_valid_now_expired(self):
        promo = Promotion.objects.create(
            name='Expired', code='EXPIRED', is_active=True,
            discount_type='percentage', discount_value=Decimal('10'),
            end_date=timezone.now() - timedelta(days=1),
        )
        self.assertFalse(promo.is_valid_now)
        self.assertTrue(promo.is_expired)

    def test_is_valid_now_scheduled(self):
        promo = Promotion.objects.create(
            name='Future', code='FUTURE', is_active=True,
            discount_type='percentage', discount_value=Decimal('10'),
            start_date=timezone.now() + timedelta(days=30),
        )
        self.assertFalse(promo.is_valid_now)

    def test_is_valid_now_usage_limit_reached(self):
        promo = Promotion.objects.create(
            name='Limit', code='LIMIT', is_active=True,
            discount_type='percentage', discount_value=Decimal('10'),
            usage_limit=5, usage_count=5,
        )
        self.assertFalse(promo.is_valid_now)

    def test_compute_discount_percentage(self):
        promo = Promotion.objects.create(
            name='10%', code='P10', is_active=True,
            discount_type='percentage', discount_value=Decimal('10'),
        )
        discount = promo.compute_discount(Decimal('100000'))
        self.assertEqual(discount, Decimal('10000.00'))

    def test_compute_discount_fixed(self):
        promo = Promotion.objects.create(
            name='5000 DA', code='F5000', is_active=True,
            discount_type='fixed', discount_value=Decimal('5000'),
        )
        discount = promo.compute_discount(Decimal('100000'))
        self.assertEqual(discount, Decimal('5000'))

    def test_compute_discount_fixed_capped_at_subtotal(self):
        promo = Promotion.objects.create(
            name='Big fixed', code='BIG', is_active=True,
            discount_type='fixed', discount_value=Decimal('50000'),
        )
        discount = promo.compute_discount(Decimal('30000'))
        self.assertEqual(discount, Decimal('30000'))

    def test_compute_discount_minimum_not_met(self):
        promo = Promotion.objects.create(
            name='Min order', code='MIN', is_active=True,
            discount_type='percentage', discount_value=Decimal('10'),
            minimum_order_amount=Decimal('50000'),
        )
        discount = promo.compute_discount(Decimal('30000'))
        self.assertEqual(discount, Decimal('0'))

    def test_compute_discount_minimum_met(self):
        promo = Promotion.objects.create(
            name='Min order', code='MIN2', is_active=True,
            discount_type='percentage', discount_value=Decimal('10'),
            minimum_order_amount=Decimal('50000'),
        )
        discount = promo.compute_discount(Decimal('100000'))
        self.assertEqual(discount, Decimal('10000.00'))

    def test_compute_discount_invalid_returns_zero(self):
        promo = Promotion.objects.create(
            name='Inactive', code='INVAL', is_active=False,
            discount_type='percentage', discount_value=Decimal('10'),
        )
        discount = promo.compute_discount(Decimal('100000'))
        self.assertEqual(discount, Decimal('0'))

    def test_percentage_cap_at_100(self):
        promo = Promotion.objects.create(
            name='200%', code='OVER', is_active=True,
            discount_type='percentage', discount_value=Decimal('200'),
        )
        discount = promo.compute_discount(Decimal('100000'))
        # Should cap at 100% = full subtotal
        self.assertEqual(discount, Decimal('100000'))

    def test_increment_usage(self):
        promo = Promotion.objects.create(
            name='Count', code='COUNT', is_active=True,
            discount_type='percentage', discount_value=Decimal('10'),
            usage_limit=10, usage_count=0,
        )
        promo.increment_usage()
        promo.refresh_from_db()
        self.assertEqual(promo.usage_count, 1)

    def test_status_label(self):
        promo = Promotion.objects.create(
            name='Test', code='STAT', is_active=True,
            discount_type='percentage', discount_value=Decimal('10'),
        )
        self.assertEqual(promo.status_label, 'active')

        promo.is_active = False
        promo.save()
        self.assertEqual(promo.status_label, 'inactive')


class ValidateAndApplyPromoTest(TestCase):
    """Tests for the validate_and_apply_promo function."""

    def test_valid_code(self):
        promo = Promotion.objects.create(
            name='Test', code='VALID', is_active=True,
            discount_type='percentage', discount_value=Decimal('10'),
        )
        discount, promo_id, error = validate_and_apply_promo('VALID', Decimal('100000'))
        self.assertEqual(discount, Decimal('10000.00'))
        self.assertEqual(promo_id, promo.id)
        self.assertIsNone(error)
        promo.refresh_from_db()
        self.assertEqual(promo.usage_count, 1)

    def test_invalid_code(self):
        discount, promo_id, error = validate_and_apply_promo('NONEXISTENT', Decimal('100000'))
        self.assertEqual(discount, Decimal('0'))
        self.assertIsNone(promo_id)
        self.assertIsNotNone(error)

    def test_empty_code(self):
        discount, promo_id, error = validate_and_apply_promo('', Decimal('100000'))
        self.assertEqual(discount, Decimal('0'))
        self.assertIsNone(promo_id)
        self.assertIsNone(error)

    def test_inactive_code(self):
        Promotion.objects.create(
            name='Inactive', code='INACT', is_active=False,
            discount_type='percentage', discount_value=Decimal('10'),
        )
        discount, promo_id, error = validate_and_apply_promo('INACT', Decimal('100000'))
        self.assertEqual(discount, Decimal('0'))
        self.assertIsNotNone(error)

    def test_expired_code(self):
        Promotion.objects.create(
            name='Expired', code='EXP', is_active=True,
            discount_type='percentage', discount_value=Decimal('10'),
            end_date=timezone.now() - timedelta(days=1),
        )
        discount, promo_id, error = validate_and_apply_promo('EXP', Decimal('100000'))
        self.assertEqual(discount, Decimal('0'))
        self.assertIsNotNone(error)

    def test_minimum_not_met(self):
        Promotion.objects.create(
            name='Min', code='MINVAL', is_active=True,
            discount_type='percentage', discount_value=Decimal('10'),
            minimum_order_amount=Decimal('50000'),
        )
        discount, promo_id, error = validate_and_apply_promo('MINVAL', Decimal('30000'))
        self.assertEqual(discount, Decimal('0'))
        self.assertIsNotNone(error)

    def test_case_insensitive(self):
        Promotion.objects.create(
            name='Case', code='MIXED', is_active=True,
            discount_type='percentage', discount_value=Decimal('10'),
        )
        discount, promo_id, error = validate_and_apply_promo('mixed', Decimal('100000'))
        self.assertEqual(discount, Decimal('10000.00'))
        self.assertIsNone(error)

    def test_dzd_calculation(self):
        """Test that calculations work correctly with DZD amounts."""
        promo = Promotion.objects.create(
            name='DZD test', code='DZD', is_active=True,
            discount_type='fixed', discount_value=Decimal('5000'),
        )
        discount, _, _ = validate_and_apply_promo('DZD', Decimal('100000'))
        self.assertEqual(discount, Decimal('5000'))
        final = Decimal('100000') - discount
        self.assertEqual(final, Decimal('95000'))
