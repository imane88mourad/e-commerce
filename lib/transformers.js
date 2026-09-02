/**
 * Centralized product transformer.
 * Maps raw Django API product objects to the frontend format used by all components.
 */
export const mapProduct = (product) => ({
  _id: String(product.id),
  id: product.id,
  name: product.name,
  slug: product.slug,
  sku: product.sku,
  description: product.description || product.short_description || '',
  shortDescription: product.short_description || '',
  price: parseFloat(product.price),
  oldPrice: product.old_price ? parseFloat(product.old_price) : null,
  promotionalPrice: product.promotional_price ? parseFloat(product.promotional_price) : null,
  offerPrice: product.promotional_price
    ? parseFloat(product.promotional_price)
    : parseFloat(product.price),
  vat: parseFloat(product.vat) || 0,
  stock: product.stock,
  lowStockThreshold: product.low_stock_threshold,
  warranty: product.warranty,
  weight: product.weight,
  dimensions: product.dimensions,
  isActive: product.is_active,
  isFeatured: product.is_featured,
  isNew: product.is_new,
  isBestSeller: product.is_best_seller,
  category: product.category?.name || '',
  categoryId: product.category?.id || null,
  brand: product.brand?.name || '',
  brandId: product.brand?.id || null,
  image: product.images && product.images.length > 0
    ? product.images.map(img => img.image)
    : [],
  images: product.images || [],
  variants: product.variants || [],
  documents: product.documents || [],
  attributes: product.attributes || {},
  rating: 0,
  inStock: product.stock > 0,
});

/**
 * Maps a list of raw products to frontend format.
 */
export const mapProducts = (results) => {
  return results ? results.map(mapProduct) : [];
};
