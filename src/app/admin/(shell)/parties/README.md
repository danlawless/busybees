# Admin Party Management Panel

Comprehensive admin interface for managing party bookings and packages.

## Location

`/admin/parties` - Main admin party management page

## Features

### 1. Party Bookings Management
- **View all bookings** with comprehensive details
- **Filter by**:
  - Status (pending, confirmed, cancelled, done)
  - Party type (private, semi-private)
  - Date range (upcoming, past, custom)
  - Search (customer name, email, phone, child name)
- **Quick actions**:
  - Confirm pending bookings
  - Cancel bookings
  - Mark as done (party has occurred)
- **Display information**:
  - Date and time
  - Customer contact info
  - Party details (child name/age, package, type, guest count)
  - Pricing breakdown
  - Payment status
  - Notes

### 2. Statistics Dashboard
- Total bookings count
- Pending bookings
- Confirmed bookings
- Upcoming parties
- Total revenue (excluding cancelled)

### 3. Party Packages Configuration
- View all package tiers (Queen Bee, Worker Bee, Basic Bee)
- Display pricing for semi-private and private parties
- Show max guests, duration, and features
- Note: Currently read-only from code configuration

### 4. Calendar View
- Placeholder for future calendar visualization
- Will show booked slots with color-coding

## API Routes

### GET `/api/admin/party-bookings`
List all party bookings with optional filters.

**Query Parameters:**
- `status` - Filter by booking status
- `partyType` - Filter by party type
- `startDate` - Filter by start date (inclusive)
- `endDate` - Filter by end date (inclusive)
- `search` - Search in customer/child names, email, phone

**Authentication:** Requires admin or staff role

### PATCH `/api/admin/party-bookings/[id]`
Update a party booking's status or details.

**Body:**
```json
{
  "status": "confirmed" | "pending" | "cancelled" | "done",
  "notes": "Optional notes",
  "party_date": "YYYY-MM-DD",
  "start_time": "HH:MM",
  "end_time": "HH:MM"
}
```

**Authentication:** Requires admin or staff role

### GET `/api/admin/party-packages`
Get party package configuration.

**Authentication:** Requires admin or staff role

### PUT `/api/admin/party-packages`
Update party package configuration (validation only).

**Body:** Complete package configuration object

**Note:** Currently validates data structure only. Updates require code deployment.

## Authentication

- Protected by middleware at `/middleware.ts`
- Requires authenticated user with `admin` or `staff` role
- Redirects to `/auth/staff` if not authenticated

## Design System

- Uses hexagonal/honeycomb design patterns
- Pastel yellow (#FCD34D) and charcoal (#1F2937) color scheme
- Framer Motion animations
- Tailwind CSS 4

## Future Enhancements

1. **Calendar View**: Visual calendar with drag-and-drop booking management
2. **Database-driven package config**: Store pricing in database for dynamic updates
3. **Email notifications**: Auto-send confirmation emails
4. **Export bookings**: Download as CSV/PDF
5. **Analytics**: Revenue trends, popular packages, peak times
6. **Conflict detection**: Warn about double-bookings
7. **Customer history**: Link to customer profiles
8. **Refund management**: Handle cancellations and refunds

## Related Files

- `/src/lib/services/party-bookings.ts` - Service layer for booking operations
- `/src/lib/validations/party-booking.ts` - Validation schemas and pricing config
- `/src/lib/supabase/database.types.ts` - Database type definitions
- `/src/components/admin/` - Reusable admin components
