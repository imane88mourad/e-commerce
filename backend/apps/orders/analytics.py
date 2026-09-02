"""
Analytics views — server-side aggregation for dashboard and analytics pages.

All statistics are computed in PostgreSQL via Django ORM aggregations
to avoid transferring thousands of orders to the frontend.
"""
from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, Sum, Avg, Q, F, Value, Min
from django.db.models.functions import TruncDate, Coalesce
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Order, OrderItem


class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


def _parse_period(period, start_date=None, end_date=None):
    """Return (start, end) datetimes for a named period."""
    now = timezone.now()
    if period == 'today':
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        return start, now
    elif period == '7d':
        return now - timedelta(days=7), now
    elif period == '30d':
        return now - timedelta(days=30), now
    elif period == '3m':
        return now - timedelta(days=90), now
    elif period == '6m':
        return now - timedelta(days=180), now
    elif period == '12m':
        return now - timedelta(days=365), now
    elif period == 'custom' and start_date and end_date:
        try:
            from django.utils.dateparse import parse_datetime
            s = parse_datetime(start_date) if isinstance(start_date, str) else start_date
            e = parse_datetime(end_date) if isinstance(end_date, str) else end_date
            if s and e:
                return s, e
        except Exception:
            pass
    # Default: all time
    return None, now


def _base_qs(start, end):
    """Base order queryset filtered by date range, excluding cancelled."""
    qs = Order.objects.filter(status__in=['pending', 'confirmed', 'processing', 'shipped', 'delivered'])
    if start:
        qs = qs.filter(date__gte=start)
    if end:
        qs = qs.filter(date__lte=end)
    return qs


class DashboardOverviewView(APIView):
    """GET /api/orders/admin/analytics/overview/

    Returns high-level KPIs: revenue, order count, avg order value,
    customer count (unique emails), product count, and comparison deltas.
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        period = request.query_params.get('period', '30d')
        start, end = _parse_period(period)

        # Current period stats
        qs = _base_qs(start, end)
        stats = qs.aggregate(
            total_revenue=Coalesce(Sum('amount'), Value(Decimal('0'))),
            order_count=Count('id'),
            avg_order=Coalesce(Avg('amount'), Value(Decimal('0'))),
        )

        total_revenue = float(stats['total_revenue'])
        order_count = stats['order_count']
        avg_order = float(stats['avg_order'])

        # Unique customers in period
        customer_emails = qs.exclude(
            Q(guest_email__isnull=True) | Q(guest_email='')
        ).values_list('guest_email', flat=True).distinct()
        customer_count = customer_emails.count()

        # Registered users in period
        registered = qs.exclude(user__isnull=True).values('user').distinct().count()

        # Guest vs registered
        guest_count = order_count - registered

        # Product count (all active products)
        from apps.products.models import Product
        product_count = Product.objects.filter(is_active=True).count()

        # Previous period for comparison
        if start:
            duration = end - start
            prev_start = start - duration
            prev_end = start
            prev_qs = _base_qs(prev_start, prev_end)
            prev_stats = prev_qs.aggregate(
                revenue=Coalesce(Sum('amount'), Value(Decimal('0'))),
                orders=Count('id'),
            )
            prev_revenue = float(prev_stats['revenue'])
            prev_orders = prev_stats['orders']

            revenue_delta = round(((total_revenue - prev_revenue) / max(prev_revenue, 1)) * 100, 1) if prev_revenue else None
            orders_delta = round(((order_count - prev_orders) / max(prev_orders, 1)) * 100, 1) if prev_orders else None
        else:
            revenue_delta = None
            orders_delta = None

        return Response({
            'total_revenue': total_revenue,
            'order_count': order_count,
            'avg_order': avg_order,
            'customer_count': customer_count + registered,  # total unique
            'registered_count': registered,
            'guest_count': guest_count,
            'product_count': product_count,
            'revenue_delta': revenue_delta,
            'orders_delta': orders_delta,
            'period': period,
        })


class SalesOverTimeView(APIView):
    """GET /api/orders/admin/analytics/sales/

    Returns daily revenue and order count for charting.
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        period = request.query_params.get('period', '30d')
        start, end = _parse_period(period)

        qs = _base_qs(start, end).annotate(
            day=TruncDate('date')
        ).values('day').annotate(
            revenue=Sum('amount'),
            orders=Count('id'),
        ).order_by('day')

        data = [
            {
                'date': item['day'].isoformat() if item['day'] else None,
                'revenue': float(item['revenue'] or 0),
                'orders': item['orders'],
            }
            for item in qs
        ]

        return Response(data)


