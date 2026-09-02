from rest_framework import generics, permissions, status, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Avg, Count, Q
from .models import Review, WishlistItem
from .serializers import (
    ReviewSerializer, ReviewCreateSerializer, ReviewModerationSerializer,
    ReviewStatsSerializer, WishlistItemSerializer,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


# ---------------------------------------------------------------------------
# Reviews — Public
# ---------------------------------------------------------------------------

class ProductReviewListView(generics.ListAPIView):
    """GET /api/reviews/product/<product_id>/
    List approved reviews for a product.
    """
    serializer_class = ReviewSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        product_id = self.kwargs.get('product_id')
        return Review.objects.filter(
            product_id=product_id, status='approved'
        ).select_related('user')


class ProductReviewStatsView(APIView):
    """GET /api/reviews/product/<product_id>/stats/
    Returns average rating, total count, and distribution.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, product_id):
        reviews = Review.objects.filter(product_id=product_id, status='approved')
        stats = reviews.aggregate(
            avg_rating=Avg('rating'),
            total=Count('id'),
        )

        avg = round(stats['avg_rating'] or 0, 1)
        total = stats['total'] or 0

        # Distribution: count per star
        distribution = {}
        for star in range(5, 0, -1):
            count = reviews.filter(rating=star).count()
            distribution[str(star)] = count

        return Response({
            'average_rating': avg,
            'total_reviews': total,
            'distribution': distribution,
        })


class ProductReviewCreateView(generics.CreateAPIView):
    """POST /api/reviews/create/
    Create a review. Must be authenticated + have purchased the product.
    One review per user per product.
    """
    serializer_class = ReviewCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        user = self.request.user
        product = serializer.validated_data['product']

        # Check if user already reviewed this product
        if Review.objects.filter(user=user, product=product).exists():
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Vous avez déjà laissé un avis pour ce produit.")

        # Check if user purchased this product
        if not user.has_purchased_product(product.id):
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Vous ne pouvez laisser un avis que pour un produit que vous avez acheté.")

        serializer.save(user=user)


# ---------------------------------------------------------------------------
# Reviews — Admin moderation
# ---------------------------------------------------------------------------

class AdminReviewListView(generics.ListAPIView):
    """GET /api/reviews/admin/
    Admin: list all reviews with filters.
    """
    serializer_class = ReviewSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'comment', 'user__email', 'product__name']
    ordering_fields = ['created_at', 'rating', 'status']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = Review.objects.all().select_related('user', 'product')
        review_status = self.request.query_params.get('status')
        rating = self.request.query_params.get('rating')
        if review_status:
            qs = qs.filter(status=review_status)
        if rating:
            qs = qs.filter(rating=int(rating))
        return qs


class AdminReviewDetailView(APIView):
    """PATCH /api/reviews/admin/<id>/ — moderate (approve/reject)
    DELETE /api/reviews/admin/<id>/ — delete
    """
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        try:
            review = Review.objects.get(pk=pk)
        except Review.DoesNotExist:
            return Response({'error': 'Avis non trouvé'}, status=status.HTTP_404_NOT_FOUND)

        serializer = ReviewModerationSerializer(review, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ReviewSerializer(review).data)

    def delete(self, request, pk):
        try:
            review = Review.objects.get(pk=pk)
        except Review.DoesNotExist:
            return Response({'error': 'Avis non trouvé'}, status=status.HTTP_404_NOT_FOUND)
        review.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Wishlist — Authenticated
# ---------------------------------------------------------------------------

class WishlistListView(generics.ListAPIView):
    """GET /api/wishlist/
    List wishlist items for the current user.
    """
    serializer_class = WishlistItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return WishlistItem.objects.filter(user=self.request.user).select_related('product')


class WishlistAddView(APIView):
    """POST /api/wishlist/add/
    Add a product to wishlist.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        product_id = request.data.get('product_id')
        if not product_id:
            return Response({'error': 'product_id requis'}, status=status.HTTP_400_BAD_REQUEST)

        from apps.products.models import Product
        try:
            product = Product.objects.get(id=product_id, is_active=True)
        except Product.DoesNotExist:
            return Response({'error': 'Produit non trouvé'}, status=status.HTTP_404_NOT_FOUND)

        item, created = WishlistItem.objects.get_or_create(
            user=request.user, product=product
        )
        if not created:
            return Response({'error': 'Déjà dans votre liste de favoris'}, status=status.HTTP_400_BAD_REQUEST)

        return Response(WishlistItemSerializer(item).data, status=status.HTTP_201_CREATED)


class WishlistRemoveView(APIView):
    """DELETE /api/wishlist/remove/<product_id>/
    Remove a product from wishlist.
    """
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, product_id):
        deleted, _ = WishlistItem.objects.filter(
            user=request.user, product_id=product_id
        ).delete()
        if deleted:
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response({'error': 'Article non trouvé'}, status=status.HTTP_404_NOT_FOUND)


class WishlistCheckView(APIView):
    """GET /api/wishlist/check/<product_id>/
    Check if a product is in the user's wishlist.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, product_id):
        in_wishlist = WishlistItem.objects.filter(
            user=request.user, product_id=product_id
        ).exists()
        return Response({'in_wishlist': in_wishlist})
