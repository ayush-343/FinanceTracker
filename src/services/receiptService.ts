import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import { getCategories, getSubcategories } from '../database';
import { Category, Subcategory } from '../types';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemma-3-4b-it:generateContent';

export interface ScannedItem {
    name: string;
    amount: number;
    suggestedCategoryId: number | null; 
    suggestedSubcategoryId: number | null;
}

export interface ScanReceiptResponse {
    items: ScannedItem[];
    receiptDate: string;
}

export class ReceiptScanError extends Error {
    constructor(
        message: string,
        public code: 'NETWORK_ERROR' | 'API_ERROR' | 'PARSE_ERROR' | 'NO_ITEMS_FOUND'
    ) {
        super(message);
        this.name = 'ReceiptScanError';
    }
}

interface CategoryWithSubcategories extends Category {
    subcategories: Subcategory[];
}

interface CategoryInfo {
    id: number;
    name: string;
    subcategories: { id: number; name: string }[];
}

/**
 * Fetches all categories with their subcategories for AI matching
 */
const fetchCategoriesWithSubcategories = async (): Promise<CategoryWithSubcategories[]> => {
    const categories = await getCategories();
    const categoriesWithSubs: CategoryWithSubcategories[] = [];

    for (const category of categories) {
        const subcategories = await getSubcategories(category.id);
        categoriesWithSubs.push({
            ...category,
            subcategories,
        });
    }

    return categoriesWithSubs;
};

/**
 * Build the prompt for Gemini to extract receipt items
 */
const buildPrompt = (categories: CategoryInfo[]): string => {
    const categoryList = categories
        .map((cat) => {
            const subcats = cat.subcategories.map((sub) => `    - ${sub.name} (id: ${sub.id})`).join('\n');
            return `- ${cat.name} (id: ${cat.id})\n${subcats}`;
        })
        .join('\n');

    return `You are a receipt/invoice scanner. Analyze this image and extract all purchased items with their prices.

For each item found, provide:
1. Item name (clean, readable name)
2. Amount/price (as a number, without currency symbols)
3. Suggested category ID from the list below (or null if no match)
4. Suggested subcategory ID from the list below (or null if no match)

Also extract the purchase/order date if visible.

Available categories and subcategories:
${categoryList}

IMPORTANT: Respond ONLY with valid JSON in this exact format, no other text:
{
  "items": [
    {
      "name": "Item Name",
      "amount": 123.45,
      "suggestedCategoryId": 1,
      "suggestedSubcategoryId": 2
    }
  ],
  "receiptDate": "YYYY-MM-DD"
}

If no date is found, use today's date. If no category matches, use null for the IDs.
Extract ALL items visible in the receipt/cart, including quantities and final prices after discounts.`;
};

/**
 * Parse Gemini's response to extract JSON
 */
const parseGeminiResponse = (responseText: string): { items: any[]; receiptDate: string } => {
    // Try to extract JSON from the response
    let jsonStr = responseText.trim();

    // Remove markdown code blocks if present
    if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.slice(0, -3);
    }

    jsonStr = jsonStr.trim();

    try {
        const parsed = JSON.parse(jsonStr);
        return {
            items: parsed.items || [],
            receiptDate: parsed.receiptDate || new Date().toISOString().split('T')[0],
        };
    } catch {
        // Try to find JSON object in the response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    items: parsed.items || [],
                    receiptDate: parsed.receiptDate || new Date().toISOString().split('T')[0],
                };
            } catch {
                throw new Error('Failed to parse JSON from response');
            }
        }
        throw new Error('No valid JSON found in response');
    }
};

/**
 * Scans a receipt image and extracts items with suggested categories using Gemini API
 * @param imageUri - The local URI of the image to scan
 * @returns Promise with scanned items and receipt date
 */
export const scanReceiptImage = async (imageUri: string): Promise<ScanReceiptResponse> => {
    if (!GEMINI_API_KEY) {
        throw new ReceiptScanError(
            'Gemini API key not configured. Please set EXPO_PUBLIC_GEMINI_API_KEY environment variable.',
            'API_ERROR'
        );
    }

    try {
        // Convert image to base64
        const base64Image = await readAsStringAsync(imageUri, {
            encoding: EncodingType.Base64,
        });

        // Get categories with subcategories for AI matching
        const categoriesWithSubs = await fetchCategoriesWithSubcategories();

        // Prepare category info for the prompt
        const categoryInfo: CategoryInfo[] = categoriesWithSubs.map((cat) => ({
            id: cat.id,
            name: cat.name,
            subcategories: cat.subcategories.map((sub) => ({
                id: sub.id,
                name: sub.name,
            })),
        }));

        // Build the prompt
        const prompt = buildPrompt(categoryInfo);

        // Determine MIME type from URI
        const mimeType = imageUri.toLowerCase().includes('.png') ? 'image/png' : 'image/jpeg';

        // Call Gemini API
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            { text: prompt },
                            {
                                inline_data: {
                                    mime_type: mimeType,
                                    data: base64Image,
                                },
                            },
                        ],
                    },
                ],
                generationConfig: {
                    temperature: 0.1,
                    topK: 32,
                    topP: 1,
                    maxOutputTokens: 4096,
                },
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
            throw new ReceiptScanError(
                `Gemini API error: ${errorMessage}`,
                'API_ERROR'
            );
        }

        const data = await response.json();

        // Extract text from Gemini response
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!responseText) {
            throw new ReceiptScanError(
                'No response from Gemini API',
                'API_ERROR'
            );
        }

        // Parse the response
        const parsed = parseGeminiResponse(responseText);

        if (!parsed.items || parsed.items.length === 0) {
            throw new ReceiptScanError(
                'No items found in the receipt. Please try a clearer image.',
                'NO_ITEMS_FOUND'
            );
        }

        // Validate and clean items
        const items: ScannedItem[] = parsed.items.map((item: any) => ({
            name: String(item.name || 'Unknown Item').trim(),
            amount: typeof item.amount === 'number' ? item.amount : parseFloat(item.amount) || 0,
            suggestedCategoryId: typeof item.suggestedCategoryId === 'number' ? item.suggestedCategoryId : null,
            suggestedSubcategoryId: typeof item.suggestedSubcategoryId === 'number' ? item.suggestedSubcategoryId : null,
        }));

        return {
            items,
            receiptDate: parsed.receiptDate,
        };
    } catch (error) {
        if (error instanceof ReceiptScanError) {
            throw error;
        }

        if (error instanceof TypeError && error.message.includes('Network request failed')) {
            throw new ReceiptScanError(
                'Network error. Please check your internet connection.',
                'NETWORK_ERROR'
            );
        }

        throw new ReceiptScanError(
            error instanceof Error ? error.message : 'An unexpected error occurred',
            'API_ERROR'
        );
    }
};

/**
 * Test the Gemini API connection
 * @returns Promise<boolean> - true if connection is successful
 */
export const testApiConnection = async (): Promise<boolean> => {
    if (!GEMINI_API_KEY) {
        return false;
    }

    try {
        // Simple test request to Gemini
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [{ text: 'Say "OK" if you can read this.' }],
                    },
                ],
                generationConfig: {
                    maxOutputTokens: 10,
                },
            }),
        });
        return response.ok;
    } catch {
        return false;
    }
};
