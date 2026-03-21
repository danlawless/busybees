import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import {
  getAllProducts,
  getActiveProducts,
} from '@/lib/services/products';
import {
  validateProductName,
  validatePrice,
  validateStripeLinkOptional,
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

    // Fetch from database
    let products = availableOnly ? await getActiveProducts() : await getAllProducts();

    // Filter by category if specified
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

    // Parse inventory fields
    const quantityOnHand = body.quantityOnHand !== undefined && body.quantityOnHand !== null && body.quantityOnHand !== ''
      ? parseInt(body.quantityOnHand)
      : null;
    const lowStockThreshold = body.lowStockThreshold !== undefined && body.lowStockThreshold !== ''
      ? parseInt(body.lowStockThreshold)
      : 5;

    // Create product using admin client (bypasses RLS for POS staff operations)
    const supabase = createAdminClient();
    const { data: newProduct, error } = await supabase
      .from('products')
      .insert({
        name: name.trim(),
        category: category as ProductCategory,
        price: parseFloat(price),
        description: (body.description || '').trim(),
        allergens: JSON.stringify(allergens),
        stripe_purchase_link: stripePurchaseLink.trim(),
        is_active: body.isActive ?? true,
        available: body.available ?? true,
        quantity_on_hand: quantityOnHand,
        low_stock_threshold: lowStockThreshold,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating product:', error);
      return NextResponse.json(
        { error: 'Failed to create product' },
        { status: 500 }
      );
    }

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

    // Parse inventory fields
    const updateData: Record<string, unknown> = {
      name: name.trim(),
      category: category as ProductCategory,
      price: parseFloat(price),
      description: (body.description || '').trim(),
      allergens: JSON.stringify(allergens),
      stripe_purchase_link: stripePurchaseLink.trim(),
      is_active: body.isActive,
      available: body.available,
    };

    // Only include inventory fields if explicitly provided
    if (body.quantityOnHand !== undefined) {
      updateData.quantity_on_hand = body.quantityOnHand !== null && body.quantityOnHand !== ''
        ? parseInt(body.quantityOnHand)
        : null;
    }
    if (body.lowStockThreshold !== undefined) {
      updateData.low_stock_threshold = parseInt(body.lowStockThreshold) || 5;
    }

    // Update product using admin client (bypasses RLS for POS staff operations)
    const supabase = createAdminClient();
    const { data: updatedProduct, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating product:', error);
      return NextResponse.json(
        { error: 'Failed to update product' },
        { status: 500 }
      );
    }

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

    // Delete from database using admin client (bypasses RLS for POS staff operations)
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting product:', error);
      return NextResponse.json(
        { error: 'Failed to delete product' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id }, { status: 200 });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}
