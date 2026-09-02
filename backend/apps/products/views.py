from rest_framework import viewsets, permissions, filters, generics, status
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend, FilterSet, NumberFilter, BooleanFilter
from .models import Product, Category, Brand, ProductImage, ProductDocument
from .serializers import (
    ProductSerializer, ProductAdminSerializer, CategorySerializer, BrandSerializer,
    ProductImageSerializer, ProductDocumentSerializer
)
from .pagination import ProductPagination


class IsAdminUser(permissions.BasePermission):
    """Allow only authenticated staff (admin) users."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


class ProductFilter(FilterSet):
    price_min = NumberFilter(field_name='price', lookup_expr='gte')
    price_max = NumberFilter(field_name='price', lookup_expr='lte')
    in_stock = BooleanFilter(method='filter_in_stock')

    class Meta:
        model = Product
        fields = ['category', 'brand', 'is_active', 'is_featured', 'is_new', 'is_best_seller']

    def filter_in_stock(self, queryset, name, value):
        if value:
            return queryset.filter(stock__gt=0)
        return queryset

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']
    pagination_class = ProductPagination

class BrandViewSet(viewsets.ModelViewSet):
    queryset = Brand.objects.filter(is_active=True)
    serializer_class = BrandSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']
    pagination_class = ProductPagination

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.filter(is_active=True)
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    pagination_class = ProductPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ProductFilter
    search_fields = ['name', 'description', 'sku', 'manufacturer_reference', 'brand__name']
    ordering_fields = ['price', 'created_at', 'name']
    ordering = ['-created_at']

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def get_queryset(self):
        queryset = super().get_queryset()
        featured = self.request.query_params.get('featured')
        new = self.request.query_params.get('new')
        best_seller = self.request.query_params.get('best_seller')

        if featured == 'true':
            queryset = queryset.filter(is_featured=True)
        if new == 'true':
            queryset = queryset.filter(is_new=True)
        if best_seller == 'true':
            queryset = queryset.filter(is_best_seller=True)

        return queryset


class ProductAdminViewSet(viewsets.ModelViewSet):
    """Back-office product management.

    Admin-only. Lists ALL products (active and inactive), so admins can
    activate/deactivate. Supports search, filtering, ordering and pagination.
    """
    serializer_class = ProductAdminSerializer
    permission_classes = [IsAdminUser]
    pagination_class = ProductPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ProductFilter
    search_fields = ['name', 'description', 'sku', 'manufacturer_reference', 'brand__name']
    ordering_fields = ['price', 'created_at', 'name', 'stock', 'updated_at', 'category', 'brand']
    ordering = ['-updated_at']

    def get_queryset(self):
        return Product.objects.all().select_related('category', 'brand')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ProductImageUploadView(APIView):
    permission_classes = [IsAdminUser]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, product_id):
        product = get_object_or_404(Product, pk=product_id)
        image = request.FILES.get('image')
        if not image:
            return Response({'error': 'No image file provided.'}, status=status.HTTP_400_BAD_REQUEST)
        alt_text = request.data.get('alt_text', '') or ''
        display_order = request.data.get('display_order') or 0
        try:
            display_order = int(display_order)
        except (TypeError, ValueError):
            display_order = 0
        img = ProductImage.objects.create(
            product=product, image=image, alt_text=alt_text, display_order=display_order
        )
        return Response(ProductImageSerializer(img).data, status=status.HTTP_201_CREATED)


class ProductImageDestroyView(generics.DestroyAPIView):
    queryset = ProductImage.objects.all()
    serializer_class = ProductImageSerializer
    permission_classes = [IsAdminUser]


class ProductDocumentCreateView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, product_id):
        product = get_object_or_404(Product, pk=product_id)
        name = (request.data.get('name') or '').strip()
        file_url = (request.data.get('file') or '').strip()
        if not name or not file_url:
            return Response({'error': 'name and file are required.'}, status=status.HTTP_400_BAD_REQUEST)
        doc = ProductDocument.objects.create(product=product, name=name, file=file_url)
        return Response(ProductDocumentSerializer(doc).data, status=status.HTTP_201_CREATED)


class ProductDocumentDestroyView(generics.DestroyAPIView):
    queryset = ProductDocument.objects.all()
    serializer_class = ProductDocumentSerializer
    permission_classes = [IsAdminUser]
