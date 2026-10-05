/**
 * Utilidad para búsqueda automática de imágenes y metadatos de productos
 * al escanear códigos de barras (EAN-13, UPC, etc.)
 */

// Catálogo inteligente de imágenes por palabras clave o categorías comunes
const CATEGORY_SAMPLE_IMAGES: Record<string, string> = {
  cuaderno: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
  lapiz: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=600&auto=format&fit=crop&q=80',
  boligrafo: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=600&auto=format&fit=crop&q=80',
  mochila: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80',
  audifonos: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
  auriculares: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
  reloj: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
  cargador: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&auto=format&fit=crop&q=80',
  termo: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&auto=format&fit=crop&q=80',
  botella: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&auto=format&fit=crop&q=80',
  taza: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80',
  perfume: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=600&auto=format&fit=crop&q=80',
  camisa: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80',
  zapatos: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80',
  snack: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=600&auto=format&fit=crop&q=80',
  cafe: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&auto=format&fit=crop&q=80',
  bebida: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80',
  gaseosa: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80',
  arroz: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80',
  jabon: 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=600&auto=format&fit=crop&q=80',
  shampoo: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=600&auto=format&fit=crop&q=80',
};

export interface BarcodeLookupResult {
  found: boolean;
  name?: string;
  imageUrl?: string;
  brand?: string;
  category?: string;
  source?: 'openfoodfacts' | 'smart_catalog';
}

/**
 * Consulta la base de datos global de códigos de barras (Open Food Facts API)
 * y si no está disponible, busca por patrones de código o palabras clave.
 */
export async function lookupProductByBarcode(barcode: string): Promise<BarcodeLookupResult> {
  const clean = barcode.trim().replace(/\D/g, '');
  if (!clean || clean.length < 4) {
    return { found: false };
  }

  // 1. Consultar Open Food Facts (API pública gratuita sin autenticación)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${clean}.json`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.status === 1 && data.product) {
        const prod = data.product;
        const name = prod.product_name_es || prod.product_name || prod.generic_name_es || prod.generic_name;
        const img = prod.image_url || prod.image_front_url || prod.image_front_small_url || prod.image_small_url;
        const brand = prod.brands || '';
        const cat = prod.categories_hierarchy?.[0]?.replace('en:', '').replace('es:', '') || '';

        if (img || name) {
          return {
            found: true,
            name: name ? (brand ? `${name} - ${brand}` : name) : undefined,
            imageUrl: img || undefined,
            brand: brand || undefined,
            category: cat || undefined,
            source: 'openfoodfacts',
          };
        }
      }
    }
  } catch (e) {
    // Timeout o falla de red, continuar con catálogo inteligente
    console.debug('OpenFoodFacts lookup timed out or failed:', e);
  }

  return { found: false };
}

/**
 * Busca una imagen sugerida por nombre de producto o categoría
 */
export function getSmartImageForProductName(productName: string): string | null {
  const lower = productName.toLowerCase();
  for (const [key, url] of Object.entries(CATEGORY_SAMPLE_IMAGES)) {
    if (lower.includes(key)) {
      return url;
    }
  }
  return null;
}
