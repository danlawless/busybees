'use client';

/**
 * GroupChildrenManager
 * POS component for staff to search, assign, and manage children for group rate bookings.
 * Handles child search, waiver signing, new child creation, and assignment tracking.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { WaiverModal } from '@/components/ui/WaiverModal';
import {
  Search,
  X,
  Plus,
  Minus,
  UserPlus,
  Check,
  AlertTriangle,
  Users,
  FileText,
  Loader2,
} from 'lucide-react';
import { parseDateString } from '@/lib/utils';

interface SearchResultChild {
  id: string;
  name: string;
  birthdate: string;
  waiver_signed: boolean;
  waiver_signed_date: string | null;
  customer_id: string;
  parent_name: string;
  parent_phone: string;
}

interface AssignedChild {
  id: string;
  name: string;
  birthdate: string;
  waiver_signed: boolean;
  customer_id: string;
  parent_name: string;
  is_new_child: boolean;
}

interface GroupChildrenManagerProps {
  isOpen: boolean;
  onClose: () => void;
  guestCount: number;
  onComplete: (children: AssignedChild[]) => void;
}

function calculateAge(birthdate: string): number {
  const birth = parseDateString(birthdate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function GroupChildrenManager({
  isOpen,
  onClose,
  guestCount,
  onComplete,
}: GroupChildrenManagerProps) {
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultChild[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Assigned children
  const [assignedChildren, setAssignedChildren] = useState<AssignedChild[]>([]);

  // New child form
  const [showNewChildForm, setShowNewChildForm] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const [newChildBirthdate, setNewChildBirthdate] = useState('');
  const [newChildParentPhone, setNewChildParentPhone] = useState('');
  const [newChildSignWaiver, setNewChildSignWaiver] = useState(true);
  const [isCreatingChild, setIsCreatingChild] = useState(false);

  // Waiver modal
  const [showWaiverModal, setShowWaiverModal] = useState(false);
  const [waiverChildId, setWaiverChildId] = useState<string | null>(null);
  const [waiverChildName, setWaiverChildName] = useState<string | undefined>();
  const [isSigningWaiver, setIsSigningWaiver] = useState(false);

  // Debounced search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `/api/admin/children/search?q=${encodeURIComponent(query.trim())}`
        );
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.children || []);
        }
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const isChildAssigned = (childId: string) =>
    assignedChildren.some((c) => c.id === childId);

  const handleAddChild = (child: SearchResultChild) => {
    if (isChildAssigned(child.id)) return;
    if (assignedChildren.length >= guestCount) return;

    setAssignedChildren((prev) => [
      ...prev,
      {
        id: child.id,
        name: child.name,
        birthdate: child.birthdate,
        waiver_signed: child.waiver_signed,
        customer_id: child.customer_id,
        parent_name: child.parent_name,
        is_new_child: false,
      },
    ]);
  };

  const handleRemoveChild = (childId: string) => {
    setAssignedChildren((prev) => prev.filter((c) => c.id !== childId));
  };

  const handleOpenWaiver = (childId: string, childName: string) => {
    setWaiverChildId(childId);
    setWaiverChildName(childName);
    setShowWaiverModal(true);
  };

  const handleSignWaiver = async () => {
    if (!waiverChildId) return;

    setIsSigningWaiver(true);
    try {
      // Find the child to get customer_id
      const child =
        assignedChildren.find((c) => c.id === waiverChildId) ||
        searchResults.find((c) => c.id === waiverChildId);

      if (!child) return;

      const response = await fetch(
        `/api/admin/customers/${child.customer_id}/children/${waiverChildId}/waiver`,
        { method: 'POST' }
      );

      if (response.ok) {
        // Update in assigned children
        setAssignedChildren((prev) =>
          prev.map((c) =>
            c.id === waiverChildId ? { ...c, waiver_signed: true } : c
          )
        );

        // Update in search results
        setSearchResults((prev) =>
          prev.map((c) =>
            c.id === waiverChildId ? { ...c, waiver_signed: true } : c
          )
        );
      }
    } catch (error) {
      console.error('Failed to sign waiver:', error);
    } finally {
      setIsSigningWaiver(false);
      setShowWaiverModal(false);
      setWaiverChildId(null);
      setWaiverChildName(undefined);
    }
  };

  const handleCreateAndAddChild = async () => {
    if (!newChildName.trim() || !newChildBirthdate) return;

    setIsCreatingChild(true);
    try {
      // Find or create customer by phone
      let customerId: string | null = null;

      if (newChildParentPhone.trim()) {
        // Search for existing customer by phone
        const searchResponse = await fetch(
          `/api/admin/customers?phone=${encodeURIComponent(newChildParentPhone.trim())}`
        );
        if (searchResponse.ok) {
          const data = await searchResponse.json();
          if (data.customers && data.customers.length > 0) {
            customerId = data.customers[0].id;
          }
        }
      }

      if (!customerId) {
        // Create a basic customer record if no match found
        // This requires a parent phone for contact purposes
        if (!newChildParentPhone.trim()) {
          alert('Parent phone number is required for new children');
          setIsCreatingChild(false);
          return;
        }

        const createCustomerResponse = await fetch('/api/admin/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `Parent of ${newChildName.trim()}`,
            phone: newChildParentPhone.trim(),
          }),
        });

        if (createCustomerResponse.ok) {
          const customerData = await createCustomerResponse.json();
          customerId = customerData.customer?.id || customerData.id;
        }
      }

      if (!customerId) {
        alert('Failed to find or create customer');
        setIsCreatingChild(false);
        return;
      }

      // Create the child
      const childResponse = await fetch(
        `/api/admin/customers/${customerId}/children`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newChildName.trim(),
            birthdate: newChildBirthdate,
          }),
        }
      );

      if (!childResponse.ok) {
        alert('Failed to create child');
        setIsCreatingChild(false);
        return;
      }

      const childData = await childResponse.json();
      const newChild = childData.child;

      // Sign waiver if requested
      if (newChildSignWaiver && newChild) {
        await fetch(
          `/api/admin/customers/${customerId}/children/${newChild.id}/waiver`,
          { method: 'POST' }
        );
      }

      // Add to assigned children
      if (newChild && assignedChildren.length < guestCount) {
        setAssignedChildren((prev) => [
          ...prev,
          {
            id: newChild.id,
            name: newChild.name,
            birthdate: newChild.birthdate,
            waiver_signed: newChildSignWaiver,
            customer_id: customerId as string,
            parent_name: `Parent of ${newChildName.trim()}`,
            is_new_child: true,
          },
        ]);
      }

      // Reset form
      setNewChildName('');
      setNewChildBirthdate('');
      setNewChildParentPhone('');
      setNewChildSignWaiver(true);
      setShowNewChildForm(false);
    } catch (error) {
      console.error('Failed to create child:', error);
      alert('Failed to create child. Please try again.');
    } finally {
      setIsCreatingChild(false);
    }
  };

  const allWaiversSigned = assignedChildren.every((c) => c.waiver_signed);
  const canProceed =
    assignedChildren.length === guestCount && allWaiversSigned;
  const progress = (assignedChildren.length / guestCount) * 100;

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-honey-100 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-honey-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Assign Children
                  </h2>
                  <p className="text-sm text-gray-600">
                    {assignedChildren.length} of {guestCount} children assigned
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="mt-4 w-full bg-gray-200 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  canProceed ? 'bg-green-500' : 'bg-honey-500'
                }`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>

            {!allWaiversSigned && assignedChildren.length > 0 && (
              <div className="mt-2 flex items-center space-x-1 text-amber-600 text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>
                  {assignedChildren.filter((c) => !c.waiver_signed).length}{' '}
                  children need waivers signed
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Search */}
            <div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search children by name..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-honey-500 focus:border-honey-500 text-gray-900"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
                )}
              </div>

              {/* Search Results */}
              <AnimatePresence>
                {searchResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 border border-gray-200 rounded-xl overflow-hidden"
                  >
                    {searchResults.map((child) => {
                      const age = calculateAge(child.birthdate);
                      const assigned = isChildAssigned(child.id);

                      return (
                        <div
                          key={child.id}
                          className={`flex items-center justify-between p-3 border-b last:border-b-0 ${
                            assigned ? 'bg-green-50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-gray-900">
                                {child.name}
                              </span>
                              <span className="text-sm text-gray-500">
                                (age {age})
                              </span>
                              {child.waiver_signed ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <Check className="w-3 h-3 mr-1" />
                                  Waiver
                                </span>
                              ) : (
                                <button
                                  onClick={() =>
                                    handleOpenWaiver(child.id, child.name)
                                  }
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors"
                                >
                                  <FileText className="w-3 h-3 mr-1" />
                                  Sign Waiver
                                </button>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">
                              Parent: {child.parent_name}
                              {child.parent_phone && ` | ${child.parent_phone}`}
                            </p>
                          </div>

                          <button
                            onClick={() => handleAddChild(child)}
                            disabled={
                              assigned ||
                              assignedChildren.length >= guestCount
                            }
                            className={`ml-3 p-2 rounded-full transition-colors ${
                              assigned
                                ? 'bg-green-100 text-green-600 cursor-default'
                                : assignedChildren.length >= guestCount
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-honey-100 text-honey-600 hover:bg-honey-200'
                            }`}
                            aria-label={assigned ? 'Already added' : 'Add child'}
                          >
                            {assigned ? (
                              <Check className="w-5 h-5" />
                            ) : (
                              <Plus className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Add New Child */}
            <div>
              {!showNewChildForm ? (
                <button
                  onClick={() => setShowNewChildForm(true)}
                  disabled={assignedChildren.length >= guestCount}
                  className="flex items-center space-x-2 text-honey-600 hover:text-honey-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UserPlus className="w-5 h-5" />
                  <span>Add New Child</span>
                </button>
              ) : (
                <Card hover={false} className="border border-honey-200 bg-honey-50">
                  <h4 className="font-semibold text-gray-900 mb-4">
                    New Child
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Child Name
                      </label>
                      <input
                        type="text"
                        value={newChildName}
                        onChange={(e) => setNewChildName(e.target.value)}
                        placeholder="Full name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 focus:border-honey-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        value={newChildBirthdate}
                        onChange={(e) => setNewChildBirthdate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 focus:border-honey-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Parent Phone
                      </label>
                      <input
                        type="tel"
                        value={newChildParentPhone}
                        onChange={(e) => setNewChildParentPhone(e.target.value)}
                        placeholder="(XXX) XXX-XXXX"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 focus:border-honey-500 text-gray-900"
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newChildSignWaiver}
                          onChange={(e) =>
                            setNewChildSignWaiver(e.target.checked)
                          }
                          className="w-4 h-4 text-honey-600 border-gray-300 rounded focus:ring-honey-500"
                        />
                        <span className="text-sm text-gray-700">
                          Sign waiver on behalf of guardian
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="flex space-x-3 mt-4">
                    <button
                      onClick={() => {
                        setShowNewChildForm(false);
                        setNewChildName('');
                        setNewChildBirthdate('');
                        setNewChildParentPhone('');
                        setNewChildSignWaiver(true);
                      }}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                    >
                      Cancel
                    </button>
                    <Button
                      onClick={handleCreateAndAddChild}
                      disabled={
                        !newChildName.trim() ||
                        !newChildBirthdate ||
                        isCreatingChild
                      }
                      loading={isCreatingChild}
                      size="sm"
                      className="bg-honey-500 text-white hover:bg-honey-600"
                    >
                      Create & Add to Group
                    </Button>
                  </div>
                </Card>
              )}
            </div>

            {/* Assigned Children List */}
            {assignedChildren.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Assigned Children ({assignedChildren.length}/{guestCount})
                </h3>
                <div className="space-y-2">
                  {assignedChildren.map((child, index) => {
                    const age = calculateAge(child.birthdate);

                    return (
                      <motion.div
                        key={child.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="w-7 h-7 bg-honey-100 rounded-full flex items-center justify-center text-sm font-bold text-honey-700">
                            {index + 1}
                          </span>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-gray-900">
                                {child.name}
                              </span>
                              <span className="text-sm text-gray-500">
                                (age {age})
                              </span>
                              {child.is_new_child && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  New
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              {child.waiver_signed ? (
                                <span className="inline-flex items-center text-xs text-green-600">
                                  <Check className="w-3 h-3 mr-1" />
                                  Waiver Signed
                                </span>
                              ) : (
                                <button
                                  onClick={() =>
                                    handleOpenWaiver(child.id, child.name)
                                  }
                                  className="inline-flex items-center text-xs text-amber-600 hover:text-amber-700 font-medium"
                                >
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Sign Waiver
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleRemoveChild(child.id)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                          aria-label={`Remove ${child.name}`}
                        >
                          <Minus className="w-5 h-5" />
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 flex items-center justify-between">
            <Button
              onClick={onClose}
              variant="outline"
              className="text-gray-600"
            >
              Cancel
            </Button>

            <Button
              onClick={() => onComplete(assignedChildren)}
              disabled={!canProceed}
              className={`${
                canProceed
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {canProceed
                ? 'Proceed to Payment'
                : `${assignedChildren.length}/${guestCount} assigned${
                    !allWaiversSigned ? ' (waivers needed)' : ''
                  }`}
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Waiver Modal */}
      <WaiverModal
        isOpen={showWaiverModal}
        onClose={() => {
          setShowWaiverModal(false);
          setWaiverChildId(null);
          setWaiverChildName(undefined);
        }}
        childName={waiverChildName}
        onAgree={handleSignWaiver}
        isSubmitting={isSigningWaiver}
      />
    </>
  );
}
