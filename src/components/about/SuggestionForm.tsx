'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

type Status = 'idle' | 'submitting' | 'success' | 'error';

export function SuggestionForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setStatus('submitting');
    setErrorMsg('');
    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || undefined,
          email: email.trim() || undefined,
          message: message.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to send. Please try again.');
        setStatus('error');
        return;
      }
      setStatus('success');
      setName('');
      setEmail('');
      setMessage('');
    } catch {
      setErrorMsg('Failed to send. Please try again.');
      setStatus('error');
    }
  };

  return (
    <section className="py-16 sm:py-20 bg-[#FFF8E7]">
      <div className="mx-auto max-w-2xl px-6 sm:px-8 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-charcoal-800 mb-3 text-center">
            Send Us a Suggestion
          </h2>
          <p className="text-base sm:text-lg text-charcoal-600 mb-8 text-center">
            Have an idea to make Busy Bees better? We&apos;d love to hear it.
          </p>

          {status === 'success' ? (
            <div className="rounded-2xl bg-green-50 border border-green-200 p-6 text-center">
              <p className="text-lg font-semibold text-green-800 mb-1">Thanks for the suggestion!</p>
              <p className="text-sm text-green-700">
                We&apos;ve received your message and appreciate you taking the time.
              </p>
              <button
                onClick={() => setStatus('idle')}
                className="mt-4 text-sm font-medium text-green-700 underline hover:no-underline"
              >
                Send another
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="suggestion-name" className="block text-sm font-medium text-charcoal-700 mb-1">
                    Your Name <span className="text-charcoal-400 font-normal">(optional)</span>
                  </label>
                  <input
                    id="suggestion-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={120}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-honey-400"
                    placeholder="Jane Smith"
                  />
                </div>
                <div>
                  <label htmlFor="suggestion-email" className="block text-sm font-medium text-charcoal-700 mb-1">
                    Email <span className="text-charcoal-400 font-normal">(optional)</span>
                  </label>
                  <input
                    id="suggestion-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    maxLength={254}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-honey-400"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="suggestion-message" className="block text-sm font-medium text-charcoal-700 mb-1">
                  Your Suggestion
                </label>
                <textarea
                  id="suggestion-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  minLength={5}
                  maxLength={2000}
                  rows={5}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-honey-400 resize-y"
                  placeholder="Tell us what's on your mind..."
                />
                <p className="text-xs text-charcoal-500 mt-1">{message.length}/2000</p>
              </div>

              {status === 'error' && errorMsg && (
                <p className="text-sm text-red-600">{errorMsg}</p>
              )}

              <button
                type="submit"
                disabled={status === 'submitting' || !message.trim()}
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 bg-honey-500 hover:bg-honey-600 disabled:opacity-50 disabled:cursor-not-allowed text-charcoal-900 font-bold rounded-full shadow-lg transition-all"
              >
                {status === 'submitting' ? 'Sending...' : 'Send Suggestion'}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
}
