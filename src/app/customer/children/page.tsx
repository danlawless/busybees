/**
 * Customer Children Page
 * Manage children profiles and waivers
 */

'use client';

import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useUser } from '@/hooks/useUser';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

interface Child {
  id: string;
  customer_id: string;
  name: string;
  birthdate: string;
  waiver_signed: boolean;
  waiver_signed_date: string | null;
  created_at: string;
}

function ChildrenContent() {
  const { user } = useUser();
  const supabase = createClient();

  const [children, setChildren] = useState<Child[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    birthdate: '',
  });

  useEffect(() => {
    if (user) {
      fetchChildren();
    }
  }, [user]);

  const fetchChildren = async () => {
    try {
      const { data, error } = await supabase
        .from('children')
        .select('*')
        .eq('customer_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChildren(data || []);
    } catch (error) {
      console.error('Error fetching children:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage('');

    try {
      const { error } = await supabase
        .from('children')
        .insert({
          customer_id: user!.id,
          name: formData.name,
          birthdate: formData.birthdate,
          waiver_signed: false,
        });

      if (error) throw error;

      setMessage('Child added successfully!');
      setFormData({ name: '', birthdate: '' });
      setShowForm(false);
      await fetchChildren();
    } catch (error) {
      console.error('Error adding child:', error);
      setMessage('Failed to add child. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignWaiver = async (childId: string) => {
    try {
      const { error } = await supabase
        .from('children')
        .update({
          waiver_signed: true,
          waiver_signed_date: new Date().toISOString(),
        })
        .eq('id', childId);

      if (error) throw error;

      await fetchChildren();
    } catch (error) {
      console.error('Error signing waiver:', error);
    }
  };

  const calculateAge = (birthdate: string) => {
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/customer/dashboard">
            <Button variant="outline" size="sm" className="mb-4">
              ← Back to Dashboard
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">My Children</h1>
              <p className="text-gray-600">Manage your children's profiles and waivers</p>
            </div>
            <Button onClick={() => setShowForm(true)} size="sm">
              ➕ Add Child
            </Button>
          </div>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.includes('success')
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message}
          </div>
        )}

        {/* Add Child Form */}
        {showForm && (
          <Card className="p-6 mb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Child</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Child's Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Emma Smith"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Birthdate *
                </label>
                <input
                  type="date"
                  value={formData.birthdate}
                  onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  required
                />
              </div>

              <div className="flex space-x-3">
                <Button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormData({ name: '', birthdate: '' });
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSaving}
                >
                  {isSaving ? '💾 Saving...' : '➕ Add Child'}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Children List */}
        {children.length > 0 ? (
          <div className="space-y-4">
            {children.map((child) => {
              const age = calculateAge(child.birthdate);

              return (
                <Card key={child.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <h3 className="text-xl font-bold text-gray-900">{child.name}</h3>
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                          Age {age}
                        </span>
                      </div>

                      <div className="space-y-2 text-sm text-gray-600">
                        <p>🎂 Birthdate: {new Date(child.birthdate).toLocaleDateString()}</p>
                        <p>📅 Added: {new Date(child.created_at).toLocaleDateString()}</p>
                      </div>

                      {/* Waiver Status */}
                      <div className="mt-4">
                        {child.waiver_signed ? (
                          <div className="flex items-center space-x-2 text-green-700">
                            <span className="bg-green-100 px-3 py-1 rounded-full text-sm font-medium">
                              ✅ Waiver Signed
                            </span>
                            {child.waiver_signed_date && (
                              <span className="text-xs">
                                on {new Date(child.waiver_signed_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-sm text-orange-700 font-medium">
                              ⚠️ Waiver not signed
                            </p>
                            <Button
                              onClick={() => handleSignWaiver(child.id)}
                              size="sm"
                              variant="outline"
                            >
                              Sign Digital Waiver
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <span className="text-6xl mb-4 block">👶</span>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              No Children Added
            </h3>
            <p className="text-gray-600 mb-6">
              Add your children to purchase passes and track their visits
            </p>
            <Button onClick={() => setShowForm(true)}>
              ➕ Add Your First Child
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function ChildrenPage() {
  return (
    <AuthGuard requireRole="customer">
      <ChildrenContent />
    </AuthGuard>
  );
}

