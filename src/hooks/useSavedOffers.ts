import { useCallback, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const STORAGE_KEY = "revvin:saved-offers";
const EVENT_NAME = "revvin:saved-offers-changed";

function readLocalIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function writeLocalIds(ids: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch {
    /* no-op */
  }
}

function clearLocalIds() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch {
    /* no-op */
  }
}

/**
 * Persistent bookmarks for referral offers.
 *
 * - Signed-in users: stored in the `saved_offers` table and synced via React
 *   Query. Bookmarks follow the user across devices.
 * - Anonymous users: stored in `localStorage` so the heart still works.
 *
 * On sign-in, any locally bookmarked offers are merged into the user's
 * account (one-time migration), then the local store is cleared.
 *
 * The public API (`ids`, `isSaved`, `toggle`, `remove`, `clear`) is unchanged
 * so all existing call sites work without modification.
 */
export function useSavedOffers() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ["saved-offers", userId] as const, [userId]);

  // ---- Anonymous: local-only state mirror ----
  const localIdsRef = useRef<string[]>(readLocalIds());

  const localQuery = useQuery({
    queryKey: ["saved-offers", "local"] as const,
    queryFn: async () => readLocalIds(),
    enabled: !userId,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (userId) return;
    const sync = () => {
      localIdsRef.current = readLocalIds();
      queryClient.setQueryData(["saved-offers", "local"], localIdsRef.current);
    };
    window.addEventListener(EVENT_NAME, sync);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) sync();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVENT_NAME, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, [userId, queryClient]);

  // ---- Signed in: server state ----
  const remoteQuery = useQuery({
    queryKey,
    queryFn: async (): Promise<string[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("saved_offers")
        .select("offer_id, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: { offer_id: string }) => r.offer_id);
    },
    enabled: !!userId,
    staleTime: 60_000,
  });

  // One-time merge: when a user signs in with local bookmarks, push them
  // into their account, then wipe the local copy.
  const mergedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!userId) return;
    if (mergedRef.current === userId) return;
    const local = readLocalIds();
    if (local.length === 0) {
      mergedRef.current = userId;
      return;
    }
    (async () => {
      const rows = local.map((offer_id) => ({ user_id: userId, offer_id }));
      // upsert with onConflict so existing bookmarks aren't duplicated
      const { error } = await supabase
        .from("saved_offers")
        .upsert(rows, { onConflict: "user_id,offer_id", ignoreDuplicates: true });
      if (!error) {
        clearLocalIds();
        mergedRef.current = userId;
        queryClient.invalidateQueries({ queryKey });
      }
    })();
  }, [userId, queryClient, queryKey]);

  const ids = userId ? remoteQuery.data ?? [] : localQuery.data ?? localIdsRef.current;

  // ---- Mutations (signed-in path) ----
  const addMutation = useMutation({
    mutationFn: async (offerId: string) => {
      if (!userId) throw new Error("not authenticated");
      const { error } = await supabase
        .from("saved_offers")
        .upsert(
          { user_id: userId, offer_id: offerId },
          { onConflict: "user_id,offer_id", ignoreDuplicates: true },
        );
      if (error) throw error;
    },
    onMutate: async (offerId) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<string[]>(queryKey) ?? [];
      if (!prev.includes(offerId)) {
        queryClient.setQueryData<string[]>(queryKey, [offerId, ...prev]);
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const removeMutation = useMutation({
    mutationFn: async (offerId: string) => {
      if (!userId) throw new Error("not authenticated");
      const { error } = await supabase
        .from("saved_offers")
        .delete()
        .eq("user_id", userId)
        .eq("offer_id", offerId);
      if (error) throw error;
    },
    onMutate: async (offerId) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<string[]>(queryKey) ?? [];
      queryClient.setQueryData<string[]>(
        queryKey,
        prev.filter((x) => x !== offerId),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const isSaved = useCallback((id: string) => ids.includes(id), [ids]);

  const toggle = useCallback(
    (id: string): boolean => {
      const willBeSaved = !ids.includes(id);
      if (userId) {
        if (willBeSaved) addMutation.mutate(id);
        else removeMutation.mutate(id);
      } else {
        const next = willBeSaved ? [id, ...ids] : ids.filter((x) => x !== id);
        writeLocalIds(next);
      }
      return willBeSaved;
    },
    [ids, userId, addMutation, removeMutation],
  );

  const remove = useCallback(
    (id: string) => {
      if (!ids.includes(id)) return;
      if (userId) removeMutation.mutate(id);
      else writeLocalIds(ids.filter((x) => x !== id));
    },
    [ids, userId, removeMutation],
  );

  const clear = useCallback(async () => {
    if (userId) {
      const prev = queryClient.getQueryData<string[]>(queryKey) ?? [];
      queryClient.setQueryData<string[]>(queryKey, []);
      const { error } = await supabase
        .from("saved_offers")
        .delete()
        .eq("user_id", userId);
      if (error) {
        queryClient.setQueryData(queryKey, prev);
      }
      queryClient.invalidateQueries({ queryKey });
    } else {
      clearLocalIds();
    }
  }, [userId, queryClient, queryKey]);

  return {
    ids,
    isSaved,
    toggle,
    remove,
    clear,
    /** True while initial fetch from the user's account is in flight. */
    isLoading: !!userId && remoteQuery.isLoading,
    /** True if these bookmarks are stored in the signed-in account. */
    isSynced: !!userId,
  };
}
