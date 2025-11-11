import { NextRequest, NextResponse } from 'next/server';
import {
  FoodProduct,
  getProductsFromStorage,
  saveProductsToStorage,
  getAvailableProducts,
  validateProductName,
  validatePrice,
  validateStripeLinkOptional,
  generateId,
  Allergen,
  ProductCategory,
} from '@/lib/utils/productHelpers';

/**
 * GET /api/products
 * Fetch all products or just available ones
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const availableOnly = searchParams.get('available') === 'true';
    const category = searchParams.get('category') as ProductCategory | null;

    // Read from localStorage (in production, this would be a database query)
    let products = getProductsFromStorage();

    if (availableOnly) {
      products = getAvailableProducts(products);
    }

    if (category && ['food', 'beverage', 'retail'].includes(category)) {
      products = products.filter(p => p.category === category);
    }

    return NextResponse.json({ products }, { status: 200 });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/products
 * Create a new product (staff only)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const { name, category, price } = body;

    if (!name || !category || price === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate name
    const nameValidation = validateProductName(name);
    if (!nameValidation.valid) {
      return NextResponse.json(
        { error: nameValidation.error },
        { status: 400 }
      );
    }

    // Validate price
    const priceValidation = validatePrice(price);
    if (!priceValidation.valid) {
      return NextResponse.json(
        { error: priceValidation.error },
        { status: 400 }
      );
    }

    // Validate category
    if (!['food', 'beverage', 'retail'].includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category. Must be food, beverage, or retail' },
        { status: 400 }
      );
    }

    // Validate allergens array
    const allergens: Allergen[] = [];
    if (Array.isArray(body.allergens)) {
      const validAllergens: Allergen[] = ['peanuts', 'tree_nuts', 'dairy', 'gluten', 'eggs', 'soy', 'fish', 'shellfish'];
      for (const allergen of body.allergens) {
        if (!validAllergens.includes(allergen)) {
          return NextResponse.json(
            { error: `Invalid allergen: ${allergen}` },
            { status: 400 }
          );
        }
        allergens.push(allergen);
      }
    }

    // Validate Stripe link (optional)
    const stripePurchaseLink = body.stripePurchaseLink || '';
    const linkValidation = validateStripeLinkOptional(stripePurchaseLink);
    if (!linkValidation.valid) {
      return NextResponse.json(
        { error: linkValidation.error },
        { status: 400 }
      );
    }

    // Create new product
    const newProduct: FoodProduct = {
      id: generateId('product'),
      name: name.trim(),
      category: category as ProductCategory,
      price: parseFloat(price),
      description: (body.description || '').trim(),
      allergens,
      stripePurchaseLink: stripePurchaseLink.trim(),
      isActive: body.isActive ?? true,
      available: body.available ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to localStorage (in production, save to database)
    const products = getProductsFromStorage();
    products.push(newProduct);
    saveProductsToStorage(products);

    return NextResponse.json({ product: newProduct }, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/products
 * Update an existing product (staff only)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const { id, name, category, price } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    if (!name || !category || price === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate name
    const nameValidation = validateProductName(name);
    if (!nameValidation.valid) {
      return NextResponse.json(
        { error: nameValidation.error },
        { status: 400 }
      );
    }

    // Validate price
    const priceValidation = validatePrice(price);
    if (!priceValidation.valid) {
      return NextResponse.json(
        { error: priceValidation.error },
        { status: 400 }
      );
    }

    // Validate category
    if (!['food', 'beverage', 'retail'].includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category. Must be food, beverage, or retail' },
        { status: 400 }
      );
    }

    // Validate allergens array
    const allergens: Allergen[] = [];
    if (Array.isArray(body.allergens)) {
      const validAllergens: Allergen[] = ['peanuts', 'tree_nuts', 'dairy', 'gluten', 'eggs', 'soy', 'fish', 'shellfish'];
      for (const allergen of body.allergens) {
        if (!validAllergens.includes(allergen)) {
          return NextResponse.json(
            { error: `Invalid allergen: ${allergen}` },
            { status: 400 }
          );
        }
        allergens.push(allergen);
      }
    }

    // Validate Stripe link (optional)
    const stripePurchaseLink = body.stripePurchaseLink || '';
    const linkValidation = validateStripeLinkOptional(stripePurchaseLink);
    if (!linkValidation.valid) {
      return NextResponse.json(
        { error: linkValidation.error },
        { status: 400 }
      );
    }

    // Update product
    const products = getProductsFromStorage();
    const productIndex = products.findIndex(p => p.id === id);

    if (productIndex === -1) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const updatedProduct: FoodProduct = {
      ...products[productIndex],
      name: name.trim(),
      category: category as ProductCategory,
      price: parseFloat(price),
      description: (body.description || '').trim(),
      allergens,
      stripePurchaseLink: stripePurchaseLink.trim(),
      isActive: body.isActive ?? products[productIndex].isActive,
      available: body.available ?? products[productIndex].available,
      updatedAt: new Date().toISOString(),
    };

    products[productIndex] = updatedProduct;
    saveProductsToStorage(products);

    return NextResponse.json({ product: updatedProduct }, { status: 200 });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/products
 * Delete a product (staff only)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Delete from localStorage (in production, delete from database)
    const products = getProductsFromStorage();
    const filteredProducts = products.filter(p => p.id !== id);

    if (filteredProducts.length === products.length) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    saveProductsToStorage(filteredProducts);

    return NextResponse.json({ success: true, id }, { status: 200 });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}




