/**
 * Settings Manager Component
 * Configure Stripe API keys and other platform settings
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { logger } from '@/lib/logger';

interface Setting {
  id: string;
  key: string;
  value: string;
  description: string;
  is_encrypted: boolean;
}

export function SettingsManager() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (!response.ok) throw new Error('Failed to fetch settings');

      const data = await response.json();
      setSettings(data);

      // Initialize edit values
      const initialValues: Record<string, string> = {};
      data.forEach((setting: Setting) => {
        initialValues[setting.key] = setting.value || '';
      });
      setEditValues(initialValues);
    } catch (error) {
      console.error('Error fetching settings:', error);
      setMessage('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (key: string) => {
    setIsSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          value: editValues[key],
        }),
      });

      if (!response.ok) throw new Error('Failed to update setting');

      logger.info({ key }, '✅ Setting updated');
      setMessage(`${key} updated successfully!`);

      // Refresh settings
      await fetchSettings();
    } catch (error) {
      console.error('Error saving setting:', error);
      setMessage('Failed to save setting');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleShowValue = (key: string) => {
    setShowValues(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  const stripeSettings = settings.filter(s => s.key.startsWith('stripe_'));
  const otherSettings = settings.filter(s => !s.key.startsWith('stripe_'));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Platform Settings</h2>
        <p className="text-gray-600">Configure API keys and system settings</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${
          message.includes('success') || message.includes('updated')
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      {/* Stripe Configuration */}
      <Card className="p-6">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-2">🔐 Stripe Configuration</h3>
          <p className="text-sm text-gray-600">
            Configure your Stripe API keys to enable product/coupon management and payment processing.
          </p>
        </div>

        <div className="space-y-6">
          {stripeSettings.map((setting) => (
            <div key={setting.key} className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
              <div className="mb-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {setting.key.split('_').map(word =>
                    word.charAt(0).toUpperCase() + word.slice(1)
                  ).join(' ')}
                </label>
                {setting.description && (
                  <p className="text-xs text-gray-500">{setting.description}</p>
                )}
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex-1 relative">
                  <input
                    type={setting.is_encrypted && !showValues[setting.key] ? 'password' : 'text'}
                    value={editValues[setting.key] || ''}
                    onChange={(e) => setEditValues({
                      ...editValues,
                      [setting.key]: e.target.value,
                    })}
                    placeholder={
                      setting.key === 'stripe_secret_key' ? 'sk_test_...' :
                      setting.key === 'stripe_publishable_key' ? 'pk_test_...' :
                      setting.key === 'stripe_webhook_secret' ? 'whsec_...' :
                      'Enter value...'
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 font-mono text-sm"
                  />
                  {setting.is_encrypted && (
                    <button
                      type="button"
                      onClick={() => toggleShowValue(setting.key)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                      {showValues[setting.key] ? '👁️' : '👁️‍🗨️'}
                    </button>
                  )}
                </div>

                <Button
                  onClick={() => handleSave(setting.key)}
                  size="sm"
                  disabled={isSaving || !editValues[setting.key] || editValues[setting.key] === setting.value}
                >
                  {isSaving ? '💾...' : '💾 Save'}
                </Button>
              </div>

              {setting.key === 'stripe_secret_key' && editValues[setting.key] && (
                <p className="text-xs text-gray-500 mt-1">
                  💡 Use test key (sk_test_) for development, live key (sk_live_) for production
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>🔒 Security Note:</strong> API keys are stored encrypted in the database and only accessible to admins.
          </p>
        </div>
      </Card>

      {/* Other Settings */}
      {otherSettings.length > 0 && (
        <Card className="p-6">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">⚙️ System Settings</h3>
            <p className="text-sm text-gray-600">
              Configure system behavior and operational settings.
            </p>
          </div>

          <div className="space-y-6">
            {otherSettings.map((setting) => (
              <div key={setting.key} className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                <div className="mb-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {setting.key.split('_').map(word =>
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}
                  </label>
                  {setting.description && (
                    <p className="text-xs text-gray-500">{setting.description}</p>
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type={setting.is_encrypted && !showValues[setting.key] ? 'password' : 'text'}
                    value={editValues[setting.key] || ''}
                    onChange={(e) => setEditValues({
                      ...editValues,
                      [setting.key]: e.target.value,
                    })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  />

                  <Button
                    onClick={() => handleSave(setting.key)}
                    size="sm"
                    disabled={isSaving || !editValues[setting.key] || editValues[setting.key] === setting.value}
                  >
                    {isSaving ? '💾...' : '💾 Save'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Help Section */}
      <Card className="p-6 bg-yellow-50 border-yellow-200">
        <h3 className="text-lg font-bold text-gray-900 mb-3">📖 How to Get Stripe Keys</h3>
        <ol className="space-y-2 text-sm text-gray-700">
          <li><strong>1.</strong> Go to <a href="https://dashboard.stripe.com/test/apikeys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Stripe Dashboard → Developers → API Keys</a></li>
          <li><strong>2.</strong> Copy your <strong>Secret key</strong> (starts with sk_test_ or sk_live_)</li>
          <li><strong>3.</strong> Copy your <strong>Publishable key</strong> (starts with pk_test_ or pk_live_)</li>
          <li><strong>4.</strong> Paste them above and click Save</li>
          <li><strong>5.</strong> For webhooks: Go to Developers → Webhooks → Add endpoint</li>
          <li><strong>6.</strong> Copy the signing secret and save above</li>
        </ol>
      </Card>
    </div>
  );
}

