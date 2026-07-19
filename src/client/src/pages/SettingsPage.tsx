import { useState, FormEvent, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProfile, updateProfile } from '../api/profile';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ['profile'], queryFn: getProfile });
  const profile = data?.profile ?? null;

  const [displayName, setDisplayName] = useState('');
  const [timezone, setTimezone] = useState('');
  const [briefHour, setBriefHour] = useState(8);
  const [interestsText, setInterestsText] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name);
      setTimezone(profile.timezone);
      setBriefHour(profile.brief_hour);
      setInterestsText(profile.interests.join(', '));
    }
  }, [profile]);

  const save = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setMessage('Saved.');
    },
    onError: (err: unknown) =>
      setMessage(err instanceof Error ? err.message : 'Failed to save'),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage('');
    save.mutate({
      display_name: displayName,
      timezone,
      brief_hour: briefHour,
      interests: interestsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    });
  }

  if (!profile) return null;

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Settings</h2>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-sm text-gray-500 mb-4">
          Agent address: <span className="font-mono text-gray-700">{profile.agent_address}</span>
        </p>
        {message && (
          <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded" role="status">
            {message}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="display_name" className="block text-sm font-medium text-gray-700">
              Display name
            </label>
            <input
              id="display_name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="mt-1 block w-full rounded border-gray-300 p-2 border"
            />
          </div>
          <div>
            <label htmlFor="timezone" className="block text-sm font-medium text-gray-700">
              Timezone
            </label>
            <input
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              required
              className="mt-1 block w-full rounded border-gray-300 p-2 border"
            />
          </div>
          <div>
            <label htmlFor="brief_hour" className="block text-sm font-medium text-gray-700">
              Daily brief hour (0–23)
            </label>
            <input
              id="brief_hour"
              type="number"
              min={0}
              max={23}
              value={briefHour}
              onChange={(e) => setBriefHour(Number(e.target.value))}
              className="mt-1 block w-32 rounded border-gray-300 p-2 border"
            />
          </div>
          <div>
            <label htmlFor="interests" className="block text-sm font-medium text-gray-700">
              Interests (comma-separated)
            </label>
            <input
              id="interests"
              value={interestsText}
              onChange={(e) => setInterestsText(e.target.value)}
              className="mt-1 block w-full rounded border-gray-300 p-2 border"
            />
          </div>
          <button
            type="submit"
            disabled={save.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {save.isPending ? 'Saving...' : 'Save'}
          </button>
        </form>
      </div>
    </div>
  );
}
