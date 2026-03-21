'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface Announcement {
  id: string;
  message: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  bg_color: string;
  text_color: string;
  created_at: string;
}

const COLOR_PRESETS = [
  { label: 'Amber (Default)', bg: '#f59e0b', text: '#78350f' },
  { label: 'Red (Urgent)', bg: '#ef4444', text: '#ffffff' },
  { label: 'Blue (Info)', bg: '#3b82f6', text: '#ffffff' },
  { label: 'Green (Positive)', bg: '#22c55e', text: '#ffffff' },
  { label: 'Purple (Event)', bg: '#8b5cf6', text: '#ffffff' },
  { label: 'Dark', bg: '#1f2937', text: '#fbbf24' },
];

export function AnnouncementManager() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    message: '',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date().toISOString().slice(0, 10),
    start_time: '00:00',
    end_time: '23:59',
    is_active: true,
    bg_color: '#f59e0b',
    text_color: '#78350f',
  });

  const fetchAnnouncements = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/announcements');
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data.announcements || []);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const resetForm = () => {
    setForm({
      message: '',
      start_date: new Date().toISOString().slice(0, 10),
      end_date: new Date().toISOString().slice(0, 10),
      start_time: '00:00',
      end_time: '23:59',
      is_active: true,
      bg_color: '#f59e0b',
      text_color: '#78350f',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.message.trim()) return;
    setSaving(true);

    const url = editingId
      ? `/api/admin/announcements/${editingId}`
      : '/api/admin/announcements';
    const method = editingId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      await fetchAnnouncements();
      resetForm();
    }
    setSaving(false);
  };

  const handleEdit = (a: Announcement) => {
    setEditingId(a.id);
    setForm({
      message: a.message,
      start_date: a.start_date,
      end_date: a.end_date,
      start_time: a.start_time.slice(0, 5),
      end_time: a.end_time.slice(0, 5),
      is_active: a.is_active,
      bg_color: a.bg_color || '#f59e0b',
      text_color: a.text_color || '#78350f',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/admin/announcements/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await fetchAnnouncements();
    }
  };

  const handleToggleActive = async (a: Announcement) => {
    await fetch(`/api/admin/announcements/${a.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !a.is_active }),
    });
    await fetchAnnouncements();
  };

  const isCurrentlyActive = (a: Announcement) => {
    if (!a.is_active) return false;
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return a.start_date <= today && a.end_date >= today && a.start_time.slice(0, 5) <= currentTime && a.end_time.slice(0, 5) >= currentTime;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Announcement Marquee Manager</CardTitle>
            <Button
              onClick={() => {
                if (showForm) {
                  resetForm();
                } else {
                  setShowForm(true);
                }
              }}
              variant={showForm ? 'outline' : 'default'}
              size="sm"
            >
              {showForm ? 'Cancel' : '+ New Announcement'}
            </Button>
          </div>
          <p className="text-sm text-neutral-500 mt-1">
            Create scrolling announcements that display across all pages of the website
          </p>
        </CardHeader>
        <CardContent>
          {/* Create/Edit Form */}
          {showForm && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="e.g., Closed today due to weather. Stay safe!"
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500 text-sm"
                  rows={2}
                  maxLength={500}
                />
                <p className="text-xs text-neutral-400 mt-1 text-right">{form.message.length}/500</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm(prev => ({ ...prev, start_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-honey-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm(prev => ({ ...prev, end_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-honey-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={(e) => setForm(prev => ({ ...prev, start_time: e.target.value }))}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-honey-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={form.end_time}
                    onChange={(e) => setForm(prev => ({ ...prev, end_time: e.target.value }))}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-honey-500"
                  />
                </div>
              </div>

              {/* Color Presets */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Banner Style</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => setForm(prev => ({ ...prev, bg_color: preset.bg, text_color: preset.text }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-all ${
                        form.bg_color === preset.bg ? 'border-charcoal-800 scale-105' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: preset.bg, color: preset.text }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
                <div
                  className="overflow-hidden rounded-lg py-2"
                  style={{ backgroundColor: form.bg_color }}
                >
                  <div className="whitespace-nowrap animate-pulse">
                    <span
                      className="text-sm font-semibold px-4"
                      style={{ color: form.text_color }}
                    >
                      📢 {form.message || 'Your announcement will appear here...'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  Active immediately
                </label>
              </div>

              <Button
                onClick={handleSave}
                disabled={saving || !form.message.trim()}
              >
                {saving ? 'Saving...' : editingId ? 'Update Announcement' : 'Create Announcement'}
              </Button>
            </div>
          )}

          {/* Announcements List */}
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-honey-500 mx-auto" />
            </div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-4xl mb-2">📢</p>
              <p className="text-neutral-600">No announcements yet</p>
              <p className="text-sm text-neutral-400 mt-1">Create one to display a scrolling banner across your website</p>
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map((a) => {
                const live = isCurrentlyActive(a);
                return (
                  <div
                    key={a.id}
                    className={`border rounded-lg p-4 ${live ? 'border-green-300 bg-green-50' : 'border-neutral-200'}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {live && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                              LIVE
                            </span>
                          )}
                          {!a.is_active && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600">
                              DISABLED
                            </span>
                          )}
                          {a.is_active && !live && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              SCHEDULED
                            </span>
                          )}
                        </div>
                        {/* Message preview */}
                        <div
                          className="rounded-md px-3 py-1.5 text-sm font-medium mb-2 inline-block"
                          style={{ backgroundColor: a.bg_color, color: a.text_color }}
                        >
                          📢 {a.message}
                        </div>
                        <div className="text-xs text-neutral-500 space-x-3">
                          <span>📅 {a.start_date} to {a.end_date}</span>
                          <span>⏰ {a.start_time.slice(0, 5)} - {a.end_time.slice(0, 5)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleToggleActive(a)}
                          className={`text-xs font-medium px-3 py-1.5 rounded-lg border ${
                            a.is_active
                              ? 'border-red-200 text-red-600 hover:bg-red-50'
                              : 'border-green-200 text-green-600 hover:bg-green-50'
                          }`}
                        >
                          {a.is_active ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => handleEdit(a)}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(a.id)}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
