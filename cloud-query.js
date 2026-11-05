// supabase-js wraps IN values containing commas but does not escape embedded
// quotes/backslashes. Our item keys are JSON arrays, so escape query literals
// without changing the actual stored keys.
export const escapeRecordFilterKey=key=>key.replaceAll('\\','\\\\').replaceAll('"','\\"');
