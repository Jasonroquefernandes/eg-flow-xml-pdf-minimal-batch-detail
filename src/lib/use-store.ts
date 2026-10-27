"use client";

import { useSyncExternalStore } from "react";
import {
  getBatchesSnapshot,
  getServerBatchesSnapshot,
  getCurrentOrgId,
  getOrganizations,
  getPromoAttachments,
  getResolutions,
  getSettings,
  getRole,
  subscribeStore,
} from "@/lib/store";
import type { AppSettings, Batch, Resolution } from "@/lib/types";

const EMPTY: Batch[] = [];
const EMPTY_RESOLUTIONS: Resolution[] = [];

export function useResolutions(): Resolution[] {
  return useSyncExternalStore(
    subscribeStore,
    getResolutions,
    () => EMPTY_RESOLUTIONS,
  );
}

export function useAllBatches(): Batch[] {
  return useSyncExternalStore(
    subscribeStore,
    getBatchesSnapshot,
    getServerBatchesSnapshot,
  );
}

export function useOrgBatches(organizationId: string): Batch[] {
  const all = useAllBatches();
  if (typeof window === "undefined") return EMPTY;
  return all.filter((b) => b.organizationId === organizationId);
}

export function useOrganizations() {
  return useSyncExternalStore(
    subscribeStore,
    getOrganizations,
    getOrganizations,
  );
}

export function usePromoAttachments() {
  return useSyncExternalStore(
    subscribeStore,
    getPromoAttachments,
    getPromoAttachments,
  );
}

export function useCurrentOrgId(): string {
  return useSyncExternalStore(
    subscribeStore,
    getCurrentOrgId,
    () => "org-airtel",
  );
}

export function useRole() {
  return useSyncExternalStore(
    subscribeStore,
    getRole,
    () => "org_user" as const,
  );
}

export function useSettings(organizationId: string): AppSettings {
  return useSyncExternalStore(
    subscribeStore,
    () => getSettings(organizationId),
    () => getSettings(organizationId),
  );
}

export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
