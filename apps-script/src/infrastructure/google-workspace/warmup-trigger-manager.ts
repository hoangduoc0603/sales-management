export const warmupHandlerFunction = 'warmRuntime_';
export const warmupIntervalMinutes = 5;

export interface AppsScriptTrigger {
  getHandlerFunction(): string;
}

export interface AppsScriptTriggerBuilder {
  timeBased(): AppsScriptClockTriggerBuilder;
}

export interface AppsScriptClockTriggerBuilder {
  everyMinutes(intervalMinutes: number): AppsScriptClockTriggerBuilder;
  create(): AppsScriptTrigger;
}

export interface AppsScriptTriggerService {
  getProjectTriggers(): AppsScriptTrigger[];
  newTrigger(handlerName: string): AppsScriptTriggerBuilder;
  deleteTrigger(trigger: AppsScriptTrigger): unknown;
}

export interface WarmupTriggerManagerDependencies {
  scriptApp: AppsScriptTriggerService;
  handlerName?: string;
  intervalMinutes?: number;
}

export interface WarmupTriggerInstallResult {
  handlerName: string;
  intervalMinutes: number;
  removedCount: number;
  triggerCount: number;
}

export interface WarmupTriggerRemoveResult {
  handlerName: string;
  removedCount: number;
  triggerCount: number;
}

export interface WarmupTriggerStatusResult {
  handlerName: string;
  intervalMinutes: number;
  triggerCount: number;
}

export function installWarmupTrigger(deps: WarmupTriggerManagerDependencies): WarmupTriggerInstallResult {
  const handlerName = deps.handlerName ?? warmupHandlerFunction;
  const intervalMinutes = deps.intervalMinutes ?? warmupIntervalMinutes;
  const removed = deleteTriggersByHandler(deps.scriptApp, handlerName);

  deps.scriptApp.newTrigger(handlerName).timeBased().everyMinutes(intervalMinutes).create();

  return {
    handlerName,
    intervalMinutes,
    removedCount: removed,
    triggerCount: countTriggersByHandler(deps.scriptApp, handlerName),
  };
}

export function removeWarmupTriggers(deps: WarmupTriggerManagerDependencies): WarmupTriggerRemoveResult {
  const handlerName = deps.handlerName ?? warmupHandlerFunction;

  return {
    handlerName,
    removedCount: deleteTriggersByHandler(deps.scriptApp, handlerName),
    triggerCount: countTriggersByHandler(deps.scriptApp, handlerName),
  };
}

export function getWarmupTriggerStatus(deps: WarmupTriggerManagerDependencies): WarmupTriggerStatusResult {
  const handlerName = deps.handlerName ?? warmupHandlerFunction;

  return {
    handlerName,
    intervalMinutes: deps.intervalMinutes ?? warmupIntervalMinutes,
    triggerCount: countTriggersByHandler(deps.scriptApp, handlerName),
  };
}

function deleteTriggersByHandler(scriptApp: AppsScriptTriggerService, handlerName: string): number {
  let removedCount = 0;
  for (const trigger of [...scriptApp.getProjectTriggers()]) {
    if (trigger.getHandlerFunction() !== handlerName) continue;
    scriptApp.deleteTrigger(trigger);
    removedCount += 1;
  }
  return removedCount;
}

function countTriggersByHandler(scriptApp: AppsScriptTriggerService, handlerName: string): number {
  return scriptApp
    .getProjectTriggers()
    .filter((trigger) => trigger.getHandlerFunction() === handlerName)
    .length;
}
