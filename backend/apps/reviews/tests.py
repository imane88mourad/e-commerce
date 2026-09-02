"""
Tests for reviews and wishlist functionality.
"""
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework import status

from apps.products.models import Product, Category
from apps.orders.models import Order, OrderItem
from apps.reviews.models import Review, WishlistItem
from apps.reviews.views import (
    ProductReviewListView, ProductReviewStatsView, ProductReviewCreateView,
    AdminReviewListView, AdminReviewDetailView,
    WishlistAddView, WishlistRemoveView, WishlistCheckView, WishlistListView,
)

User = get_user_model()
factory = APIRequestFactory()


import uuid

_test_counter = 0

def _create_user(username=None, email=None, **kwargs):
    global _test_counter
    _test_counter += 1
    suffix = uuid.uuid4().hex[:8]
    username = username or f'user_{suffix}_{_test_counter}'
    email = email or f'{username}@testexample.com'
    return User.objects.create_user(username=username, email=email, password='testpass123', **kwargs)


def _create_product(name='PC Dell', price=250000):
    slug = f'{name.lower().replace(" ", "-")}-{uuid.uuid4().hex[:6]}'
    cat, _ = Category.objects.get_or_create(name='Informatique', defaults={'slug': 'informatique'})
    user = _create_user()
    return Product.objects.create(
        user=user, category=cat, name=name, slug=slug,
        sku=f'SKU-{uuid.uuid4().hex[:6]}', description='Test product',
        price=Decimal(str(price)), stock=10,
    )


def _create_completed_order(user, product, quantity=1):
    order = Order.objects.create(
        user=user, amount=product.price * quantity,
        payment_method='cod', status='delivered',
        guest_email=user.email,
    )
    OrderItem.objects.create(
        order=order,
        product={'id': product.id, 'name': product.name, 'price': str(product.price)},
        quantity=quantity,
        price=product.price,
    )
    return order


# ======================================================================
# Review Model Tests
# ======================================================================

class ReviewModelTest(TestCase):
    def setUp(self):
        self.user = _create_user()
        self.product = _create_product()

    def test_create_review(self):
        review = Review.objects.create(
            product=self.product, user=self.user, rating=5, title='Excellent', comment='Très bon produit.'
        )
        self.assertEqual(review.rating, 5)
        self.assertEqual(review.status, 'pending')

    def test_unique_constraint(self):
        Review.objects.create(product=self.product, user=self.user, rating=4, comment='Bon produit.')
        with self.assertRaises(Exception):
            Review.objects.create(product=self.product, user=self.user, rating=5, comment='Encore mieux.')

    def test_str(self):
        review = Review.objects.create(product=self.product, user=self.user, rating=3, comment='Correct.')
        self.assertIn('3/5', str(review))


# ======================================================================
# Review Purchase Validation Tests
# ======================================================================

