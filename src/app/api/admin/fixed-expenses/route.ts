/**
 * API Route: Fixed Expenses CRUD
 * GET - List all fixed expenses
 * POST - Create a new fixed expense
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const CreateExpenseSchema = z.object({
  category: z.string().min(1),
  name: z.string().min(1),
  amount: z.number().positive(),
  effective_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  effective_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  notes: z.string().optional(),
});

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('fixed_expenses')
      .select('*')
      .order('effective_from', { ascending: false });

    if (error) {
      logger.error({ error }, 'Failed to fetch fixed expenses');
      return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
    }

    return NextResponse.json({ expenses: data || [] });
  } catch (error) {
    logger.error({ error }, 'Fixed expenses route error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateExpenseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('fixed_expenses')
      .insert({
        category: parsed.data.category,
        name: parsed.data.name,
        amount: parsed.data.amount,
        effective_from: parsed.data.effective_from,
        effective_to: parsed.data.effective_to || null,
        notes: parsed.data.notes || null,
      })
      .select()
      .single();

    if (error) {
      logger.error({ error }, 'Failed to create fixed expense');
      return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
    }

    return NextResponse.json({ expense: data }, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Fixed expenses create error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
