import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getProfile } from '../api/profile';

// Redirects any protected page to the onboarding wizard until the user has
// completed it. The /onboarding route itself must NOT be wrapped in this.
export default function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useQuery({ queryKey: ['profile'], queryFn: getProfile });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-500">
        Loading...
      </div>
    );
  }

  const profile = data?.profile ?? null;
  if (!profile || !profile.onboarded_at) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
