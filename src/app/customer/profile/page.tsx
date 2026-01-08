/**
 * Customer Profile Page
 * Manage account settings and information
 */

'use client';

import { useState } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useUser } from '@/hooks/useUser';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

function ProfileContent() {
  const { user, profile } = useUser();
  const supabase = createClient();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [formData, setFormData] = useState({
    name: profile?.name || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage('');

    try {
      // Update user profile
      const { error } = await supabase
        .from('users')
        .update({
          name: formData.name,
          email: formData.email || null,
        })
        .eq('id', user!.id);

      if (error) throw error;

      setMessage('Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-24 bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/customer/dashboard">
            <Button variant="outline" size="sm" className="mb-4">
              ← Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Account Settings</h1>
          <p className="text-gray-600">Manage your profile and preferences</p>
        </div>

        {/* Profile Card */}
        <Card className="p-6 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Profile Information</h2>
              <p className="text-sm text-gray-600">Update your personal details</p>
            </div>
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)} size="sm" variant="outline">
                ✏️ Edit
              </Button>
            )}
          </div>

          {message && (
            <div className={`mb-4 p-3 rounded-lg ${
              message.includes('success')
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message}
            </div>
          )}

          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  disabled
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Phone number cannot be changed
                </p>
              </div>

              <div className="flex space-x-3">
                <Button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      name: profile.name,
                      email: profile.email || '',
                      phone: profile.phone,
                    });
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
                  {isSaving ? '💾 Saving...' : '💾 Save Changes'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Name</p>
                <p className="text-lg text-gray-900">{profile.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Email</p>
                <p className="text-lg text-gray-900">{profile.email || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Phone</p>
                <p className="text-lg text-gray-900">{profile.phone}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Member Since</p>
                <p className="text-lg text-gray-900">
                  {new Date(profile.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* Account Actions */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Account Actions</h2>
          <div className="space-y-3">
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="w-full"
            >
              🚪 Sign Out
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <AuthGuard requireRole="customer">
      <ProfileContent />
    </AuthGuard>
  );
}

