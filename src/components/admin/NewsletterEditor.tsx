'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { EditorRef, EmailEditorProps } from 'react-email-editor';

// Dynamically import Unlayer to avoid SSR issues
const EmailEditor = dynamic(() => import('react-email-editor'), { ssr: false });

interface Draft {
  id: string;
  title: string;
  subject: string;
  design_json: Record<string, unknown>;
  html: string;
  status: string;
  sent_at: string | null;
  sent_count: number;
  created_at: string;
  updated_at: string;
}

interface NewsletterEditorProps {
  activeSubscriberCount: number;
  emailConfigured: boolean;
}

export function NewsletterEditor({ activeSubscriberCount, emailConfigured }: NewsletterEditorProps) {
  const emailEditorRef = useRef<EditorRef>(null);
  const [editorReady, setEditorReady] = useState(false);
  const [subject, setSubject] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [showDrafts, setShowDrafts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendConfirm, setSendConfirm] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [showTestSend, setShowTestSend] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchDrafts = useCallback(async () => {
    try {
      const response = await fetch('/api/newsletter/drafts');
      if (response.ok) {
        const data = await response.json();
        setDrafts(data.drafts || []);
      }
    } catch (error) {
      console.error('Failed to fetch drafts:', error);
    }
  }, []);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  const onReady: EmailEditorProps['onReady'] = () => {
    setEditorReady(true);
  };

  const exportHtml = (): Promise<{ html: string; design: Record<string, unknown> }> => {
    return new Promise((resolve) => {
      const editor = emailEditorRef.current?.editor;
      if (!editor) return;

      editor.exportHtml((data: { html: string; design: Record<string, unknown> }) => {
        resolve(data);
      });
    });
  };

  const handleSaveDraft = async () => {
    if (!draftTitle.trim()) {
      setResult({ success: false, message: 'Please enter a draft title' });
      return;
    }

    setSaving(true);
    setResult(null);

    try {
      const { html, design } = await exportHtml();
      const response = await fetch('/api/newsletter/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentDraftId || undefined,
          title: draftTitle,
          subject,
          designJson: design,
          html,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentDraftId(data.draft.id);
        setResult({ success: true, message: currentDraftId ? 'Draft updated' : 'Draft saved' });
        fetchDrafts();
      } else {
        const data = await response.json();
        setResult({ success: false, message: data.error || 'Failed to save draft' });
      }
    } catch {
      setResult({ success: false, message: 'Failed to save draft' });
    } finally {
      setSaving(false);
    }
  };

  const handleLoadDraft = (draft: Draft) => {
    const editor = emailEditorRef.current?.editor;
    if (!editor) return;

    editor.loadDesign(draft.design_json as Parameters<typeof editor.loadDesign>[0]);
    setSubject(draft.subject);
    setDraftTitle(draft.title);
    setCurrentDraftId(draft.id);
    setShowDrafts(false);
    setResult({ success: true, message: `Loaded: ${draft.title}` });
  };

  const handleDeleteDraft = async (draftId: string) => {
    try {
      const response = await fetch(`/api/newsletter/drafts/${draftId}`, { method: 'DELETE' });
      if (response.ok) {
        fetchDrafts();
        if (currentDraftId === draftId) {
          setCurrentDraftId(null);
          setDraftTitle('');
        }
      }
    } catch (error) {
      console.error('Failed to delete draft:', error);
    }
  };

  const handleNewDraft = () => {
    const editor = emailEditorRef.current?.editor;
    if (!editor) return;

    editor.loadDesign({ body: { rows: [] } } as Parameters<typeof editor.loadDesign>[0]);
    setSubject('');
    setDraftTitle('');
    setCurrentDraftId(null);
    setResult(null);
    setSendConfirm(false);
  };

  const handleTestSend = async () => {
    if (!testEmail || !subject.trim()) {
      setResult({ success: false, message: 'Subject and test email are required' });
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const { html } = await exportHtml();
      const response = await fetch('/api/newsletter/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'html',
          testEmail,
          subject,
          html,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setResult({ success: true, message: `Test email sent to ${testEmail}` });
      } else {
        setResult({ success: false, message: data.error || 'Failed to send test' });
      }
    } catch {
      setResult({ success: false, message: 'Failed to send test email' });
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    if (!sendConfirm) {
      setSendConfirm(true);
      return;
    }

    if (!subject.trim()) {
      setResult({ success: false, message: 'Subject is required' });
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const { html, design } = await exportHtml();

      // Auto-save draft before sending
      if (draftTitle.trim()) {
        await fetch('/api/newsletter/drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: currentDraftId || undefined,
            title: draftTitle,
            subject,
            designJson: design,
            html,
          }),
        });
      }

      const response = await fetch('/api/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'html',
          subject,
          html,
          draftId: currentDraftId || undefined,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setResult({
          success: true,
          message: `Newsletter sent to ${data.sent} of ${data.total} subscribers${data.failed > 0 ? ` (${data.failed} failed)` : ''}`,
        });
        fetchDrafts();
      } else {
        setResult({ success: false, message: data.error || 'Failed to send newsletter' });
      }
    } catch {
      setResult({ success: false, message: 'Failed to send newsletter' });
    } finally {
      setSending(false);
      setSendConfirm(false);
    }
  };

  // Custom image upload handler for Unlayer
  const onLoad: EmailEditorProps['onLoad'] = (editor) => {
    editor.registerCallback('image', async (file: { attachments: File[] }, done: (data: { progress: number; url?: string }) => void) => {
      const image = file.attachments[0];
      if (!image) return;

      const formData = new FormData();
      formData.append('file', image);

      try {
        const response = await fetch('/api/newsletter/upload-image', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          done({ progress: 100, url: data.url });
        } else {
          console.error('Image upload failed');
          done({ progress: 0 });
        }
      } catch (error) {
        console.error('Image upload error:', error);
        done({ progress: 0 });
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Warning if email not configured */}
      {!emailConfigured && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          RESEND_API_KEY environment variable is missing. Newsletter emails will not be delivered until this is set.
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Newsletter Editor</h3>
          <div className="flex gap-2">
            <button
              onClick={handleNewDraft}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              + New
            </button>
            <button
              onClick={() => setShowDrafts(!showDrafts)}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Saved Drafts ({drafts.length})
            </button>
          </div>
        </div>

        {/* Draft selector */}
        {showDrafts && (
          <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-60 overflow-y-auto">
            {drafts.length === 0 ? (
              <p className="p-3 text-sm text-gray-500">No saved drafts yet</p>
            ) : (
              drafts.map((draft) => (
                <div key={draft.id} className="flex items-center justify-between p-3 hover:bg-gray-50">
                  <button
                    onClick={() => handleLoadDraft(draft)}
                    className="flex-1 text-left"
                  >
                    <p className="text-sm font-medium text-gray-800">{draft.title}</p>
                    <p className="text-xs text-gray-500">
                      {draft.status === 'sent' ? `Sent ${new Date(draft.sent_at!).toLocaleDateString()} to ${draft.sent_count}` : `Draft - ${new Date(draft.updated_at).toLocaleDateString()}`}
                    </p>
                  </button>
                  <button
                    onClick={() => handleDeleteDraft(draft.id)}
                    className="ml-2 p-1 text-red-400 hover:text-red-600 text-sm"
                    title="Delete draft"
                  >
                    x
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Subject and draft title */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Subject *</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., March Newsletter - Spring Events!"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Draft Name</label>
            <input
              type="text"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder="e.g., March 2026 Newsletter"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Unlayer Editor */}
      <div className="border border-gray-200 rounded-lg overflow-hidden" style={{ minHeight: 600 }}>
        {!editorReady && (
          <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
            Loading editor...
          </div>
        )}
        <EmailEditor
          ref={emailEditorRef}
          onReady={onReady}
          onLoad={onLoad}
          minHeight={600}
          options={{
            displayMode: 'email',
            features: {
              stockImages: {
                enabled: true,
                safeSearch: true,
              },
            },
            appearance: {
              theme: 'modern_light',
            },
          }}
        />
      </div>

      {/* Action buttons */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        {/* Result message */}
        {result && (
          <div className={`p-3 rounded-lg text-sm ${result.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {result.message}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {/* Save Draft */}
          <button
            onClick={handleSaveDraft}
            disabled={saving || !editorReady}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : currentDraftId ? 'Update Draft' : 'Save Draft'}
          </button>

          {/* Test Send */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTestSend(!showTestSend)}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Test Send
            </button>
            {showTestSend && (
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@email.com"
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-48"
                />
                <button
                  onClick={handleTestSend}
                  disabled={sending || !testEmail || !subject.trim() || !editorReady}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {sending ? 'Sending...' : 'Send Test'}
                </button>
              </div>
            )}
          </div>

          {/* Send to all */}
          <button
            onClick={handleSend}
            disabled={sending || !subject.trim() || !editorReady || activeSubscriberCount === 0}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ml-auto ${
              sendConfirm
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-yellow-500 hover:bg-yellow-600 text-white'
            }`}
          >
            {sending
              ? 'Sending...'
              : sendConfirm
                ? `Confirm Send to ${activeSubscriberCount} subscribers`
                : `Send to ${activeSubscriberCount} Subscribers`
            }
          </button>
        </div>
      </div>
    </div>
  );
}
