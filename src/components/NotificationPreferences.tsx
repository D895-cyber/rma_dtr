import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Mail, Smartphone, Loader2, Save } from 'lucide-react';
import { notificationPreferenceService, NotificationPreference } from '../services/notificationPreference.service';

export function NotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreference | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const response = await notificationPreferenceService.getPreferences();
      if (response.success) {
        setPreferences(response.data.preferences);
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!preferences) return;

    try {
      setSaving(true);
      await notificationPreferenceService.updatePreferences(preferences);
      toast.success('Notification preferences saved');
    } catch (error) {
      console.error('Failed to save preferences:', error);
      alert('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (key: keyof NotificationPreference, value: boolean) => {
    if (!preferences) return;
    setPreferences({ ...preferences, [key]: value });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!preferences) {
    return <div className="p-4 text-gray-500">Failed to load preferences</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notification Preferences</h3>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Preferences</span>
            </>
          )}
        </button>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Choose what you get so it&apos;s useful, not noisy. In-app + optional email by category.
      </p>

      {/* Email Notifications */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <Mail className="w-5 h-5" />
          <h4 className="font-medium">Email</h4>
        </div>
        <div className="space-y-3 pl-7">
          <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
            <span className="text-sm text-gray-700 dark:text-gray-300">Assignee (case assigned to you)</span>
            <input
              type="checkbox"
              checked={preferences.emailCaseAssigned}
              onChange={(e) => updatePreference('emailCaseAssigned', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
          </label>
          <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
            <span className="text-sm text-gray-700 dark:text-gray-300">Status change</span>
            <input
              type="checkbox"
              checked={preferences.emailStatusChanged}
              onChange={(e) => updatePreference('emailStatusChanged', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
          </label>
          <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
            <span className="text-sm text-gray-700 dark:text-gray-300">Comment / mention</span>
            <input
              type="checkbox"
              checked={preferences.emailCommentAdded}
              onChange={(e) => updatePreference('emailCommentAdded', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
          </label>
          <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
            <span className="text-sm text-gray-700 dark:text-gray-300">Due soon / overdue alert</span>
            <input
              type="checkbox"
              checked={preferences.emailOverdueAlert}
              onChange={(e) => updatePreference('emailOverdueAlert', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
          </label>
          <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
            <span className="text-sm text-gray-700 dark:text-gray-300">Escalation</span>
            <input
              type="checkbox"
              checked={preferences.emailEscalation}
              onChange={(e) => updatePreference('emailEscalation', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
          </label>
        </div>
      </div>

      {/* In-App Notifications */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <Smartphone className="w-5 h-5" />
          <h4 className="font-medium">In-app</h4>
        </div>
        <div className="space-y-3 pl-7">
          <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
            <span className="text-sm text-gray-700 dark:text-gray-300">Assignee</span>
            <input
              type="checkbox"
              checked={preferences.inAppCaseAssigned}
              onChange={(e) => updatePreference('inAppCaseAssigned', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
          </label>
          <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
            <span className="text-sm text-gray-700 dark:text-gray-300">Status change</span>
            <input
              type="checkbox"
              checked={preferences.inAppStatusChanged}
              onChange={(e) => updatePreference('inAppStatusChanged', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
          </label>
          <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
            <span className="text-sm text-gray-700 dark:text-gray-300">Due soon / overdue</span>
            <input
              type="checkbox"
              checked={preferences.inAppOverdueAlert}
              onChange={(e) => updatePreference('inAppOverdueAlert', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
          </label>
        </div>
      </div>
    </div>
  );
}

