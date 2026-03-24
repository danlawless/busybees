'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { WaiverModal } from '@/components/ui/WaiverModal';

interface GroupChild {
  id: string;
  name: string;
  birthdate: string;
  waiver_signed: boolean;
  waiver_signed_date: string | null;
  created_at: string;
}

interface GroupSummary {
  id: string;
  groupName: string;
  contactName: string;
  phone: string;
  email: string | null;
  childCount: number;
  waiversSigned: number;
  waiversPending: number;
  createdAt: string;
}

interface SavedCard {
  id: string;
  stripe_payment_method_id: string;
  last4: string;
  brand: string;
  expiry_month: number;
  expiry_year: number;
  is_default: boolean;
}

const PRICE_AGE_2_PLUS = 12;
const PRICE_UNDER_2 = 5;

interface GroupsStats {
  total: number;
  totalChildren: number;
  waiversPending: number;
}

function calculateAge(birthdate: string): number {
  const birth = new Date(birthdate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function getChildPrice(birthdate: string): number {
  return calculateAge(birthdate) >= 2 ? PRICE_AGE_2_PLUS : PRICE_UNDER_2;
}

export function GroupsManager() {
  // List view state
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [stats, setStats] = useState<GroupsStats>({ total: 0, totalChildren: 0, waiversPending: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Create group form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({ group_name: '', contact_name: '', phone: '', email: '' });
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  // Detail view state
  const [selectedGroup, setSelectedGroup] = useState<GroupSummary | null>(null);
  const [children, setChildren] = useState<GroupChild[]>([]);
  const [childrenLoading, setChildrenLoading] = useState(false);

  // Add child form state
  const [showAddChild, setShowAddChild] = useState(false);
  const [childForm, setChildForm] = useState({ firstName: '', lastName: '', birthdate: '' });
  const [addChildError, setAddChildError] = useState('');
  const [addingChild, setAddingChild] = useState(false);

  // Waiver state
  const [signingWaiver, setSigningWaiver] = useState<string | null>(null);
  const [viewingWaiverChild, setViewingWaiverChild] = useState<GroupChild | null>(null);

  // Delete state
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  // Group delete state
  const [confirmingGroupDelete, setConfirmingGroupDelete] = useState<string | null>(null);
  const [deletingGroup, setDeletingGroup] = useState(false);

  // Invoice state
  const [invoiceGenerated, setInvoiceGenerated] = useState(false);

  // Group edit state
  const [editingGroup, setEditingGroup] = useState(false);
  const [editForm, setEditForm] = useState({ group_name: '', contact_name: '', phone: '', email: '' });
  const [savingGroup, setSavingGroup] = useState(false);

  // Active children + payment state
  const [activeChildIds, setActiveChildIds] = useState<Set<string>>(new Set());
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<{ amount: number; childCount: number; cardLast4: string } | null>(null);
  const [paymentError, setPaymentError] = useState('');

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/groups');
      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups || []);
        setStats(data.stats || { total: 0, totalChildren: 0, waiversPending: 0 });
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchChildren = async (groupId: string) => {
    setChildrenLoading(true);
    try {
      const response = await fetch(`/api/admin/groups/${groupId}/children`);
      if (response.ok) {
        const data = await response.json();
        setChildren(data.children || []);
      }
    } catch (error) {
      console.error('Error fetching children:', error);
    } finally {
      setChildrenLoading(false);
    }
  };

  const fetchSavedCards = async (groupId: string) => {
    setCardsLoading(true);
    try {
      const response = await fetch(`/api/admin/groups/${groupId}/payment`);
      if (response.ok) {
        const data = await response.json();
        setSavedCards(data.savedCards || []);
        // Auto-select default card
        const defaultCard = (data.savedCards || []).find((c: SavedCard) => c.is_default);
        if (defaultCard) setSelectedCardId(defaultCard.stripe_payment_method_id);
      }
    } catch (error) {
      console.error('Error fetching saved cards:', error);
    } finally {
      setCardsLoading(false);
    }
  };

  const toggleChildActive = (childId: string) => {
    setActiveChildIds(prev => {
      const next = new Set(prev);
      if (next.has(childId)) {
        next.delete(childId);
      } else {
        next.add(childId);
      }
      return next;
    });
    // Clear payment success when selection changes
    setPaymentSuccess(null);
    setPaymentError('');
  };

  const selectAllChildren = () => {
    if (activeChildIds.size === children.length) {
      setActiveChildIds(new Set());
    } else {
      setActiveChildIds(new Set(children.map(c => c.id)));
    }
    setPaymentSuccess(null);
    setPaymentError('');
  };

  const handleProcessPayment = async () => {
    if (!selectedGroup || !selectedCardId || activeChildIds.size === 0) return;
    setProcessingPayment(true);
    setPaymentError('');
    setPaymentSuccess(null);
    try {
      const response = await fetch(`/api/admin/groups/${selectedGroup.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_method_id: selectedCardId,
          active_child_ids: Array.from(activeChildIds),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setPaymentError(data.error || 'Payment failed');
        return;
      }
      setPaymentSuccess({
        amount: data.payment.amount,
        childCount: data.payment.childCount,
        cardLast4: data.payment.cardLast4,
      });
    } catch {
      setPaymentError('Network error — payment could not be processed');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleGenerateInvoice = () => {
    if (!selectedGroup || activeChildIds.size === 0) return;

    const activeChildren = children.filter(c => activeChildIds.has(c.id));
    const over2 = activeChildren.filter(c => calculateAge(c.birthdate) >= 2);
    const under2 = activeChildren.filter(c => calculateAge(c.birthdate) < 2);
    const total = (over2.length * PRICE_AGE_2_PLUS) + (under2.length * PRICE_UNDER_2);
    const today = new Date();
    const invoiceNum = `INV-${selectedGroup.phone.slice(-4)}-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const formattedDate = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + 30);
    const formattedDueDate = dueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${invoiceNum}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 700px; margin: 0 auto; padding: 40px 20px; color: #1f2937; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #f59e0b; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { font-size: 28px; color: #d97706; margin: 0; }
          .header .company { text-align: right; font-size: 13px; color: #6b7280; }
          .meta { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .meta-block { font-size: 13px; }
          .meta-block strong { display: block; font-size: 11px; text-transform: uppercase; color: #9ca3af; letter-spacing: 0.5px; margin-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background: #fffbeb; text-align: left; padding: 10px 12px; font-size: 11px; text-transform: uppercase; color: #92400e; letter-spacing: 0.5px; border-bottom: 2px solid #f59e0b; }
          td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
          .total-row td { border-top: 2px solid #1f2937; font-weight: 700; font-size: 16px; padding-top: 12px; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center; }
          .badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
          @media print { body { padding: 20px; } .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="no-print" style="text-align: right; margin-bottom: 20px;">
          <button onclick="window.print()" style="background: #d97706; color: white; border: none; padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer;">Download / Print Invoice</button>
        </div>
        <div class="header">
          <div>
            <h1>INVOICE</h1>
            <p style="margin: 4px 0 0; font-size: 14px; color: #6b7280;">${invoiceNum}</p>
          </div>
          <div class="company">
            <p style="font-weight: 700; font-size: 16px; color: #1f2937; margin: 0;">Busy Bees Indoor Play Center</p>
            <p style="margin: 2px 0;">busybeesipc.com</p>
            <p style="margin: 2px 0;">info@busybeesipc.com</p>
          </div>
        </div>
        <div class="meta">
          <div class="meta-block">
            <strong>Bill To</strong>
            <p style="margin: 0; font-weight: 600;">${selectedGroup.groupName}</p>
            <p style="margin: 2px 0;">Attn: ${selectedGroup.contactName}</p>
            ${selectedGroup.email ? `<p style="margin: 2px 0;">${selectedGroup.email}</p>` : ''}
            <p style="margin: 2px 0;">${selectedGroup.phone}</p>
          </div>
          <div class="meta-block" style="text-align: right;">
            <strong>Invoice Date</strong>
            <p style="margin: 0;">${formattedDate}</p>
            <strong style="margin-top: 10px;">Due Date</strong>
            <p style="margin: 0;">${formattedDueDate}</p>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Rate</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${over2.length > 0 ? `
            <tr>
              <td>Group Visit — Children Ages 2+</td>
              <td style="text-align: center;">${over2.length}</td>
              <td style="text-align: right;">$${PRICE_AGE_2_PLUS}.00</td>
              <td style="text-align: right;">$${(over2.length * PRICE_AGE_2_PLUS).toFixed(2)}</td>
            </tr>` : ''}
            ${under2.length > 0 ? `
            <tr>
              <td>Group Visit — Children Under 2</td>
              <td style="text-align: center;">${under2.length}</td>
              <td style="text-align: right;">$${PRICE_UNDER_2}.00</td>
              <td style="text-align: right;">$${(under2.length * PRICE_UNDER_2).toFixed(2)}</td>
            </tr>` : ''}
            <tr class="total-row">
              <td colspan="3">Total</td>
              <td style="text-align: right;">$${total.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
        <div style="background: #fffbeb; border: 1px solid #fbbf24; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 13px; color: #92400e;">
            <strong>Children attending (${activeChildren.length}):</strong>
            ${activeChildren.map(c => `${c.name} (age ${calculateAge(c.birthdate)})`).join(', ')}
          </p>
        </div>
        <div style="background: #f9fafb; border-radius: 8px; padding: 16px;">
          <p style="margin: 0 0 4px; font-size: 13px; font-weight: 600; color: #374151;">Payment Instructions</p>
          <p style="margin: 0; font-size: 13px; color: #6b7280;">
            Please make payment within 30 days. For questions, contact info@busybeesipc.com.
          </p>
        </div>
        <div class="footer">
          <p>Busy Bees Indoor Play Center &middot; busybeesipc.com</p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    setInvoiceGenerated(true);
  };

  const [linkSuccess, setLinkSuccess] = useState('');

  const handleCreateGroup = async () => {
    setCreateError('');
    setLinkSuccess('');
    setCreating(true);
    try {
      const response = await fetch('/api/admin/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const data = await response.json();
      if (!response.ok) {
        setCreateError(data.error || 'Failed to create group');
        return;
      }
      setGroups(prev => [data.group, ...prev]);
      setStats(prev => ({ ...prev, total: prev.total + 1 }));
      setShowCreateForm(false);
      setCreateForm({ group_name: '', contact_name: '', phone: '', email: '' });
      if (data.linked) {
        setLinkSuccess(`Existing account for ${data.group.contactName} has been linked as "${data.group.groupName}". They can now manage group children from their My Account.`);
        setTimeout(() => setLinkSuccess(''), 8000);
      }
    } catch {
      setCreateError('Network error');
    } finally {
      setCreating(false);
    }
  };

  const handleAddChild = async () => {
    if (!selectedGroup) return;
    setAddChildError('');
    setAddingChild(true);
    try {
      const response = await fetch(`/api/admin/groups/${selectedGroup.id}/children`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `${childForm.firstName.trim()} ${childForm.lastName.trim()}`, birthdate: childForm.birthdate }),
      });
      const data = await response.json();
      if (!response.ok) {
        setAddChildError(data.error || 'Failed to add child');
        return;
      }
      setChildren(prev => [...prev, data.child]);
      setShowAddChild(false);
      setChildForm({ firstName: '', lastName: '', birthdate: '' });
      // Update group summary
      setGroups(prev => prev.map(g =>
        g.id === selectedGroup.id
          ? { ...g, childCount: g.childCount + 1, waiversPending: g.waiversPending + 1 }
          : g
      ));
      setStats(prev => ({ ...prev, totalChildren: prev.totalChildren + 1, waiversPending: prev.waiversPending + 1 }));
    } catch {
      setAddChildError('Network error');
    } finally {
      setAddingChild(false);
    }
  };

  const handleSignWaiver = async (childId: string) => {
    if (!selectedGroup) return;
    setSigningWaiver(childId);
    try {
      const response = await fetch(`/api/admin/groups/${selectedGroup.id}/children/${childId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waiver_signed: true }),
      });
      if (response.ok) {
        setChildren(prev => prev.map(c =>
          c.id === childId ? { ...c, waiver_signed: true, waiver_signed_date: new Date().toISOString() } : c
        ));
        setGroups(prev => prev.map(g =>
          g.id === selectedGroup.id
            ? { ...g, waiversSigned: g.waiversSigned + 1, waiversPending: g.waiversPending - 1 }
            : g
        ));
        setStats(prev => ({ ...prev, waiversPending: prev.waiversPending - 1 }));
      }
    } catch (error) {
      console.error('Error signing waiver:', error);
    } finally {
      setSigningWaiver(null);
    }
  };

  const handleRemoveChild = async (childId: string) => {
    if (!selectedGroup) return;
    try {
      const response = await fetch(`/api/admin/groups/${selectedGroup.id}/children/${childId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        const removed = children.find(c => c.id === childId);
        setChildren(prev => prev.filter(c => c.id !== childId));
        setGroups(prev => prev.map(g =>
          g.id === selectedGroup.id
            ? {
              ...g,
              childCount: g.childCount - 1,
              waiversSigned: removed?.waiver_signed ? g.waiversSigned - 1 : g.waiversSigned,
              waiversPending: !removed?.waiver_signed ? g.waiversPending - 1 : g.waiversPending,
            }
            : g
        ));
        setConfirmingDelete(null);
      }
    } catch (error) {
      console.error('Error removing child:', error);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    setDeletingGroup(true);
    try {
      const response = await fetch(`/api/admin/groups/${groupId}`, { method: 'DELETE' });
      if (response.ok) {
        setGroups(prev => prev.filter(g => g.id !== groupId));
        setConfirmingGroupDelete(null);
        setSelectedGroup(null);
      } else {
        const data = await response.json();
        console.error('Failed to delete group:', data.error);
      }
    } catch (error) {
      console.error('Error deleting group:', error);
    } finally {
      setDeletingGroup(false);
    }
  };

  const handleSaveGroup = async () => {
    if (!selectedGroup) return;
    setSavingGroup(true);
    try {
      const response = await fetch(`/api/admin/groups/${selectedGroup.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (response.ok) {
        const updated = {
          ...selectedGroup,
          groupName: editForm.group_name,
          contactName: editForm.contact_name,
          phone: editForm.phone,
          email: editForm.email || null,
        };
        setSelectedGroup(updated);
        setGroups(prev => prev.map(g => g.id === updated.id ? updated : g));
        setEditingGroup(false);
      } else {
        const data = await response.json();
        console.error('Failed to update group:', data.error);
      }
    } catch (error) {
      console.error('Error updating group:', error);
    } finally {
      setSavingGroup(false);
    }
  };

  const openGroupDetail = (group: GroupSummary) => {
    setSelectedGroup(group);
    fetchChildren(group.id);
    fetchSavedCards(group.id);
    setShowAddChild(false);
    setConfirmingDelete(null);
    setActiveChildIds(new Set());
    setPaymentSuccess(null);
    setPaymentError('');
  };

  const filteredGroups = groups.filter(g =>
    searchTerm === '' ||
    g.groupName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.phone.includes(searchTerm)
  );

  // Detail view
  if (selectedGroup) {
    return (
      <div className="space-y-6">
        {/* Back button */}
        <Button onClick={() => setSelectedGroup(null)} variant="outline" size="sm">
          ← Back to Groups
        </Button>

        {/* Group Header */}
        <Card className="p-6">
          {editingGroup ? (
            <div>
              <h3 className="text-lg font-semibold mb-4">Edit Group Info</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                  <input
                    type="text"
                    value={editForm.group_name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, group_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={editForm.contact_name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, contact_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={handleSaveGroup}
                  disabled={savingGroup || !editForm.group_name || !editForm.contact_name || !editForm.phone}
                  size="sm"
                >
                  {savingGroup ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button onClick={() => setEditingGroup(false)} variant="outline" size="sm">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedGroup.groupName}</h2>
                <p className="text-gray-600 mt-1">Contact: {selectedGroup.contactName}</p>
                <p className="text-sm text-gray-500">{selectedGroup.phone} {selectedGroup.email ? `• ${selectedGroup.email}` : ''}</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm text-gray-600">{children.length} children</p>
                <Button
                  onClick={() => {
                    setEditForm({
                      group_name: selectedGroup.groupName,
                      contact_name: selectedGroup.contactName,
                      phone: selectedGroup.phone,
                      email: selectedGroup.email || '',
                    });
                    setEditingGroup(true);
                  }}
                  variant="outline"
                  size="sm"
                >
                  ✏️ Edit
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Add Child */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Children ({children.length})</h3>
            <Button onClick={() => setShowAddChild(!showAddChild)} size="sm">
              {showAddChild ? 'Cancel' : '+ Add Child'}
            </Button>
          </div>

          {showAddChild && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={childForm.firstName}
                    onChange={(e) => setChildForm(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="First name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={childForm.lastName}
                    onChange={(e) => setChildForm(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Last name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Birthdate</label>
                  <input
                    type="date"
                    value={childForm.birthdate}
                    onChange={(e) => setChildForm(prev => ({ ...prev, birthdate: e.target.value }))}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
              {addChildError && <p className="text-red-600 text-sm mt-2">{addChildError}</p>}
              <Button
                onClick={handleAddChild}
                disabled={addingChild || !childForm.firstName || !childForm.lastName || !childForm.birthdate}
                size="sm"
                className="mt-3"
              >
                {addingChild ? 'Adding...' : 'Add Child'}
              </Button>
            </div>
          )}

          {/* Children List */}
          {childrenLoading ? (
            <p className="text-gray-500 text-center py-8">Loading children...</p>
          ) : children.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-center py-3 px-2 font-medium text-gray-600">
                      <button
                        onClick={selectAllChildren}
                        className="text-xs text-amber-600 hover:text-amber-800 underline"
                      >
                        {activeChildIds.size === children.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">Name</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">Birthdate</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">Age</th>
                    <th className="text-center py-3 px-2 font-medium text-gray-600">Waiver</th>
                    <th className="text-right py-3 px-2 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {children.map((child) => {
                    const isActive = activeChildIds.has(child.id);
                    return (
                      <tr key={child.id} className={`border-b border-gray-100 hover:bg-gray-50 ${isActive ? 'bg-amber-50' : ''}`}>
                        <td className="py-3 px-2 text-center">
                          <input
                            type="checkbox"
                            checked={isActive}
                            onChange={() => toggleChildActive(child.id)}
                            className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-2 font-medium text-gray-900">{child.name}</td>
                        <td className="py-3 px-2 text-gray-600">
                          {new Date(child.birthdate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-2 text-gray-600">{calculateAge(child.birthdate)}</td>
                        <td className="py-3 px-2 text-center">
                          {child.waiver_signed ? (
                            <button
                              onClick={() => setViewingWaiverChild(child)}
                              className="inline-block px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full hover:bg-green-200 cursor-pointer transition-colors"
                            >
                              Signed ↗
                            </button>
                          ) : (
                            <Button
                              onClick={() => setViewingWaiverChild(child)}
                              size="sm"
                              variant="outline"
                              className="text-xs"
                            >
                              Sign Waiver
                            </Button>
                          )}
                        </td>
                        <td className="py-3 px-2 text-right">
                          {confirmingDelete === child.id ? (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                onClick={() => handleRemoveChild(child.id)}
                                size="sm"
                                variant="outline"
                                className="text-xs text-red-600 border-red-300 hover:bg-red-50"
                              >
                                Confirm
                              </Button>
                              <Button
                                onClick={() => setConfirmingDelete(null)}
                                size="sm"
                                variant="outline"
                                className="text-xs"
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              onClick={() => setConfirmingDelete(child.id)}
                              size="sm"
                              variant="outline"
                              className="text-xs text-red-600 hover:bg-red-50"
                            >
                              Remove
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No children added yet</p>
          )}
        </Card>

        {/* Waiver Modal */}
        <WaiverModal
          isOpen={viewingWaiverChild !== null}
          onClose={() => setViewingWaiverChild(null)}
          childName={viewingWaiverChild?.name}
          onAgree={viewingWaiverChild && !viewingWaiverChild.waiver_signed ? () => {
            handleSignWaiver(viewingWaiverChild.id);
            setViewingWaiverChild(null);
          } : undefined}
          isSubmitting={signingWaiver !== null}
        />

        {/* Payment Section */}
        {children.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Payment</h3>

            {/* Tally */}
            {(() => {
              const activeChildren = children.filter(c => activeChildIds.has(c.id));
              const over2Count = activeChildren.filter(c => calculateAge(c.birthdate) >= 2).length;
              const under2Count = activeChildren.filter(c => calculateAge(c.birthdate) < 2).length;
              const groupTotal = activeChildren.reduce((sum, c) => sum + getChildPrice(c.birthdate), 0);

              return (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  {over2Count > 0 && (
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-600">Ages 2+ ({over2Count} x ${PRICE_AGE_2_PLUS})</span>
                      <span className="font-semibold">${(over2Count * PRICE_AGE_2_PLUS).toFixed(2)}</span>
                    </div>
                  )}
                  {under2Count > 0 && (
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-600">Under 2 ({under2Count} x ${PRICE_UNDER_2})</span>
                      <span className="font-semibold">${(under2Count * PRICE_UNDER_2).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-300 pt-2 mt-2 flex items-center justify-between">
                    <span className="text-lg font-bold text-gray-900">Total</span>
                    <span className="text-lg font-bold text-gray-900">
                      ${groupTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Card Selection */}
            {cardsLoading ? (
              <p className="text-gray-500 text-sm">Loading payment methods...</p>
            ) : savedCards.length > 0 ? (
              <div className="space-y-2 mb-4">
                <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                {savedCards.map(card => (
                  <label
                    key={card.id}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedCardId === card.stripe_payment_method_id
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_card"
                      checked={selectedCardId === card.stripe_payment_method_id}
                      onChange={() => setSelectedCardId(card.stripe_payment_method_id)}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-sm font-medium text-gray-900">
                      {card.brand.charAt(0).toUpperCase() + card.brand.slice(1)} ****{card.last4}
                    </span>
                    <span className="text-xs text-gray-500">
                      Exp {card.expiry_month}/{card.expiry_year}
                    </span>
                    {card.is_default && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Default</span>
                    )}
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-4">
                No saved cards on file. The group account owner needs to add a payment method first.
              </p>
            )}

            {/* Payment Button */}
            {paymentError && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {paymentError}
              </div>
            )}

            {paymentSuccess ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 font-semibold">Payment Successful!</p>
                <p className="text-sm text-green-700 mt-1">
                  ${paymentSuccess.amount.toFixed(2)} charged for {paymentSuccess.childCount} children
                  (****{paymentSuccess.cardLast4})
                </p>
              </div>
            ) : invoiceGenerated ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-amber-800 font-semibold">Invoice Generated!</p>
                <p className="text-sm text-amber-700 mt-1">
                  The invoice has been opened in a new tab for download/printing.
                </p>
                <button
                  onClick={() => setInvoiceGenerated(false)}
                  className="text-xs text-amber-600 underline mt-2"
                >
                  Dismiss
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <Button
                  onClick={handleProcessPayment}
                  disabled={processingPayment || activeChildIds.size === 0 || !selectedCardId}
                  className="w-full"
                >
                  {processingPayment
                    ? 'Processing...'
                    : activeChildIds.size === 0
                    ? 'Select children to pay'
                    : `Charge $${children.filter(c => activeChildIds.has(c.id)).reduce((sum, c) => sum + getChildPrice(c.birthdate), 0).toFixed(2)} to Card`
                  }
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white px-3 text-gray-500 uppercase">or</span>
                  </div>
                </div>

                <Button
                  onClick={handleGenerateInvoice}
                  disabled={activeChildIds.size === 0}
                  variant="outline"
                  className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
                >
                  {activeChildIds.size === 0
                    ? 'Select children for invoice'
                    : `Pay with Invoice ($${children.filter(c => activeChildIds.has(c.id)).reduce((sum, c) => sum + getChildPrice(c.birthdate), 0).toFixed(2)})`
                  }
                </Button>
              </div>
            )}
          </Card>
        )}
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      {linkSuccess && (
        <Card className="p-4 border-green-300 bg-green-50">
          <p className="text-green-800 font-medium">✅ {linkSuccess}</p>
        </Card>
      )}
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <span className="text-xl">🏫</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Groups</p>
              <p className="text-xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-xl">👶</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Children</p>
              <p className="text-xl font-bold text-gray-900">{stats.totalChildren}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-xl">📋</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Waivers Pending</p>
              <p className="text-xl font-bold text-gray-900">{stats.waiversPending}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search + Create */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search by group name, contact, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <Button onClick={() => setShowCreateForm(!showCreateForm)} size="sm">
            {showCreateForm ? 'Cancel' : '+ New Group'}
          </Button>
          <Button onClick={fetchGroups} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      </Card>

      {/* Create Group Form */}
      {showCreateForm && (
        <Card className="p-6 border-2 border-amber-200 bg-amber-50">
          <h3 className="text-lg font-semibold text-amber-800 mb-4">Create New Group</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name *</label>
              <input
                type="text"
                value={createForm.group_name}
                onChange={(e) => setCreateForm(prev => ({ ...prev, group_name: e.target.value }))}
                placeholder="e.g., Sunshine Daycare"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person *</label>
              <input
                type="text"
                value={createForm.contact_name}
                onChange={(e) => setCreateForm(prev => ({ ...prev, contact_name: e.target.value }))}
                placeholder="Full name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
              <input
                type="tel"
                value={createForm.phone}
                onChange={(e) => setCreateForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Phone number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Optional"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
          {createError && <p className="text-red-600 text-sm mt-3">{createError}</p>}
          <Button
            onClick={handleCreateGroup}
            disabled={creating || !createForm.group_name || !createForm.contact_name || !createForm.phone}
            className="mt-4"
          >
            {creating ? 'Creating...' : 'Create Group'}
          </Button>
        </Card>
      )}

      {/* Groups List */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Groups ({filteredGroups.length})</h3>
        {loading ? (
          <p className="text-gray-500 text-center py-8">Loading groups...</p>
        ) : filteredGroups.length > 0 ? (
          <div className="space-y-3">
            {filteredGroups.map((group) => (
              <div key={group.id} className="relative">
                {confirmingGroupDelete === group.id ? (
                  <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">
                      Delete <strong>{group.groupName}</strong> and all {group.childCount} children?
                    </p>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setConfirmingGroupDelete(null)}
                        variant="outline"
                        size="sm"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => handleDeleteGroup(group.id)}
                        size="sm"
                        disabled={deletingGroup}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        {deletingGroup ? 'Deleting...' : 'Confirm Delete'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => openGroupDetail(group)}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">{group.groupName}</p>
                      <p className="text-sm text-gray-600">
                        Contact: {group.contactName} • {group.phone}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{group.childCount} children</p>
                        <div className="flex items-center gap-2 text-xs">
                          {group.waiversPending > 0 ? (
                            <span className="text-red-600">{group.waiversPending} waivers pending</span>
                          ) : group.childCount > 0 ? (
                            <span className="text-green-600">All waivers signed</span>
                          ) : (
                            <span className="text-gray-400">No children</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmingGroupDelete(group.id);
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete group"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            {searchTerm ? 'No groups match your search' : 'No groups created yet'}
          </p>
        )}
      </Card>
    </div>
  );
}
