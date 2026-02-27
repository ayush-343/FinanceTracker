import { getCachedBarcode, cacheBarcode, cleanupExpiredCache } from '../database';

// API endpoints for barcode lookup
const OPEN_FOOD_FACTS_API = 'https://world.openfoodfacts.org/api/v2/product';
const UPCITEMDB_API = 'https://api.upcitemdb.com/prod/trial/lookup';

export interface BarcodeProduct {
    barcode: string;
    name: string;
    brand: string | null;
    category: string | null;
    price: number | null; // Suggested price from UPCitemdb
}

export class BarcodeLookupError extends Error {
    constructor(
        message: string,
        public code: 'NETWORK_ERROR' | 'NOT_FOUND' | 'RATE_LIMITED' | 'PARSE_ERROR'
    ) {
        super(message);
        this.name = 'BarcodeLookupError';
    }
}

/**
 * Open Food Facts API response structure
 */
interface OpenFoodFactsResponse {
    code: string;
    status: number;
    status_verbose: string;
    product?: {
        product_name?: string;
        product_name_en?: string;
        brands?: string;
        categories?: string;
    };
}

/**
 * UPCitemdb API response structure
 */
interface UPCitemdbResponse {
    code: string;
    total: number;
    items?: Array<{
        ean?: string;
        upc?: string;
        title?: string;
        brand?: string;
        category?: string;
        lowest_recorded_price?: number;
        highest_recorded_price?: number;
    }>;
}

/**
 * Lookup product from Open Food Facts API
 */
const lookupOpenFoodFacts = async (barcode: string): Promise<BarcodeProduct | null> => {
    try {
        const response = await fetch(`${OPEN_FOOD_FACTS_API}/${barcode}.json`, {
            method: 'GET',
            headers: {
                'User-Agent': 'FinanceTracker/1.0',
            },
        });

        if (!response.ok) {
            return null;
        }

        const data: OpenFoodFactsResponse = await response.json();

        if (data.status !== 1 || !data.product) {
            return null;
        }

        const product = data.product;
        const name = product.product_name || product.product_name_en;

        if (!name) {
            return null;
        }

        return {
            barcode,
            name,
            brand: product.brands?.split(',')[0]?.trim() || null,
            category: product.categories?.split(',')[0]?.trim() || null,
            price: null, // Open Food Facts doesn't provide price
        };
    } catch (error) {
        console.warn('Open Food Facts lookup failed:', error);
        return null;
    }
};

/**
 * Lookup product from UPCitemdb API (fallback)
 * Note: Free tier has 100 requests/day limit
 */
const lookupUPCitemdb = async (barcode: string): Promise<BarcodeProduct | null> => {
    try {
        const response = await fetch(`${UPCITEMDB_API}?upc=${barcode}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });

        if (response.status === 429) {
            console.warn('UPCitemdb rate limited');
            return null;
        }

        if (!response.ok) {
            return null;
        }

        const data: UPCitemdbResponse = await response.json();

        if (data.code !== 'OK' || !data.items || data.items.length === 0) {
            return null;
        }

        const item = data.items[0];

        if (!item.title) {
            return null;
        }

        return {
            barcode,
            name: item.title,
            brand: item.brand || null,
            category: item.category?.split('>')[0]?.trim() || null,
            price: item.lowest_recorded_price || null,
        };
    } catch (error) {
        console.warn('UPCitemdb lookup failed:', error);
        return null;
    }
};

/**
 * Main barcode lookup function with tiered approach:
 * 1. Check local cache (1-month expiry)
 * 2. Try Open Food Facts API
 * 3. Fallback to UPCitemdb API
 * 4. Cache successful results
 */
export const lookupBarcode = async (barcode: string): Promise<BarcodeProduct> => {
    // Clean up expired cache entries periodically
    await cleanupExpiredCache().catch(() => { });

    // Step 1: Check local cache
    const cached = await getCachedBarcode(barcode);
    if (cached) {
        return {
            barcode: cached.barcode,
            name: cached.product_name,
            brand: cached.brand,
            category: cached.category,
            price: cached.last_known_price,
        };
    }

    // Step 2: Try Open Food Facts
    let product = await lookupOpenFoodFacts(barcode);

    // Step 3: Fallback to UPCitemdb if not found
    if (!product) {
        product = await lookupUPCitemdb(barcode);
    }

    // Step 4: If still not found, throw error
    if (!product) {
        throw new BarcodeLookupError(
            'Product not found. Try entering manually.',
            'NOT_FOUND'
        );
    }

    // Step 5: Cache the result
    await cacheBarcode({
        barcode: product.barcode,
        product_name: product.name,
        brand: product.brand,
        category: product.category,
        last_known_price: product.price,
    }).catch((err) => {
        console.warn('Failed to cache barcode:', err);
    });

    return product;
};

/**
 * Validate barcode format
 * Supports EAN-13, EAN-8, UPC-A, UPC-E
 */
const isValidBarcode = (barcode: string): boolean => {
    // Remove any whitespace
    const cleaned = barcode.trim();

    // Check if it's numeric and valid length
    if (!/^\d+$/.test(cleaned)) {
        return false;
    }

    // Valid barcode lengths: 8 (EAN-8, UPC-E), 12 (UPC-A), 13 (EAN-13), 14 (GTIN-14)
    const validLengths = [8, 12, 13, 14];
    return validLengths.includes(cleaned.length);
};
