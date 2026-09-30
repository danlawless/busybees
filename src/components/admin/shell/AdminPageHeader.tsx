import type { ReactNode } from 'react';

export function AdminPageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-charcoal-800/10 pb-4">
      <div>
        <h1 className="text-2xl font-bold text-charcoal-800">{title}</h1>
        {description && <p className="mt-1 text-sm text-charcoal-800/70">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </header>
  );
}
