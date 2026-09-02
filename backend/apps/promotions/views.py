from decimal import Decimal
from rest_framework import generics, permissions, status, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from .models import Promotion
from .serializers import PromotionSerializer, PromoValidateSerializer
from apps.products.pagination import ProductPagination


class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


# ---------------------------------------------------------------------------
# Admin CRUD
# ---------------------------------------------------------------------------

class PromotionAdminListView(generics.ListCreateAPIView):
    """Admin: list all promotions + create new ones."""
    serializer_class = PromotionSerializer
    permission_classes = [IsAdminUser]
    pagination_class = ProductPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'code']
    ordering_fields = ['created_at', 'discount_value', 'usage_count']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = Promotion.objects.all()
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == 'true')
        return qs


class PromotionAdminDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Admin: retrieve, update, or delete a promotion."""
    serializer_class = PromotionSerializer
    permission_classes = [IsAdminUser]
    queryset = Promotion.objects.all()


# ---------------------------------------------------------------------------
# Public: validate a promo code (used by cart/checkout)
# ---------------------------------------------------------------------------

class PromoValidateView(APIView):
    """POST /api/promotions/validate/

    Public endpoint. Validates a promo code against a subtotal.
    Returns the discount info if valid, or an error if not.
    Works for both guests and authenticated users.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PromoValidateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        code = serializer.validated_data['code'].strip().upper()
        subtotal = serializer.validated_data['subtotal']

        try:
            promo = Promotion.objects.get(code__iexact=code)
        except Promotion.DoesNotExist:
            return Response(
                {'valid': False, 'error': 'Code promo inexistant'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not promo.is_active:
            return Response(
                {'valid': False, 'error': 'Ce code promo est désactivé'},
                status=status.HTTP_400_BAD_REQUEST
            )

        now = __import__('django.utils.timezone', fromlist=['now']).now()
        if promo.start_date and now < promo.start_date:
            return Response(
                {'valid': False, 'error': 'Ce code promo n\'est pas encore actif'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if promo.end_date and now > promo.end_date:
            return Response(
                {'valid': False, 'error': 'Ce code promo a expiré'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if promo.usage_limit is not None and promo.usage_count >= promo.usage_limit:
            return Response(
                {'valid': False, 'error': 'Ce code promo a atteint sa limite d\'utilisation'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if promo.discount_type == 'percentage' and promo.discount_value > 100:
            return Response(
                {'valid': False, 'error': 'Valeur de remise invalide'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if promo.discount_value <= 0:
            return Response(
                {'valid': False, 'error': 'Valeur de remise invalide'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if promo.minimum_order_amount > 0 and subtotal < promo.minimum_order_amount:
            return Response(
                {
                    'valid': False,
                    'error': f'Montant minimum de {promo.minimum_order_amount} DA requis pour ce code'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        discount = promo.compute_discount(subtotal)

        return Response({
            'valid': True,
            'code': promo.code,
            'name': promo.name,
            'discount_type': promo.discount_type,
            'discount_value': str(promo.discount_value),
            'discount_amount': str(discount),
            'minimum_order_amount': str(promo.minimum_order_amount),
        })


# ---------------------------------------------------------------------------
# Public: apply promo code to an order (used internally by order creation)
# ---------------------------------------------------------------------------

def validate_and_apply_promo(code, subtotal):
    """Validate a promo code and return (discount_amount, promo_id, error_msg).

    This is used by order creation views to server-side validate the promo.
    Returns (Decimal, int|None, str|None).
    """
    if not code:
        return Decimal('0'), None, None

    code = code.strip().upper()

    try:
        promo = Promotion.objects.select_for_update().get(code__iexact=code)
    except Promotion.DoesNotExist:
        return Decimal('0'), None, 'Code promo inexistant'

    if not promo.is_valid_now:
        return Decimal('0'), None, 'Ce code promo n\'est pas valide'

    if promo.minimum_order_amount > 0 and Decimal(str(subtotal)) < promo.minimum_order_amount:
        return Decimal('0'), None, f'Montant minimum de {promo.minimum_order_amount} DA requis'

    discount = promo.compute_discount(subtotal)

    # Increment usage atomically
    promo.increment_usage()

    return discount, promo.id, None
