import { NextRequest, NextResponse } from 'next/server';
import {
  PartyProduct,
  getPartiesFromStorage,
  savePartiesToStorage,
  getActiveParties,
  validateProductName,
  validatePrice,
  validateQuantity,
  validateStripeLinkOptional,
  generateId,
} from '@/lib/utils/productHelpers';

/**
 * GET /api/parties
 * Fetch all parties or just active ones
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    // Read from localStorage (in production, this would be a database query)
    const parties = getPartiesFromStorage();

    if (activeOnly) {
      const activeParties = getActiveParties(parties);
      return NextResponse.json({ parties: activeParties }, { status: 200 });
    }

    return NextResponse.json({ parties }, { status: 200 });
  } catch (error) {
    console.error('Error fetching parties:', error);
    return NextResponse.json(
      { error: 'Failed to fetch parties' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/parties
 * Create a new party (staff only)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const { name, basePrice, capacity, duration, includedItems, addOns } = body;

    if (!name || basePrice === undefined || capacity === undefined || duration === undefined) {
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

    // Validate base price
    const priceValidation = validatePrice(basePrice);
    if (!priceValidation.valid) {
      return NextResponse.json(
        { error: priceValidation.error },
        { status: 400 }
      );
    }

    // Validate capacity
    const capacityValidation = validateQuantity(capacity, 'Capacity');
    if (!capacityValidation.valid) {
      return NextResponse.json(
        { error: capacityValidation.error },
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

    // Validate add-ons if provided
    const validatedAddOns = [];
    if (Array.isArray(addOns)) {
      for (const addOn of addOns) {
        if (!addOn.name || addOn.price === undefined) {
          return NextResponse.json(
            { error: 'Add-on must have name and price' },
            { status: 400 }
          );
        }

        const addOnPriceValidation = validatePrice(addOn.price);
        if (!addOnPriceValidation.valid) {
          return NextResponse.json(
            { error: `Add-on price error: ${addOnPriceValidation.error}` },
            { status: 400 }
          );
        }

        validatedAddOns.push({
          id: addOn.id || generateId('addon'),
          name: addOn.name.trim(),
          price: parseFloat(addOn.price),
          description: (addOn.description || '').trim(),
        });
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

    // Process included items
    const processedIncludedItems = Array.isArray(includedItems)
      ? includedItems.filter(item => item && item.trim()).map(item => item.trim())
      : [];

    // Create new party
    const newParty: PartyProduct = {
      id: generateId('party'),
      name: name.trim(),
      basePrice: parseFloat(basePrice),
      capacity: parseInt(capacity),
      duration: parseInt(duration),
      includedItems: processedIncludedItems,
      addOns: validatedAddOns,
      description: (body.description || '').trim(),
      stripePurchaseLink: stripePurchaseLink.trim(),
      isActive: body.isActive ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to localStorage (in production, save to database)
    const parties = getPartiesFromStorage();
    parties.push(newParty);
    savePartiesToStorage(parties);

    return NextResponse.json({ party: newParty }, { status: 201 });
  } catch (error) {
    console.error('Error creating party:', error);
    return NextResponse.json(
      { error: 'Failed to create party' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/parties
 * Update an existing party (staff only)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const { id, name, basePrice, capacity, duration, includedItems, addOns } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Party ID is required' },
        { status: 400 }
      );
    }

    if (!name || basePrice === undefined || capacity === undefined || duration === undefined) {
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

    // Validate base price
    const priceValidation = validatePrice(basePrice);
    if (!priceValidation.valid) {
      return NextResponse.json(
        { error: priceValidation.error },
        { status: 400 }
      );
    }

    // Validate capacity
    const capacityValidation = validateQuantity(capacity, 'Capacity');
    if (!capacityValidation.valid) {
      return NextResponse.json(
        { error: capacityValidation.error },
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

    // Validate add-ons if provided
    const validatedAddOns = [];
    if (Array.isArray(addOns)) {
      for (const addOn of addOns) {
        if (!addOn.name || addOn.price === undefined) {
          return NextResponse.json(
            { error: 'Add-on must have name and price' },
            { status: 400 }
          );
        }

        const addOnPriceValidation = validatePrice(addOn.price);
        if (!addOnPriceValidation.valid) {
          return NextResponse.json(
            { error: `Add-on price error: ${addOnPriceValidation.error}` },
            { status: 400 }
          );
        }

        validatedAddOns.push({
          id: addOn.id || generateId('addon'),
          name: addOn.name.trim(),
          price: parseFloat(addOn.price),
          description: (addOn.description || '').trim(),
        });
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

    // Process included items
    const processedIncludedItems = Array.isArray(includedItems)
      ? includedItems.filter(item => item && item.trim()).map(item => item.trim())
      : [];

    // Update party
    const parties = getPartiesFromStorage();
    const partyIndex = parties.findIndex(p => p.id === id);

    if (partyIndex === -1) {
      return NextResponse.json(
        { error: 'Party not found' },
        { status: 404 }
      );
    }

    const updatedParty: PartyProduct = {
      ...parties[partyIndex],
      name: name.trim(),
      basePrice: parseFloat(basePrice),
      capacity: parseInt(capacity),
      duration: parseInt(duration),
      includedItems: processedIncludedItems,
      addOns: validatedAddOns,
      description: (body.description || '').trim(),
      stripePurchaseLink: stripePurchaseLink.trim(),
      isActive: body.isActive ?? parties[partyIndex].isActive,
      updatedAt: new Date().toISOString(),
    };

    parties[partyIndex] = updatedParty;
    savePartiesToStorage(parties);

    return NextResponse.json({ party: updatedParty }, { status: 200 });
  } catch (error) {
    console.error('Error updating party:', error);
    return NextResponse.json(
      { error: 'Failed to update party' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/parties
 * Delete a party (staff only)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Party ID is required' },
        { status: 400 }
      );
    }

    // Delete from localStorage (in production, delete from database)
    const parties = getPartiesFromStorage();
    const filteredParties = parties.filter(p => p.id !== id);

    if (filteredParties.length === parties.length) {
      return NextResponse.json(
        { error: 'Party not found' },
        { status: 404 }
      );
    }

    savePartiesToStorage(filteredParties);

    return NextResponse.json({ success: true, id }, { status: 200 });
  } catch (error) {
    console.error('Error deleting party:', error);
    return NextResponse.json(
      { error: 'Failed to delete party' },
      { status: 500 }
    );
  }
}

