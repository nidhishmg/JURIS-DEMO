import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  // For local development, always return authenticated
  const mockUser = {
    id: "local-user",
    email: "developer@localhost", 
    name: "Local Developer"
  };

  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    initialData: mockUser, // Provide initial data so it's immediately available
    staleTime: Infinity, // Keep the data fresh indefinitely for local dev
  });

  return {
    user: user || mockUser,
    isLoading: false, // Never loading in local mode
    isAuthenticated: true, // Always authenticated in local mode
  };
}