class ReviewPurchaseValidationTest(TestCase):
    def setUp(self):
        self.user = _create_user()
        self.product = _create_product()

    def test_can_review_purchased_product(self):
        """User who purchased the product can create a review."""
        _create_completed_order(self.user, self.product)

        request = factory.post('/api/reviews/create/', {
            'product': self.product.id,
            'rating': 5,
            'title': 'Super',
            'comment': 'Produit excellent, je recommande vivement.',
        }, format='json')
        force_authenticate(request, user=self.user)
        response = ProductReviewCreateView.as_view()(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_cannot_review_unpurchased_product(self):
        """User who has NOT purchased cannot create a review."""
        request = factory.post('/api/reviews/create/', {
            'product': self.product.id,
            'rating': 5,
            'title': 'Super',
            'comment': 'Je n\'ai jamais acheté ce produit mais je laisse un avis.',
        }, format='json')
        force_authenticate(request, user=self.user)
        response = ProductReviewCreateView.as_view()(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_review_twice(self):
        """User can only review a product once."""
        _create_completed_order(self.user, self.product)
        Review.objects.create(product=self.product, user=self.user, rating=4, comment='Premier avis.')

        request = factory.post('/api/reviews/create/', {
            'product': self.product.id,
            'rating': 5,
            'title': 'Deuxième',
            'comment': 'Toujours aussi bon produit, je change mon avis.',
        }, format='json')
        force_authenticate(request, user=self.user)
        response = ProductReviewCreateView.as_view()(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unauthenticated_cannot_review(self):
        request = factory.post('/api/reviews/create/', {
            'product': self.product.id, 'rating': 5, 'comment': 'Test.',
        }, format='json')
        response = ProductReviewCreateView.as_view()(request)
        self.assertIn(response.status_code, [401, 403])


# ======================================================================
# Review Moderation Tests
# ======================================================================

class ReviewModerationTest(TestCase):
    def setUp(self):
        self.admin = _create_user(is_staff=True)
        self.user = _create_user()
        self.product = _create_product()
        _create_completed_order(self.user, self.product)
        self.review = Review.objects.create(
            product=self.product, user=self.user, rating=5,
            title='Super', comment='Excellent produit, je recommande.'
        )

    def test_admin_can_approve(self):
        request = factory.patch(f'/api/reviews/admin/{self.review.id}/', {'status': 'approved'}, format='json')
        force_authenticate(request, user=self.admin)
        response = AdminReviewDetailView.as_view()(request, pk=self.review.id)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.review.refresh_from_db()
        self.assertEqual(self.review.status, 'approved')

    def test_admin_can_reject(self):
        request = factory.patch(f'/api/reviews/admin/{self.review.id}/', {'status': 'rejected'}, format='json')
        force_authenticate(request, user=self.admin)
        response = AdminReviewDetailView.as_view()(request, pk=self.review.id)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.review.refresh_from_db()
        self.assertEqual(self.review.status, 'rejected')

    def test_admin_can_delete(self):
        request = factory.delete(f'/api/reviews/admin/{self.review.id}/')
        force_authenticate(request, user=self.admin)
        response = AdminReviewDetailView.as_view()(request, pk=self.review.id)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Review.objects.filter(id=self.review.id).exists())

    def test_non_admin_cannot_moderate(self):
        request = factory.patch(f'/api/reviews/admin/{self.review.id}/', {'status': 'approved'}, format='json')
        force_authenticate(request, user=self.user)
        response = AdminReviewDetailView.as_view()(request, pk=self.review.id)
        self.assertIn(response.status_code, [401, 403])


# ======================================================================
# Review Public Views Tests
# ======================================================================

class ReviewPublicViewTest(TestCase):
    def setUp(self):
        self.user = _create_user()
        self.product = _create_product()
        _create_completed_order(self.user, self.product)
        # Approved review
        Review.objects.create(
            product=self.product, user=self.user, rating=5,
            title='Super', comment='Excellent produit.',
            status='approved',
        )

    def test_list_approved_reviews(self):
        request = factory.get(f'/api/reviews/product/{self.product.id}/')
        response = ProductReviewListView.as_view()(request, product_id=self.product.id)
        self.assertEqual(response.status_code, 200)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)

    def test_stats(self):
        request = factory.get(f'/api/reviews/product/{self.product.id}/stats/')
        response = ProductReviewStatsView.as_view()(request, product_id=self.product.id)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['average_rating'], 5.0)
        self.assertEqual(response.data['total_reviews'], 1)

    def test_pending_review_not_listed(self):
        """Pending reviews should NOT appear in public listing."""
        user2 = _create_user('user2', 'user2@example.com')
        _create_completed_order(user2, self.product)
        Review.objects.create(product=self.product, user=user2, rating=3, comment='En attente de modération.')

        request = factory.get(f'/api/reviews/product/{self.product.id}/')
        response = ProductReviewListView.as_view()(request, product_id=self.product.id)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)  # Only the approved one


# ======================================================================
# Wishlist Tests
# ======================================================================

class WishlistTest(TestCase):
    def setUp(self):
        self.user = _create_user()
        self.product = _create_product()

    def test_add_to_wishlist(self):
        request = factory.post('/api/reviews/wishlist/add/', {'product_id': self.product.id}, format='json')
        force_authenticate(request, user=self.user)
        response = WishlistAddView.as_view()(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(WishlistItem.objects.filter(user=self.user, product=self.product).exists())

    def test_cannot_add_twice(self):
        WishlistItem.objects.create(user=self.user, product=self.product)
        request = factory.post('/api/reviews/wishlist/add/', {'product_id': self.product.id}, format='json')
        force_authenticate(request, user=self.user)
        response = WishlistAddView.as_view()(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_remove_from_wishlist(self):
        WishlistItem.objects.create(user=self.user, product=self.product)
        request = factory.delete(f'/api/reviews/wishlist/remove/{self.product.id}/')
        force_authenticate(request, user=self.user)
        response = WishlistRemoveView.as_view()(request, product_id=self.product.id)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(WishlistItem.objects.filter(user=self.user, product=self.product).exists())

    def test_check_wishlist(self):
        WishlistItem.objects.create(user=self.user, product=self.product)
        request = factory.get(f'/api/reviews/wishlist/check/{self.product.id}/')
        force_authenticate(request, user=self.user)
        response = WishlistCheckView.as_view()(request, product_id=self.product.id)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['in_wishlist'])

    def test_list_wishlist(self):
        WishlistItem.objects.create(user=self.user, product=self.product)
        request = factory.get('/api/reviews/wishlist/')
        force_authenticate(request, user=self.user)
        response = WishlistListView.as_view()(request)
        self.assertEqual(response.status_code, 200)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)

    def test_user_isolation(self):
        """User A cannot see User B's wishlist."""
        user2 = _create_user('user2', 'user2@example.com')
        WishlistItem.objects.create(user=user2, product=self.product)

        request = factory.get('/api/reviews/wishlist/')
        force_authenticate(request, user=self.user)
        response = WishlistListView.as_view()(request)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 0)  # user has no items

    def test_unauthenticated_cannot_use_wishlist(self):
        request = factory.get('/api/reviews/wishlist/')
        response = WishlistListView.as_view()(request)
        self.assertIn(response.status_code, [401, 403])
