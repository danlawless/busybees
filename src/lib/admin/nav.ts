import type { LucideIcon } from 'lucide-react';
import {
  Sun, MonitorSmartphone, Clock, PartyPopper, CalendarDays, Moon, UsersRound,
  Users, BadgeCheck, Ticket, CreditCard, Gift, Sparkles, TicketPercent, HeartHandshake,
  Mail, Megaphone, DollarSign, BarChart3, Package, PenSquare, Settings, Store, BookOpen,
  UserRound, Lock,
} from 'lucide-react';

export type Level = 'staff' | 'admin';

export type AdminView =
  | 'dashboard' | 'customers' | 'sales' | 'sessions' | 'marketing' | 'newsletter'
  | 'passes' | 'parties' | 'products' | 'gift-cards' | 'coupons' | 'groups'
  | 'monthly-members' | 'punch-cards' | 'announcements' | 'after-dark' | 'events' | 'settings';

export type NavItem = { id: string; label: string; href: string; icon: LucideIcon; level: Level; external?: boolean };
export type NavGroup = { id: string; label: string; icon: LucideIcon; items: NavItem[] };

export const NAV: NavGroup[] = [
  { id: 'front-desk', label: 'Front Desk', icon: Store, items: [
    { id: 'today', label: 'Today', href: '/admin', icon: Sun, level: 'staff' },
    { id: 'pos', label: 'Open POS', href: '/pos', icon: MonitorSmartphone, level: 'staff', external: true },
    { id: 'sessions', label: 'Sessions', href: '/admin/sessions', icon: Clock, level: 'staff' },
  ]},
  { id: 'bookings', label: 'Bookings', icon: BookOpen, items: [
    { id: 'parties', label: 'Parties', href: '/admin/parties', icon: PartyPopper, level: 'staff' },
    { id: 'events', label: 'Events', href: '/admin/events', icon: CalendarDays, level: 'staff' },
    { id: 'after-dark', label: 'After Dark', href: '/admin/after-dark', icon: Moon, level: 'staff' },
    { id: 'groups', label: 'Groups', href: '/admin/groups', icon: UsersRound, level: 'staff' },
  ]},
  { id: 'customers', label: 'Customers', icon: UserRound, items: [
    { id: 'customers', label: 'Customers', href: '/admin/customers', icon: Users, level: 'staff' },
    { id: 'members', label: 'Monthly Members', href: '/admin/members', icon: BadgeCheck, level: 'staff' },
    { id: 'passes', label: 'Passes', href: '/admin/passes', icon: Ticket, level: 'staff' },
    { id: 'punch-cards', label: 'Punch Cards', href: '/admin/punch-cards', icon: CreditCard, level: 'staff' },
    { id: 'gift-cards', label: 'Gift Cards', href: '/admin/gift-cards', icon: Gift, level: 'staff' },
  ]},
  { id: 'marketing', label: 'Marketing', icon: Megaphone, items: [
    { id: 'specials', label: 'Specials', href: '/admin/specials', icon: Sparkles, level: 'staff' },
    { id: 'coupons', label: 'Coupons', href: '/admin/coupons', icon: TicketPercent, level: 'staff' },
    { id: 'discounts', label: 'Sibling Discounts', href: '/admin/discounts', icon: HeartHandshake, level: 'staff' },
    { id: 'newsletter', label: 'Newsletter', href: '/admin/newsletter', icon: Mail, level: 'staff' },
    { id: 'announcements', label: 'Announcements', href: '/admin/announcements', icon: Megaphone, level: 'staff' },
  ]},
  { id: 'owner', label: 'Owner', icon: Lock, items: [
    { id: 'sales', label: 'Sales', href: '/admin/sales', icon: DollarSign, level: 'admin' },
    { id: 'reports', label: 'Reports', href: '/admin/reports', icon: BarChart3, level: 'admin' },
    { id: 'products', label: 'Products', href: '/admin/products', icon: Package, level: 'admin' },
    { id: 'editor', label: 'Website Editor', href: '/editor', icon: PenSquare, level: 'admin', external: true },
    { id: 'settings', label: 'Settings', href: '/admin/settings', icon: Settings, level: 'admin' },
  ]},
];

/** Route slug under /admin → AdminPanel view, for views not yet extracted (Plan 2 shrinks this). */
export const BRIDGED_VIEWS: Record<string, AdminView> = {
  sessions: 'sessions',
  groups: 'groups',
  customers: 'customers',
  members: 'monthly-members',
  passes: 'passes',
  'punch-cards': 'punch-cards',
  'gift-cards': 'gift-cards',
  specials: 'marketing',
  coupons: 'coupons',
  newsletter: 'newsletter',
  announcements: 'announcements',
  sales: 'sales',
  products: 'products',
  settings: 'settings',
};

const ALL_ITEMS = NAV.flatMap(g => g.items);

function matches(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + '/');
}

export function levelForPath(pathname: string): Level {
  // '/admin' matches every admin path, so it must only win for the exact root.
  if (pathname === '/admin' || pathname === '/admin/') return 'staff';
  const hit = ALL_ITEMS
    .filter(i => i.href !== '/admin' && matches(pathname, i.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return hit ? hit.level : 'admin';
}

export function navFor(level: Level) {
  return NAV.map(g => ({
    ...g,
    items: g.items.map(i => ({ ...i, locked: i.level === 'admin' && level !== 'admin' })),
  }));
}

export function roleToLevel(role: string | null | undefined): Level | null {
  return role === 'admin' ? 'admin' : role === 'staff' ? 'staff' : null;
}

export function safeNext(to: string | null | undefined): string {
  if (!to || to.startsWith('//')) return '/admin';
  return to === '/admin' || to.startsWith('/admin/') ? to : '/admin';
}
