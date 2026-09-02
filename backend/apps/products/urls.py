from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProductViewSet, CategoryViewSet, BrandViewSet, ProductAdminViewSet,
    ProductImageUploadView, ProductImageDestroyView,
    ProductDocumentCreateView, ProductDocumentDestroyView,
)

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'brands', BrandViewSet, basename='brand')
router.register(r'admin', ProductAdminViewSet, basename='admin-product')
router.register(r'', ProductViewSet, basename='product')

urlpatterns = [
    path('admin/<int:product_id>/images/', ProductImageUploadView.as_view(), name='admin-product-image-upload'),
    path('admin/<int:product_id>/documents/', ProductDocumentCreateView.as_view(), name='admin-product-document-create'),
    path('images/<int:pk>/', ProductImageDestroyView.as_view(), name='product-image-detail'),
    path('documents/<int:pk>/', ProductDocumentDestroyView.as_view(), name='product-document-detail'),
    path('', include(router.urls)),
]
