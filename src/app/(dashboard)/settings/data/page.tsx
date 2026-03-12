'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Globe, Download, Trash2, AlertTriangle, Eraser } from 'lucide-react';
import type { DataRegion } from '@/lib/db/types';

type ClearWindow = 'hour' | 'day' | 'week' | 'all';

const CLEAR_OPTIONS: { value: ClearWindow; label: string; description: string }[] = [
  { value: 'hour', label: 'Past hour',  description: 'Remove activity, briefings, and context from the last 60 minutes.' },
  { value: 'day',  label: 'Past day',   description: 'Remove everything captured in the last 24 hours.' },
  { value: 'week', label: 'Past week',  description: 'Remove everything captured in the last 7 days.' },
  { value: 'all',  label: 'All history & context', description: 'Wipe all activity sessions, briefings, inbox items, context memory, and chat history.' },
];

const DATA_REGIONS: { value: DataRegion; label: string; description: string }[] = [
  {
    value: 'me-south-1',
    label: 'Middle East (Bahrain)',
    description: 'AWS me-south-1 — default region',
  },
  {
    value: 'eu-central-1',
    label: 'Europe (Frankfurt)',
    description: 'AWS eu-central-1 — GDPR jurisdiction',
  },
  {
    value: 'us-east-1',
    label: 'United States (Virginia)',
    description: 'AWS us-east-1',
  },
];

export default function DataSettingsPage() {
  const [currentRegion, setCurrentRegion] = useState<DataRegion | null>(null);
  const [loadingRegion, setLoadingRegion] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [clearSelected, setClearSelected] = useState<ClearWindow | null>(null);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/profile');
      if (res.ok) {
        const data = await res.json();
        setCurrentRegion(data.data_region ?? 'me-south-1');
      }
    } finally {
      setLoadingRegion(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  async function handleExport() {
    setExportLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/settings/data/export', { method: 'POST' });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Export queued — you will receive a download link by email within a few minutes.' });
      } else {
        setMessage({ type: 'error', text: 'Export failed. Please try again.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Export failed. Please try again.' });
    } finally {
      setExportLoading(false);
    }
  }

  async function handleClearData() {
    if (!clearSelected) return;
    if (!clearConfirm) {
      setClearConfirm(true);
      return;
    }
    setClearLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/settings/data/clear?window=${clearSelected}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const label = CLEAR_OPTIONS.find((o) => o.value === clearSelected)?.label.toLowerCase();
        setMessage({ type: 'success', text: `Data cleared — ${label} has been removed.` });
        setClearSelected(null);
      } else {
        setMessage({ type: 'error', text: 'Clear failed. Please try again.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Clear failed. Please try again.' });
    } finally {
      setClearLoading(false);
      setClearConfirm(false);
    }
  }

  async function handleDeleteAccount() {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    setDeleteLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/settings/data/delete-account', { method: 'DELETE' });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Account deletion requested. You will be signed out shortly.' });
      } else {
        setMessage({ type: 'error', text: 'Deletion request failed. Please try again or contact support.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Deletion request failed. Please try again or contact support.' });
    } finally {
      setDeleteLoading(false);
      setDeleteConfirm(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Data</h1>
        <p className="text-sm text-muted-foreground">
          Manage your data region, export your data, and delete your account.
        </p>
      </div>

      {message && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Data Region */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4" />
            Data region
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Your data is stored and processed in the region below. Changing region requires a full
            data migration and may take several minutes.
          </p>
          {loadingRegion ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : (
            <div className="space-y-2">
              {DATA_REGIONS.map((region) => (
                <div
                  key={region.value}
                  className={`flex items-center justify-between rounded-lg border p-4 ${
                    currentRegion === region.value ? 'border-primary bg-primary/5' : ''
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium">{region.label}</p>
                    <p className="text-xs text-muted-foreground">{region.description}</p>
                  </div>
                  {currentRegion === region.value ? (
                    <Badge variant="default">Active</Badge>
                  ) : (
                    <Badge variant="outline">Unavailable</Badge>
                  )}
                </div>
              ))}
              <p className="pt-1 text-xs text-muted-foreground">
                Region migration is not self-serve. Contact support to request a region change.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Download className="h-4 w-4" />
            Export your data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Download a full archive of your Donna data including briefings, commitments, contacts,
            and inbox history. The export is prepared as a JSON archive and sent to your registered
            email address.
          </p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {['Briefings and briefing items', 'Commitments', 'Contacts and relationship data', 'Inbox items', 'Audit logs'].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                {item}
              </li>
            ))}
          </ul>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={exportLoading}
            className="gap-2"
          >
            {exportLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {exportLoading ? 'Requesting export…' : 'Request data export'}
          </Button>
        </CardContent>
      </Card>

      {/* Clear Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Eraser className="h-4 w-4" />
            Clear data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Remove captured activity, briefings, inbox items, context memory, and chat history for
            a specific time window. Your account, integrations, and commitments are not affected.
          </p>

          <div className="space-y-2">
            {CLEAR_OPTIONS.map((option) => {
              const isAll = option.value === 'all';
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setClearSelected(option.value);
                    setClearConfirm(false);
                  }}
                  className={`w-full rounded-lg border px-4 py-3 text-left transition-colors ${
                    clearSelected === option.value
                      ? isAll
                        ? 'border-destructive/60 bg-destructive/5'
                        : 'border-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <p className={`text-sm font-medium ${isAll && clearSelected === option.value ? 'text-destructive' : ''}`}>
                    {option.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </button>
              );
            })}
          </div>

          {clearSelected && clearConfirm && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-300/60 bg-amber-50 px-4 py-3 dark:border-amber-700/40 dark:bg-amber-950/30">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-sm text-amber-800 dark:text-amber-300">
                This will permanently delete the selected data. Click{' '}
                <strong>Confirm clear</strong> to proceed.
              </p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button
              variant={clearSelected === 'all' ? 'destructive' : 'outline'}
              onClick={handleClearData}
              disabled={!clearSelected || clearLoading}
              className="gap-2"
            >
              {clearLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Eraser className="h-4 w-4" />
              )}
              {clearLoading ? 'Clearing…' : clearConfirm ? 'Confirm clear' : 'Clear selected'}
            </Button>
            {clearSelected && !clearLoading && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setClearSelected(null);
                  setClearConfirm(false);
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Account */}
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <Trash2 className="h-4 w-4" />
            Delete account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Permanently delete your account and all associated data. This action is irreversible.
            All your briefings, commitments, contacts, and integration connections will be removed
            immediately.
          </p>
          {deleteConfirm && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
              <p className="text-sm text-destructive">
                Are you sure? This cannot be undone. Click <strong>Delete account</strong> again to
                confirm.
              </p>
            </div>
          )}
          <Button
            variant="destructive"
            onClick={handleDeleteAccount}
            disabled={deleteLoading}
            className="gap-2"
          >
            {deleteLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {deleteLoading ? 'Deleting…' : deleteConfirm ? 'Delete account' : 'Delete my account'}
          </Button>
          {deleteConfirm && !deleteLoading && (
            <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(false)}>
              Cancel
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
