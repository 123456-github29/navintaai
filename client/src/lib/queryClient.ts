import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { supabase } from "./supabase";

function sanitizeText(text: string): string {
  if (!text) return "";
  return text
    .normalize("NFC")
    .replace(/[\u2028\u2029]/g, "\n")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "");
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const rawText = (await res.text()) || res.statusText;
    const text = sanitizeText(rawText);
    throw new Error(`${res.status}: ${text}`);
  }
}

async function getAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    ...(data ? { "Content-Type": "application/json" } : {}),
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
  };
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
    async ({ queryKey }) => {
      const token = await getAccessToken();
      const url = queryKey.join("/") as string;
      
      console.log(`[queryFn] Fetching ${url}, hasToken: ${!!token}`);
      
      const res = await fetch(url, {
        credentials: "include",
        headers: {
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
      });

      console.log(`[queryFn] Response for ${url}: ${res.status}`);

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.log(`[queryFn] Returning null for 401 on ${url}`);
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      staleTime: 30 * 1000, // 30 seconds
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
