from django.urls import path
from .views import (
    ProductReviewListView, ProductReviewStatsView, ProductReviewCreateView,
    AdminReviewListView, AdminReviewDetailView,
    WishlistListView, WishlistAddView, WishlistRemoveView, WishlistCheckView,
)

urlpatterns = [
    # Public reviews
    path('product/<int:product_id>/', ProductReviewListView.as_view(), name='review-product-list'),
    path('product/<int:product_id>/stats/', ProductReviewStatsView.as_view(), name='review-product-stats'),
    path('create/', ProductReviewCreateView.as_view(), name='review-create'),

    # Admin reviews
    path('admin/', AdminReviewListView.as_view(), name='review-admin-list'),
    path('admin/<int:pk>/', AdminReviewDetailView.as_view(), name='review-admin-detail'),

    # Wishlist
    path('wishlist/', WishlistListView.as_view(), name='wishlist-list'),
    path('wishlist/add/', WishlistAddView.as_view(), name='wishlist-add'),
    path('wishlist/remove/<int:product_id>/', WishlistRemoveView.as_view(), name='wishlist-remove'),
    path('wishlist/check/<int:product_id>/', WishlistCheckView.as_view(), name='wishlist-check'),
]
