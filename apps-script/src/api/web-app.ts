import type { ApiResult } from '@shared/contracts/api';
import { createApiComposition } from '../bootstrap/create-api-composition';

const composition = createApiComposition({
  now: () => new Date(),
});

export function doGet_(): GoogleAppsScript.HTML.HtmlOutput {
  return HtmlService.createHtmlOutputFromFile('index');
}

export function invoke_(request: unknown): ApiResult<unknown> {
  return composition.invoke(request);
}
