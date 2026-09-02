from django.urls import path
from .views import (
    OrderListView, OrderDetailView, CreateOrderView, GuestOrderView,
    GuestOrderDetailView, OrderAdminListView, OrderAdminDetailView,
    OrderPaymentActionView,
)
from .analytics import (
    DashboardOverviewView, SalesOverTimeView, TopProductsView,
    TopCategoriesView, OrderStatusDistributionView, CustomerStatsView,
)

urlpatterns = [
    # Customer-facing
    path('', OrderListView.as_view(), name='order-list'),
    path('create/', CreateOrderView.as_view(), name='order-create'),
    path('guest/', GuestOrderView.as_view(), name='guest-order-create'),
    path('guest/<int:pk>/', GuestOrderDetailView.as_view(), name='guest-order-detail'),
    path('<int:pk>/', OrderDetailView.as_view(), name='order-detail'),

    # Analytics (staff-only) — must be BEFORE admin/<int:pk>/ to avoid conflicts
    path('admin/analytics/overview/', DashboardOverviewView.as_view(), name='analytics-overview'),
    path('admin/analytics/sales/', SalesOverTimeView.as_view(), name='analytics-sales'),
    path('admin/analytics/products/', TopProductsView.as_view(), name='analytics-products'),
    path('admin/analytics/categories/', TopCategoriesView.as_view(), name='analytics-categories'),
    path('admin/analytics/status/', OrderStatusDistributionView.as_view(), name='analytics-status'),
    path('admin/analytics/customers/', CustomerStatsView.as_view(), name='analytics-customers'),

    # Admin (staff-only) — pk-based routes AFTER analytics
    path('admin/', OrderAdminListView.as_view(), name='order-admin-list'),
    path('admin/<int:pk>/', OrderAdminDetailView.as_view(), name='order-admin-detail'),
    path('admin/<int:pk>/payment/<str:action>/', OrderPaymentActionView.as_view(), name='order-admin-payment-action'),
]