class TopProductsView(APIView):
    """GET /api/orders/admin/analytics/products/

    Returns top-selling products by revenue and quantity.
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        limit = int(request.query_params.get('limit', 10))
        period = request.query_params.get('period', '30d')
        start, end = _parse_period(period)

        # Get order items for orders in the period
        order_qs = _base_qs(start, end)
        item_qs = OrderItem.objects.filter(order__in=order_qs)

        # Aggregate by product name (stored as JSON)
        from django.db.models import Value as V
        top = (
            item_qs
            .annotate(product_name=F('product__name'))
            .values('product_name')
            .annotate(
                total_quantity=Sum('quantity'),
                total_revenue=Sum(F('price') * F('quantity')),
            )
            .order_by('-total_revenue')[:limit]
        )

        data = [
            {
                'name': item['product_name'] or 'Produit inconnu',
                'quantity': item['total_quantity'],
                'revenue': float(item['total_revenue'] or 0),
            }
            for item in top
        ]

        return Response(data)


class TopCategoriesView(APIView):
    """GET /api/orders/admin/analytics/categories/

    Returns top categories by revenue from order items.
    Note: order items store product snapshot as JSON, so we need to
    match product IDs back to the Product table for category info.
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        limit = int(request.query_params.get('limit', 10))
        period = request.query_params.get('period', '30d')
        start, end = _parse_period(period)

        from apps.products.models import Product

        order_qs = _base_qs(start, end)
        item_qs = OrderItem.objects.filter(order__in=order_qs)

        # Get all product IDs from order items
        product_ids = []
        for item in item_qs:
            pid = item.product.get('id')
            if pid:
                product_ids.append(pid)

        # Fetch product categories
        products = Product.objects.filter(id__in=product_ids).select_related('category')
        pid_to_category = {p.id: p.category.name if p.category else 'Sans catégorie' for p in products}

        # Rebuild items with category info
        category_data = {}
        for item in item_qs:
            pid = item.product.get('id')
            cat_name = pid_to_category.get(pid, 'Autre')
            amount = float(item.price * item.quantity)
            if cat_name not in category_data:
                category_data[cat_name] = {'name': cat_name, 'quantity': 0, 'revenue': 0}
            category_data[cat_name]['quantity'] += item.quantity
            category_data[cat_name]['revenue'] += amount

        # Sort by revenue and limit
        sorted_cats = sorted(category_data.values(), key=lambda x: x['revenue'], reverse=True)[:limit]

        return Response(sorted_cats)


class OrderStatusDistributionView(APIView):
    """GET /api/orders/admin/analytics/status/

    Returns order count by status.
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        period = request.query_params.get('period', '30d')
        start, end = _parse_period(period)

        qs = _base_qs(start, end)
        # Include cancelled in the base query for status distribution
        all_qs = Order.objects.all()
        if start:
            all_qs = all_qs.filter(date__gte=start)
        if end:
            all_qs = all_qs.filter(date__lte=end)

        distribution = all_qs.values('status').annotate(count=Count('id')).order_by('status')

        data = {item['status']: item['count'] for item in distribution}

        return Response(data)


class CustomerStatsView(APIView):
    """GET /api/orders/admin/analytics/customers/

    Returns customer statistics: registered vs guest, new customers over time.
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        period = request.query_params.get('period', '30d')
        start, end = _parse_period(period)

        qs = _base_qs(start, end)

        # Registered vs guest breakdown
        registered_count = qs.exclude(user__isnull=True).values('user').distinct().count()
        guest_count = qs.filter(user__isnull=True).exclude(
            Q(guest_email__isnull=True) | Q(guest_email='')
        ).values('guest_email').distinct().count()

        return Response({
            'registered': registered_count,
            'guest': guest_count,
            'total': registered_count + guest_count,
        })
