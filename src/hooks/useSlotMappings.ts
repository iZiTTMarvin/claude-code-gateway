/**
 * Claude Code 槽位映射 Hook
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { randomUUID } from '../../shared/utils';
import type { AppConfig, RouteMapping } from '../../shared/types';
import * as ipc from '../lib/ipc';

export const SLOT_KEYS = ['main', 'thinking', 'opus', 'sonnet', 'haiku'] as const;

export type SlotKey = (typeof SLOT_KEYS)[number];

export interface SlotMappingDraft {
  readonly slot: SlotKey;
  readonly providerId: string;
  readonly modelId: string;
  readonly source: 'discovered' | 'custom';
}

type SlotMappingLike = {
  readonly slot: string;
  readonly providerId: string;
  readonly modelId: string;
  readonly source?: 'discovered' | 'custom';
};

const EMPTY_SLOT_MAPPINGS: Record<SlotKey, SlotMappingDraft> = {
  main: { slot: 'main', providerId: '', modelId: '', source: 'discovered' },
  thinking: { slot: 'thinking', providerId: '', modelId: '', source: 'discovered' },
  opus: { slot: 'opus', providerId: '', modelId: '', source: 'discovered' },
  sonnet: { slot: 'sonnet', providerId: '', modelId: '', source: 'discovered' },
  haiku: { slot: 'haiku', providerId: '', modelId: '', source: 'discovered' },
};

function isSlotKey(value: string): value is SlotKey {
  return SLOT_KEYS.includes(value as SlotKey);
}

function isSlotMappingArray(value: unknown): value is readonly SlotMappingLike[] {
  return Array.isArray(value);
}

function isRouteMappingArray(value: unknown): value is readonly RouteMapping[] {
  return Array.isArray(value);
}

function toSlotMapFromConfig(config: AppConfig): Record<SlotKey, SlotMappingDraft> {
  const maybeConfig = config as AppConfig & { slotMappings?: unknown; routes?: unknown };
  const next: Record<SlotKey, SlotMappingDraft> = { ...EMPTY_SLOT_MAPPINGS };

  if (isSlotMappingArray(maybeConfig.slotMappings)) {
    for (const mapping of maybeConfig.slotMappings) {
      if (!isSlotKey(mapping.slot)) {
        continue;
      }
      next[mapping.slot] = {
        slot: mapping.slot,
        providerId: mapping.providerId ?? '',
        modelId: mapping.modelId ?? '',
        source: mapping.source === 'custom' ? 'custom' : 'discovered',
      };
    }
    return next;
  }

  if (isRouteMappingArray(maybeConfig.routes)) {
    for (const route of maybeConfig.routes) {
      const logicalModel = route.logicalModel.toLowerCase();
      if (!isSlotKey(logicalModel)) {
        continue;
      }
      next[logicalModel] = {
        slot: logicalModel,
        providerId: route.providerId,
        modelId: route.actualModel,
        source: 'custom',
      };
    }
  }

  return next;
}

function hasSlotMappingsField(config: AppConfig): boolean {
  return 'slotMappings' in (config as AppConfig & { slotMappings?: unknown });
}

function toLegacyRoutes(
  config: AppConfig,
  mappings: readonly SlotMappingDraft[],
): readonly RouteMapping[] {
  const maybeConfig = config as AppConfig & { routes?: unknown };
  const existingRoutes = isRouteMappingArray(maybeConfig.routes) ? maybeConfig.routes : [];

  const nonSlotRoutes = existingRoutes.filter(route => !isSlotKey(route.logicalModel.toLowerCase()));

  const slotRoutes: RouteMapping[] = mappings
    .filter(mapping => mapping.providerId && mapping.modelId)
    .map(mapping => {
      const existing = existingRoutes.find(
        route => route.logicalModel.toLowerCase() === mapping.slot,
      );
      return {
        id: existing?.id ?? randomUUID(),
        logicalModel: mapping.slot,
        providerId: mapping.providerId,
        actualModel: mapping.modelId,
      };
    });

  return [...nonSlotRoutes, ...slotRoutes];
}

export function useSlotMappings(config: AppConfig | null, setConfig: (config: AppConfig) => void) {
  const [slotMappings, setSlotMappings] =
    useState<Record<SlotKey, SlotMappingDraft>>(EMPTY_SLOT_MAPPINGS);
  const [savingSlot, setSavingSlot] = useState<SlotKey | null>(null);

  useEffect(() => {
    if (!config) {
      setSlotMappings(EMPTY_SLOT_MAPPINGS);
      return;
    }
    setSlotMappings(toSlotMapFromConfig(config));
  }, [config]);

  const mappingsList = useMemo(
    () => SLOT_KEYS.map(slot => slotMappings[slot]),
    [slotMappings],
  );

  const saveSlotMapping = useCallback(
    async (slot: SlotKey, draft: Omit<SlotMappingDraft, 'slot'>) => {
      if (!config) return;

      const normalized: SlotMappingDraft = {
        slot,
        providerId: draft.providerId,
        modelId: draft.modelId.trim(),
        source: draft.source,
      };

      const nextMappings = {
        ...slotMappings,
        [slot]: normalized,
      };

      setSavingSlot(slot);
      try {
        const allMappings = SLOT_KEYS.map(key => nextMappings[key]);
        const patch: Record<string, unknown> = {};
        if (hasSlotMappingsField(config)) {
          patch.slotMappings = allMappings;
        } else {
          patch.routes = toLegacyRoutes(config, allMappings);
        }
        const updated = await ipc.saveConfig(patch as Partial<AppConfig>);
        setConfig(updated);
      } finally {
        setSavingSlot(current => (current === slot ? null : current));
      }
    },
    [config, setConfig, slotMappings],
  );

  const clearSlotMapping = useCallback(
    async (slot: SlotKey) => {
      await saveSlotMapping(slot, {
        providerId: '',
        modelId: '',
        source: 'custom',
      });
    },
    [saveSlotMapping],
  );

  const mappedCount = useMemo(
    () => mappingsList.filter(mapping => mapping.providerId && mapping.modelId).length,
    [mappingsList],
  );

  return {
    slotMappings,
    mappingsList,
    mappedCount,
    savingSlot,
    saveSlotMapping,
    clearSlotMapping,
  } as const;
}
