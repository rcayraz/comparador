/* normalizer.js
   Convierte los distintos formatos de datasets (AliExpress, Temu, Shopify) al modelo común.
   Exporta una función `normalizeRecord(source, raw)` que retorna el objeto normalizado.
*/
(function(global){
  const MARKETPLACES = {
    aliexpress: 'aliexpress',
    temu: 'temu',
    shopify: 'shopify'
  };

  function parseNumber(v){
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') return v;
    // limpiar comas y símbolos
    const cleaned = String(v).replace(/[^0-9\.-]/g,'');
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : null;
  }

  function normalizeAliexpress(raw){
    return {
      id: String(raw.id || raw.item_id || raw.sku || ''),
      title: raw.title || raw.name || '',
      brand: raw.brand || raw.seller || raw.marca || '—',
      marketplace: MARKETPLACES.aliexpress,
      price_amount: parseNumber(raw.price) || parseNumber(raw.price_amount) || 0,
      price_currency: raw.currency || raw.price_currency || 'USD',
      shipping_cost: parseNumber(raw.shipping_cost) || parseNumber(raw.postage) || 0,
      shipping_time_days: parseNumber(raw.shipping_time_days) || parseNumber(raw.ship_days) || 7,
      is_offer: Boolean(raw.is_offer || raw.discounted || raw.sale || false),
      url: raw.url || raw.link || '#',
      rating: parseNumber(raw.rating) || null,
      image: raw.image || raw.image_url || null
    };
  }

  function normalizeTemu(raw){
    return {
      id: String(raw.id || raw.itemId || ''),
      title: raw.title || raw.name || '',
      brand: raw.brand || raw.vendor || '—',
      marketplace: MARKETPLACES.temu,
      price_amount: parseNumber(raw.price) || parseNumber(raw.amount) || 0,
      price_currency: raw.currency || raw.price_currency || 'USD',
      shipping_cost: parseNumber(raw.shipping) || parseNumber(raw.shipping_cost) || 0,
      shipping_time_days: parseNumber(raw.delivery_days) || parseNumber(raw.shipping_days) || 10,
      is_offer: Boolean(raw.on_sale || raw.is_offer || false),
      url: raw.url || raw.link || '#',
      rating: parseNumber(raw.rating) || null,
      image: raw.image || raw.thumbnail || null
    };
  }

  function normalizeShopify(raw){
    // raw can be an object parsed from CSV with column variations
    return {
      id: String(raw.id || raw.sku || raw.handle || ''),
      title: raw.title || raw.name || '',
      brand: raw.vendor || raw.brand || '—',
      marketplace: MARKETPLACES.shopify,
      price_amount: parseNumber(raw.price) || parseNumber(raw.variant_price) || 0,
      price_currency: raw.currency || raw.price_currency || 'USD',
      shipping_cost: parseNumber(raw.shipping_cost) || parseNumber(raw.shipping) || 0,
      shipping_time_days: parseNumber(raw.shipping_days) || parseNumber(raw.delivery_days) || 5,
      is_offer: Boolean(raw.on_sale || raw.is_offer || raw.sale || false),
      url: raw.url || raw.link || (raw.handle? ('https://example.com/products/' + raw.handle) : '#'),
      rating: parseNumber(raw.rating) || null,
      image: raw.image || raw.image_url || null
    };
  }

  function normalizeRecord(source, raw){
    source = (source||'').toLowerCase();
    if (source === 'aliexpress') return normalizeAliexpress(raw);
    if (source === 'temu') return normalizeTemu(raw);
    if (source === 'shopify') return normalizeShopify(raw);
    // intento heurístico
    if (raw.marketplace === 'temu') return normalizeTemu(raw);
    return normalizeShopify(raw);
  }

  global.Normalizer = { normalizeRecord };
})(window);
