from django.db import models
from django.utils.text import slugify
from apps.users.models import User

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    image = models.URLField(blank=True, null=True)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')
    is_active = models.BooleanField(default=True)
    display_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'Categories'
        ordering = ['display_order', 'name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

class Brand(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    logo = models.URLField(blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

class Attribute(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, unique=True)
    categories = models.ManyToManyField(Category, related_name='attributes')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

class AttributeValue(models.Model):
    attribute = models.ForeignKey(Attribute, on_delete=models.CASCADE, related_name='values')
    value = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['value']
        unique_together = ['attribute', 'value']

    def __str__(self):
        return f"{self.attribute.name}: {self.value}"

class Product(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='products')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name='products')
    brand = models.ForeignKey(Brand, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    sku = models.CharField(max_length=100, unique=True)
    manufacturer_reference = models.CharField(max_length=100, blank=True, null=True)
    short_description = models.CharField(max_length=500, blank=True, null=True)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    old_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    promotional_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    vat = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    stock = models.PositiveIntegerField(default=0)
    low_stock_threshold = models.PositiveIntegerField(default=5)
    warranty = models.CharField(max_length=100, blank=True, null=True)
    weight = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    dimensions = models.CharField(max_length=100, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    is_new = models.BooleanField(default=False)
    is_best_seller = models.BooleanField(default=False)
    attributes = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    @property
    def offer_price(self):
        """Return the promotional price if set, otherwise the regular price."""
        return self.promotional_price if self.promotional_price else self.price

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='products/images/')
    alt_text = models.CharField(max_length=255, blank=True, null=True)
    display_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['display_order']

    def __str__(self):
        return f"{self.product.name} - Image {self.display_order}"

class ProductVariant(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='variants')
    sku = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    stock = models.PositiveIntegerField(default=0)
    attributes = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.product.name} - {self.name}"

class ProductDocument(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='documents')
    name = models.CharField(max_length=255)
    file = models.URLField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.product.name} - {self.name}"
