import {
  type AppsScriptTriggerService,
  type WarmupTriggerInstallResult,
  type WarmupTriggerManagerDependencies,
  type WarmupTriggerRemoveResult,
  type WarmupTriggerStatusResult,
} from './warmup-trigger-manager';

export const scheduledWorkerHandlerFunction = 'scheduledWorker_';
export const scheduledWorkerIntervalMinutes = 5;

export type ScheduledWorkerTriggerManagerDependencies = WarmupTriggerManagerDependencies;
export type ScheduledWorkerTriggerInstallResult = WarmupTriggerInstallResult;
export type ScheduledWorkerTriggerRemoveResult = WarmupTriggerRemoveResult;
export type ScheduledWorkerTriggerStatusResult = WarmupTriggerStatusResult;

export function installScheduledWorkerTrigger(
  deps: ScheduledWorkerTriggerManagerDependencies,
): ScheduledWorkerTriggerInstallResult {
  const handlerName = deps.handlerName ?? scheduledWorkerHandlerFunction;
  const intervalMinutes = deps.intervalMinutes ?? scheduledWorkerIntervalMinutes;
  const removed = deleteTriggersByHandler(deps.scriptApp, handlerName);

  deps.scriptApp.newTrigger(handlerName).timeBased().everyMinutes(intervalMinutes).create();

  return {
    handlerName,
    intervalMinutes,
    removedCount: removed,
    triggerCount: countTriggersByHandler(deps.scriptApp, handlerName),
  };
}

export function removeScheduledWorkerTriggers(
  deps: ScheduledWorkerTriggerManagerDependencies,
): ScheduledWorkerTriggerRemoveResult {
  const handlerName = deps.handlerName ?? scheduledWorkerHandlerFunction;

  return {
    handlerName,
    removedCount: deleteTriggersByHandler(deps.scriptApp, handlerName),
    triggerCount: countTriggersByHandler(deps.scriptApp, handlerName),
  };
}

export function getScheduledWorkerTriggerStatus(
  deps: ScheduledWorkerTriggerManagerDependencies,
): ScheduledWorkerTriggerStatusResult {
  const handlerName = deps.handlerName ?? scheduledWorkerHandlerFunction;

  return {
    handlerName,
    intervalMinutes: deps.intervalMinutes ?? scheduledWorkerIntervalMinutes,
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
