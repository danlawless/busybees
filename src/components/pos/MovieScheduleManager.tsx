'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface Movie {
  id: string;
  title: string;
  show_date: string;
  description: string | null;
  poster_url: string | null;
  rating: string;
  created_at: string;
}

const RATINGS = ['G', 'PG', 'PG-13'];

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function getNextFridays(count: number): string[] {
  const fridays: string[] = [];
  const d = new Date();
  // Find next Friday
  const dayOfWeek = d.getDay();
  const daysUntilFriday = dayOfWeek <= 5 ? 5 - dayOfWeek : 6;
  d.setDate(d.getDate() + daysUntilFriday);

  for (let i = 0; i < count; i++) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    fridays.push(`${y}-${m}-${day}`);
    d.setDate(d.getDate() + 7);
  }
  return fridays;
}

function isPast(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date < today;
}

export function MovieScheduleManager() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    show_date: getNextFridays(1)[0] || '',
    description: '',
    poster_url: '',
    rating: 'G',
  });

  const fetchMovies = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/after-dark-movies');
      if (res.ok) {
        const data = await res.json();
        setMovies(data.movies || []);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  const resetForm = () => {
    setForm({
      title: '',
      show_date: getNextFridays(1)[0] || '',
      description: '',
      poster_url: '',
      rating: 'G',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.show_date) return;
    setSaving(true);

    const url = editingId
      ? `/api/admin/after-dark-movies/${editingId}`
      : '/api/admin/after-dark-movies';
    const method = editingId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      await fetchMovies();
      resetForm();
    }
    setSaving(false);
  };

  const handleEdit = (movie: Movie) => {
    setEditingId(movie.id);
    setForm({
      title: movie.title,
      show_date: movie.show_date,
      description: movie.description || '',
      poster_url: movie.poster_url || '',
      rating: movie.rating || 'G',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/admin/after-dark-movies/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await fetchMovies();
    }
  };

  const upcomingFridays = getNextFridays(8);
  const scheduledDates = new Set(movies.map(m => m.show_date));
  const upcomingMovies = movies.filter(m => !isPast(m.show_date)).sort((a, b) => a.show_date.localeCompare(b.show_date));
  const pastMovies = movies.filter(m => isPast(m.show_date));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>After Dark Movie Schedule</CardTitle>
              <p className="text-sm text-neutral-500 mt-1">
                Set the movie for each Friday&apos;s After Dark event
              </p>
            </div>
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
              {showForm ? 'Cancel' : '+ Schedule Movie'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Create/Edit Form */}
          {showForm && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Movie Title</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Finding Nemo"
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Friday Date</label>
                  <select
                    value={form.show_date}
                    onChange={(e) => setForm(prev => ({ ...prev, show_date: e.target.value }))}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500 text-sm"
                  >
                    {upcomingFridays.map(date => (
                      <option key={date} value={date} disabled={scheduledDates.has(date) && date !== form.show_date}>
                        {formatDate(date)}{scheduledDates.has(date) && date !== form.show_date ? ' (already scheduled)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
                  <div className="flex gap-2">
                    {RATINGS.map(r => (
                      <button
                        key={r}
                        onClick={() => setForm(prev => ({ ...prev, rating: r }))}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                          form.rating === r
                            ? 'border-honey-500 bg-honey-50 text-honey-700'
                            : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Poster Image URL (optional)</label>
                  <input
                    type="url"
                    value={form.poster_url}
                    onChange={(e) => setForm(prev => ({ ...prev, poster_url: e.target.value }))}
                    placeholder="https://..."
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="A brief description or fun note about the movie..."
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500 text-sm"
                  rows={2}
                  maxLength={500}
                />
              </div>

              <Button
                onClick={handleSave}
                disabled={saving || !form.title.trim()}
              >
                {saving ? 'Saving...' : editingId ? 'Update Movie' : 'Schedule Movie'}
              </Button>
            </div>
          )}

          {/* Movie Schedule */}
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-honey-500 mx-auto" />
            </div>
          ) : upcomingMovies.length === 0 && pastMovies.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-4xl mb-2">🎬</p>
              <p className="text-neutral-600">No movies scheduled yet</p>
              <p className="text-sm text-neutral-400 mt-1">Schedule a movie for this Friday&apos;s After Dark event</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Upcoming Movies */}
              {upcomingMovies.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-3">Upcoming</h3>
                  <div className="space-y-3">
                    {upcomingMovies.map((movie) => {
                      const isThisWeek = movie.show_date === upcomingFridays[0];
                      return (
                        <div
                          key={movie.id}
                          className={`border rounded-lg p-4 ${isThisWeek ? 'border-purple-300 bg-purple-50' : 'border-neutral-200'}`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4 flex-1 min-w-0">
                              {/* Movie icon / poster placeholder */}
                              <div
                                className="w-16 h-20 rounded-lg flex items-center justify-center flex-shrink-0 text-2xl"
                                style={{
                                  background: isThisWeek
                                    ? 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)'
                                    : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                                }}
                              >
                                🎬
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  {isThisWeek && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                      This Friday
                                    </span>
                                  )}
                                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600">
                                    Rated {movie.rating}
                                  </span>
                                </div>
                                <h4 className="text-lg font-bold text-charcoal-800 truncate">{movie.title}</h4>
                                <p className="text-sm text-neutral-500">{formatDate(movie.show_date)}</p>
                                {movie.description && (
                                  <p className="text-sm text-neutral-600 mt-1">{movie.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                onClick={() => handleEdit(movie)}
                                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(movie.id)}
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
                </div>
              )}

              {/* Past Movies */}
              {pastMovies.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-3">Past</h3>
                  <div className="space-y-2">
                    {pastMovies.slice(0, 5).map((movie) => (
                      <div key={movie.id} className="border border-neutral-100 rounded-lg p-3 bg-neutral-50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">🎬</span>
                          <div>
                            <p className="text-sm font-medium text-neutral-600">{movie.title}</p>
                            <p className="text-xs text-neutral-400">{formatDate(movie.show_date)}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(movie.id)}
                          className="text-xs text-neutral-400 hover:text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
