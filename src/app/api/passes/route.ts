import { NextRequest, NextResponse } from 'next/server';
import {
  PassProduct,
  getPassesFromStorage,
  savePassesToStorage,
  getActivePasses,
  validateProductName,
  validatePrice,
  validateQuantity,
  validateStripeLinkOptional,
  generateId,
} from '@/lib/utils/productHelpers';

/**
 * GET /api/passes
 * Fetch all passes or just active ones
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    // Read from localStorage (in production, this would be a database query)
    const passes = getPassesFromStorage();

    if (activeOnly) {
      const activePasses = getActivePasses(passes);
      return NextResponse.json({ passes: activePasses }, { status: 200 });
    }

    return NextResponse.json({ passes }, { status: 200 });
  } catch (error) {
    console.error('Error fetching passes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch passes' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/passes
 * Create a new pass (staff only)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const { name, category, price, duration, sessionsIncluded, description } = body;

    if (!name || !category || price === undefined || duration === undefined || sessionsIncluded === undefined) {
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

    // Validate duration
    const durationValidation = validateQuantity(duration, 'Duration');
    if (!durationValidation.valid) {
      return NextResponse.json(
        { error: durationValidation.error },
        { status: 400 }
      );
    }

    // Validate sessions
    const sessionsValidation = validateQuantity(sessionsIncluded, 'Sessions');
    if (!sessionsValidation.valid) {
      return NextResponse.json(
        { error: sessionsValidation.error },
        { status: 400 }
      );
    }

    // Validate category
    if (!['day', 'weekly', 'monthly'].includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category. Must be day, weekly, or monthly' },
        { status: 400 }
      );
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

    // Create new pass
    const newPass: PassProduct = {
      id: generateId('pass'),
      name: name.trim(),
      category,
      price: parseFloat(price),
      duration: parseInt(duration),
      sessionsIncluded: parseInt(sessionsIncluded),
      description: (description || '').trim(),
      stripePurchaseLink: stripePurchaseLink.trim(),
      isActive: body.isActive ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to localStorage (in production, save to database)
    const passes = getPassesFromStorage();
    passes.push(newPass);
    savePassesToStorage(passes);

    return NextResponse.json({ pass: newPass }, { status: 201 });
  } catch (error) {
    console.error('Error creating pass:', error);
    return NextResponse.json(
      { error: 'Failed to create pass' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/passes
 * Update an existing pass (staff only)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const { id, name, category, price, duration, sessionsIncluded } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Pass ID is required' },
        { status: 400 }
      );
    }

    if (!name || !category || price === undefined || duration === undefined || sessionsIncluded === undefined) {
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

    // Validate duration
    const durationValidation = validateQuantity(duration, 'Duration');
    if (!durationValidation.valid) {
      return NextResponse.json(
        { error: durationValidation.error },
        { status: 400 }
      );
    }

    // Validate sessions
    const sessionsValidation = validateQuantity(sessionsIncluded, 'Sessions');
    if (!sessionsValidation.valid) {
      return NextResponse.json(
        { error: sessionsValidation.error },
        { status: 400 }
      );
    }

    // Validate category
    if (!['day', 'weekly', 'monthly'].includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category. Must be day, weekly, or monthly' },
        { status: 400 }
      );
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

    // Update pass
    const passes = getPassesFromStorage();
    const passIndex = passes.findIndex(p => p.id === id);

    if (passIndex === -1) {
      return NextResponse.json(
        { error: 'Pass not found' },
        { status: 404 }
      );
    }

    const updatedPass: PassProduct = {
      ...passes[passIndex],
      name: name.trim(),
      category,
      price: parseFloat(price),
      duration: parseInt(duration),
      sessionsIncluded: parseInt(sessionsIncluded),
      description: (body.description || '').trim(),
      stripePurchaseLink: stripePurchaseLink.trim(),
      isActive: body.isActive ?? passes[passIndex].isActive,
      updatedAt: new Date().toISOString(),
    };

    passes[passIndex] = updatedPass;
    savePassesToStorage(passes);

    return NextResponse.json({ pass: updatedPass }, { status: 200 });
  } catch (error) {
    console.error('Error updating pass:', error);
    return NextResponse.json(
      { error: 'Failed to update pass' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/passes
 * Delete a pass (staff only)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Pass ID is required' },
        { status: 400 }
      );
    }

    // Delete from localStorage (in production, delete from database)
    const passes = getPassesFromStorage();
    const filteredPasses = passes.filter(p => p.id !== id);

    if (filteredPasses.length === passes.length) {
      return NextResponse.json(
        { error: 'Pass not found' },
        { status: 404 }
      );
    }

    savePassesToStorage(filteredPasses);

    return NextResponse.json({ success: true, id }, { status: 200 });
  } catch (error) {
    console.error('Error deleting pass:', error);
    return NextResponse.json(
      { error: 'Failed to delete pass' },
      { status: 500 }
    );
  }
}

