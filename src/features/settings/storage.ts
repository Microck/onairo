import {
  DEFAULT_LOCAL_SETTINGS,
  DEFAULT_SYNC_SETTINGS,
  type LastRunRecord,
  type LocalSettings,
  type SettingsSnapshot,
  type SyncSettings,
} from "@/features/settings/schema"

const SYNC_KEY = "onairo_sync_settings"
const LOCAL_KEY = "onairo_local_settings"
const LAST_RUN_KEY = "onairo_last_run"

export async function getSyncSettings(): Promise<SyncSettings> {
  const stored = await chrome.storage.sync.get(SYNC_KEY)
  return mergeSync(stored[SYNC_KEY] as Partial<SyncSettings> | undefined)
}

export async function saveSyncSettings(settings: SyncSettings): Promise<void> {
  await chrome.storage.sync.set({ [SYNC_KEY]: settings })
}

export async function updateSyncSettings(
  updater: (current: SyncSettings) => SyncSettings,
): Promise<SyncSettings> {
  const current = await getSyncSettings()
  const next = updater(current)
  await saveSyncSettings(next)
  return next
}

export async function getLocalSettings(): Promise<LocalSettings> {
  const stored = await chrome.storage.local.get(LOCAL_KEY)
  return mergeLocal(stored[LOCAL_KEY] as Partial<LocalSettings> | undefined)
}

export async function saveLocalSettings(settings: LocalSettings): Promise<void> {
  await chrome.storage.local.set({ [LOCAL_KEY]: settings })
}

export async function getSettingsSnapshot(): Promise<SettingsSnapshot> {
  const [sync, local] = await Promise.all([getSyncSettings(), getLocalSettings()])
  return { sync, local }
}

export async function applySettingsSnapshot(snapshot: SettingsSnapshot): Promise<void> {
  await Promise.all([saveSyncSettings(mergeSync(snapshot.sync)), saveLocalSettings(mergeLocal(snapshot.local))])
}

export async function exportSettingsSnapshot(includeSecrets: boolean): Promise<Record<string, unknown>> {
  const { sync, local } = await getSettingsSnapshot()
  if (includeSecrets) {
    return { sync, local }
  }
  return {
    sync,
    local: {
      ...local,
      kimi: { ...local.kimi, apiKey: "" },
      openrouter: { ...local.openrouter, apiKey: "" },
      zai: { ...local.zai, apiKey: "" },
      custom: { ...local.custom, apiKey: "" },
    },
  }
}

export async function getLastRun(): Promise<LastRunRecord | null> {
  const stored = await chrome.storage.local.get(LAST_RUN_KEY)
  const lastRun = stored[LAST_RUN_KEY] as LastRunRecord | undefined
  if (!lastRun) return null
  if (lastRun.expiresAt && lastRun.expiresAt <= Date.now()) {
    await clearLastRun()
    return null
  }
  return lastRun
}

export async function setLastRun(record: LastRunRecord): Promise<void> {
  await chrome.storage.local.set({ [LAST_RUN_KEY]: record })
}

export async function clearLastRun(): Promise<void> {
  await chrome.storage.local.remove(LAST_RUN_KEY)
}

function mergeSync(partial: Partial<SyncSettings> | undefined): SyncSettings {
  return {
    ...DEFAULT_SYNC_SETTINGS,
    ...partial,
    behavior: { ...DEFAULT_SYNC_SETTINGS.behavior, ...partial?.behavior },
    hotkeys: { ...DEFAULT_SYNC_SETTINGS.hotkeys, ...partial?.hotkeys },
    overlay: { ...DEFAULT_SYNC_SETTINGS.overlay, ...partial?.overlay },
    profile: { ...DEFAULT_SYNC_SETTINGS.profile, ...partial?.profile },
    prompts: { ...DEFAULT_SYNC_SETTINGS.prompts, ...partial?.prompts },
    selectionColors: {
      ...DEFAULT_SYNC_SETTINGS.selectionColors,
      ...partial?.selectionColors,
    },
    typing: { ...DEFAULT_SYNC_SETTINGS.typing, ...partial?.typing },
  }
}

function mergeLocal(partial: Partial<LocalSettings> | undefined): LocalSettings {
  return {
    ...DEFAULT_LOCAL_SETTINGS,
    ...partial,
    codex: { ...DEFAULT_LOCAL_SETTINGS.codex, ...partial?.codex },
    custom: { ...DEFAULT_LOCAL_SETTINGS.custom, ...partial?.custom },
    kimi: { ...DEFAULT_LOCAL_SETTINGS.kimi, ...partial?.kimi },
    openrouter: {
      ...DEFAULT_LOCAL_SETTINGS.openrouter,
      ...partial?.openrouter,
    },
    zai: { ...DEFAULT_LOCAL_SETTINGS.zai, ...partial?.zai },
  }
}
