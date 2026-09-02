/**
 * Cart pricing helpers shared by the cart page, order summary and checkout.
 *
 * Everything here is pure (no React), so it stays consistent everywhere and
 * is easy to unit test. The cart itself is stored client-side in localStorage
 * so it works reliably for guests without forcing authentication.
 */

/**
 * Round a value to 2 decimals using the same convention as the rest of the UI.
 */
export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/**
 * Currency formatter (kept consistent with the existing `currency` prop).
 */
/**
 * Currency formatter (kept consistent with the existing `currency` prop).
 * Uses DZD (DA) — the Algerian Dinar.
 */
export const money = (value, currency = 'DA') =>
  `${round2(value).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} ${currency}`;

/**
 * Promo code is now validated server-side via Django.
 * The client only stores the code and discount info returned by the API.
 * findPromo is kept for backward compatibility with localStorage restore.
 */
export const findPromo = (rawCode) => {
  if (!rawCode) return null;
  // Return a minimal promo object from localStorage restore
  if (typeof rawCode === 'object' && rawCode.code) {
    return rawCode;
  }
  const code = String(rawCode).trim().toUpperCase();
  return { code, type: 'percent', value: 0, _serverValidated: true };
};

/**
 * Compute discount from a server-validated promo object.
 * The promo object from the API has: code, discount_type, discount_value, discount_amount.
 */
export const computeDiscount = (promo, subtotal) => {
  if (!promo) return 0;
  // If server returned discount_amount, use it directly
  if (promo.discount_amount != null) {
    return round2(Number(promo.discount_amount));
  }
  // Fallback for legacy local promo objects
  if (promo.type === 'percent') {
    return round2(subtotal * (promo.value / 100));
  }
  if (promo.type === 'fixed') {
    return Math.min(subtotal, promo.value);
  }
  return 0;
};

/**
 * Build the full cart summary.
 *
 * @param {object} cartItems   map of productId -> quantity
 * @param {array}  products    mapped products (with offerPrice, vat, image, …)
 * @param {object} [promo]     applied promo object (from findPromo) or null
 *
 * @returns {object} {
 *   items, itemCount, subtotal, discount, vatTotal, vatRate, shipping, total,
 *   hasPromo, promoLabel, lineTotals
 * }
 *
 * - `subtotal`  : sum of offerPrice * qty
 * - `vatTotal`  : sum of qty * offerPrice * (product.vat / 100), i.e. "si applicable"
 * - `shipping`  : free
 * - `total`     : subtotal - discount + vatTotal + shipping
 */
export const computeCart = ({ cartItems = {}, products = [], promo = null }) => {
  const items = [];
  let subtotal = 0;
  let vatTotal = 0;

  Object.entries(cartItems).forEach(([productId, quantity]) => {
    const qty = Number(quantity);
    if (!qty || qty <= 0) return;
    const product = products.find((p) => String(p._id) === String(productId));
    if (!product) return;

    const unitPrice = Number(product.offerPrice || product.price || 0);
    const lineTotal = round2(unitPrice * qty);
    const vatRate = Number(product.vat) || 0;
    vatTotal += round2(lineTotal * (vatRate / 100));

    subtotal += lineTotal;
    items.push({ product, quantity: qty, unitPrice, lineTotal, vatRate });
  });

  subtotal = round2(subtotal);
  vatTotal = round2(vatTotal);

  const discount = computeDiscount(promo, subtotal);
  const shipping = 0;
  const total = round2(subtotal - discount + vatTotal + shipping);

  return {
    items,
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
    subtotal,
    discount,
    promoApplied: !!promo && discount > 0,
    promoNotApplicable: !!promo && discount === 0 && promo.min_subtotal != null,
    vatTotal,
    shipping,
    total,
  };
};
