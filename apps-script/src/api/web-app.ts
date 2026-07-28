import type { ApiResult } from '@shared/contracts/api';
import { createAppsScriptProductionComposition } from '../bootstrap/create-apps-script-production-composition';

export function doGet_(): GoogleAppsScript.HTML.HtmlOutput {
  return HtmlService.createHtmlOutputFromFile('index');
}

export function invoke_(request: unknown): ApiResult<unknown> {
  const composition = createAppsScriptProductionComposition({
    now: () => new Date(),
  });
  return composition.invoke(request);
}
