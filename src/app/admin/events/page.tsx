/**
 * Admin Events Management Page
 * Create, edit, and manage special events with image uploads
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { logger } from '@/lib/client-logger';
import { Database } from '@/lib/supabase/database.types';

type Event = Database['public']['Tables']['events']['Row'];
type EventStatus = Event['status'];

const STATUS_COLORS: Record<EventStatus, string> = {
  draft: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  published: 'bg-green-100 text-green-800 border-green-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
};

export default function AdminEventsPage() {
  // PIN lock state
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Data state
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // View state
  const [activeView, setActiveView] = useState<'list' | 'create'>('list');
  const [statusFilter, setStatusFilter] = useState<'all' | EventStatus>('all');

  // Create form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTimeStart, setEventTimeStart] = useState('');
  const [eventTimeEnd, setEventTimeEnd] = useState('');
  const [status, setStatus] = useState<EventStatus>('draft');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit state
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (isUnlocked) {
      fetchEvents();
    }
  }, [isUnlocked]);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await fetch('/api/admin/events');
      if (!response.ok) throw new Error('Failed to fetch events');
      const data = await response.json();
      setEvents(data);
    } catch (err) {
      logger.error({ error: err }, 'Failed to fetch events');
      setError(err instanceof Error ? err.message : 'Failed to fetch events');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    // Client-side validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Allowed: JPEG, PNG, WebP, GIF');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum size is 10MB');
      return;
    }

    try {
      setIsUploading(true);
      setError('');

      // Show local preview immediately
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/events/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload image');
      }

      const { url } = await response.json();
      setImageUrl(url);
      setSuccessMessage('Image uploaded successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      logger.error({ error: err }, 'Failed to upload image');
      setError(err instanceof Error ? err.message : 'Failed to upload image');
      setImagePreview('');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleImageUpload(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setEventDate('');
    setEventTimeStart('');
    setEventTimeEnd('');
    setStatus('draft');
    setImageUrl('');
    setImagePreview('');
    setEditingEvent(null);
  };

  const handleCreate = async () => {
    if (!title || !eventDate || !eventTimeStart || !imageUrl) {
      setError('Please fill in all required fields and upload an image');
      return;
    }

    try {
      setIsCreating(true);
      setError('');

      const response = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || null,
          image_url: imageUrl,
          event_date: eventDate,
          event_time_start: eventTimeStart,
          event_time_end: eventTimeEnd || null,
          status,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create event');
      }

      const newEvent = await response.json();
      setEvents((prev) => [newEvent, ...prev]);
      setSuccessMessage(`Event "${title}" created successfully!`);
      resetForm();
      setActiveView('list');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      logger.error({ error: err }, 'Failed to create event');
      setError(err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async (eventId: string, updates: Record<string, unknown>) => {
    try {
      setIsUpdating(true);
      setError('');

      const response = await fetch(`/api/admin/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update event');
      }

      const updatedEvent = await response.json();
      setEvents((prev) => prev.map((e) => (e.id === eventId ? updatedEvent : e)));
      setEditingEvent(null);
      setSuccessMessage('Event updated successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      logger.error({ error: err }, 'Failed to update event');
      setError(err instanceof Error ? err.message : 'Failed to update event');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (eventId: string, eventTitle: string) => {
    if (!confirm(`Permanently delete "${eventTitle}"? This cannot be undone.`)) return;

    try {
      setError('');
      const response = await fetch(`/api/admin/events/${eventId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete event');
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      setSuccessMessage('Event deleted');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      logger.error({ error: err }, 'Failed to delete event');
      setError(err instanceof Error ? err.message : 'Failed to delete event');
    }
  };

  const handleToggleStatus = async (event: Event) => {
    const newStatus: EventStatus = event.status === 'published' ? 'draft' : 'published';
    await handleUpdate(event.id, { status: newStatus });
  };

  // PIN verification
  const handlePinSubmit = async () => {
    if (pinInput.length !== 4) return;
    setIsAuthenticating(true);
    setPinError('');

    try {
      const response = await fetch('/api/auth/staff-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput }),
      });

      if (response.ok) {
        setIsUnlocked(true);
      } else {
        const data = await response.json();
        setPinError(data.error || 'Invalid PIN. Please try again.');
        setPinInput('');
      }
    } catch (err) {
      logger.error({ error: err }, 'Staff login failed');
      setPinError('Authentication failed. Please try again.');
      setPinInput('');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handlePinKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handlePinSubmit();
  };

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const filteredEvents = statusFilter === 'all'
    ? events
    : events.filter((e) => e.status === statusFilter);

  // PIN Lock Screen
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pastel-yellow to-white flex items-center justify-center p-8 pos-page-static">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Admin Access Required</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-center text-neutral-600">
                Enter the admin PIN to access Events Management
              </p>
              <div>
                <input
                  type="password"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  onKeyDown={handlePinKeyDown}
                  placeholder="Enter PIN"
                  maxLength={4}
                  className="w-full px-4 py-3 text-center text-2xl tracking-widest border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500 focus:border-honey-500 disabled:opacity-50"
                  autoFocus
                  disabled={isAuthenticating}
                />
              </div>
              {pinError && (
                <p className="text-red-600 text-sm text-center">{pinError}</p>
              )}
              <Button
                onClick={handlePinSubmit}
                className="w-full"
                disabled={pinInput.length < 4 || isAuthenticating}
              >
                {isAuthenticating ? 'Authenticating...' : 'Unlock'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pastel-yellow to-white p-8 pos-page-static">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-honey-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pastel-yellow to-white p-8 pos-page-static">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-charcoal-800 mb-2">Events Management</h1>
            <p className="text-neutral-600">Create and manage special events</p>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        )}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-medium">{successMessage}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card hover={false} padding="sm">
            <div className="text-center">
              <div className="text-3xl font-bold text-charcoal-800">{events.length}</div>
              <div className="text-sm text-neutral-600 mt-1">Total Events</div>
            </div>
          </Card>
          <Card hover={false} padding="sm">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {events.filter((e) => e.status === 'published').length}
              </div>
              <div className="text-sm text-neutral-600 mt-1">Published</div>
            </div>
          </Card>
          <Card hover={false} padding="sm">
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">
                {events.filter((e) => e.status === 'draft').length}
              </div>
              <div className="text-sm text-neutral-600 mt-1">Drafts</div>
            </div>
          </Card>
        </div>

        {/* View Tabs */}
        <div className="flex space-x-2 border-b border-neutral-200">
          <button
            onClick={() => { setActiveView('list'); setEditingEvent(null); }}
            className={`px-6 py-3 font-medium transition-colors ${
              activeView === 'list'
                ? 'text-honey-600 border-b-2 border-honey-500'
                : 'text-neutral-600 hover:text-neutral-800'
            }`}
          >
            Events List
          </button>
          <button
            onClick={() => { setActiveView('create'); resetForm(); }}
            className={`px-6 py-3 font-medium transition-colors ${
              activeView === 'create'
                ? 'text-honey-600 border-b-2 border-honey-500'
                : 'text-neutral-600 hover:text-neutral-800'
            }`}
          >
            + Create Event
          </button>
        </div>

        {/* Events List View */}
        {activeView === 'list' && (
          <div className="space-y-4">
            {/* Filter */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-neutral-700">Filter:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <span className="text-sm text-neutral-600">
                {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
              </span>
            </div>

            {filteredEvents.length === 0 ? (
              <Card>
                <div className="text-center py-12">
                  <p className="text-neutral-600">No events found.</p>
                  <Button className="mt-4" onClick={() => setActiveView('create')}>
                    Create Your First Event
                  </Button>
                </div>
              </Card>
            ) : (
              filteredEvents.map((event) => (
                <Card key={event.id} hover={false} padding="sm">
                  {editingEvent?.id === event.id ? (
                    // Inline edit form
                    <EditEventForm
                      event={editingEvent}
                      onChange={setEditingEvent}
                      onSave={() => handleUpdate(event.id, {
                        title: editingEvent.title,
                        description: editingEvent.description,
                        event_date: editingEvent.event_date,
                        event_time_start: editingEvent.event_time_start,
                        event_time_end: editingEvent.event_time_end,
                        status: editingEvent.status,
                      })}
                      onCancel={() => setEditingEvent(null)}
                      isUpdating={isUpdating}
                    />
                  ) : (
                    // Event display
                    <div className="flex gap-4">
                      {/* Thumbnail */}
                      <div className="flex-shrink-0 w-32 rounded-xl overflow-hidden bg-neutral-100">
                        <Image
                          src={event.image_url}
                          alt={event.title}
                          width={128}
                          height={128}
                          className="w-full h-auto"
                          sizes="128px"
                        />
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-lg font-bold text-charcoal-800">{event.title}</h3>
                            <p className="text-sm text-neutral-600 mt-1">
                              {formatDate(event.event_date)} at {formatTime(event.event_time_start)}
                              {event.event_time_end && ` - ${formatTime(event.event_time_end)}`}
                            </p>
                            {event.description && (
                              <p className="text-sm text-neutral-500 mt-1 line-clamp-2">
                                {event.description}
                              </p>
                            )}
                          </div>
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border flex-shrink-0 ${
                              STATUS_COLORS[event.status]
                            }`}
                          >
                            {event.status.toUpperCase()}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleToggleStatus(event)}
                            className={`text-xs px-3 py-1.5 rounded font-medium ${
                              event.status === 'published'
                                ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                : 'bg-green-100 text-green-800 hover:bg-green-200'
                            }`}
                          >
                            {event.status === 'published' ? 'Unpublish' : 'Publish'}
                          </button>
                          <button
                            onClick={() => setEditingEvent({ ...event })}
                            className="text-xs px-3 py-1.5 bg-blue-100 text-blue-800 rounded font-medium hover:bg-blue-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(event.id, event.title)}
                            className="text-xs px-3 py-1.5 bg-red-100 text-red-800 rounded font-medium hover:bg-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        )}

        {/* Create Event View */}
        {activeView === 'create' && (
          <Card>
            <CardHeader>
              <CardTitle>Create New Event</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Event Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Galentine's Day Party"
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500"
                  />
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Event Date *
                    </label>
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Start Time *
                    </label>
                    <input
                      type="time"
                      value={eventTimeStart}
                      onChange={(e) => setEventTimeStart(e.target.value)}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      End Time (optional)
                    </label>
                    <input
                      type="time"
                      value={eventTimeEnd}
                      onChange={(e) => setEventTimeEnd(e.target.value)}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add details about the event..."
                    rows={3}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500"
                  />
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Event Image *
                  </label>
                  {imagePreview || imageUrl ? (
                    <div className="space-y-3">
                      <div className="w-full max-w-md rounded-xl overflow-hidden border border-neutral-200">
                        <Image
                          src={imagePreview || imageUrl}
                          alt="Event preview"
                          width={800}
                          height={600}
                          className="w-full h-auto"
                          sizes="(max-width: 768px) 100vw, 448px"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setImageUrl('');
                          setImagePreview('');
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                      >
                        Remove Image
                      </Button>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleDrop}
                      className="border-2 border-dashed border-neutral-300 rounded-xl p-8 text-center hover:border-honey-400 transition-colors cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {isUploading ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-honey-500"></div>
                          <p className="text-sm text-neutral-600">Uploading...</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-neutral-600 font-medium">
                            Drag and drop your image here
                          </p>
                          <p className="text-sm text-neutral-500 mt-1">
                            or click to browse (JPEG, PNG, WebP, GIF - max 10MB)
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as EventStatus)}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500"
                  >
                    <option value="draft">Draft (not visible to public)</option>
                    <option value="published">Published (visible on Events page)</option>
                  </select>
                </div>

                {/* Submit */}
                <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200">
                  <Button
                    variant="outline"
                    onClick={() => {
                      resetForm();
                      setActiveView('list');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={isCreating || !title || !eventDate || !eventTimeStart || !imageUrl}
                  >
                    {isCreating ? 'Creating...' : 'Create Event'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Inline edit form component
function EditEventForm({
  event,
  onChange,
  onSave,
  onCancel,
  isUpdating,
}: {
  event: Event;
  onChange: (event: Event) => void;
  onSave: () => void;
  onCancel: () => void;
  isUpdating: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Title</label>
          <input
            type="text"
            value={event.title}
            onChange={(e) => onChange({ ...event, title: e.target.value })}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Status</label>
          <select
            value={event.status}
            onChange={(e) => onChange({ ...event, status: e.target.value as EventStatus })}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500 text-sm"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Date</label>
          <input
            type="date"
            value={event.event_date}
            onChange={(e) => onChange({ ...event, event_date: e.target.value })}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Start</label>
            <input
              type="time"
              value={event.event_time_start}
              onChange={(e) => onChange({ ...event, event_time_start: e.target.value })}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">End</label>
            <input
              type="time"
              value={event.event_time_end || ''}
              onChange={(e) => onChange({ ...event, event_time_end: e.target.value || null })}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500 text-sm"
            />
          </div>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">Description</label>
        <textarea
          value={event.description || ''}
          onChange={(e) => onChange({ ...event, description: e.target.value || null })}
          rows={2}
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500 text-sm"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={onSave} disabled={isUpdating}>
          {isUpdating ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
