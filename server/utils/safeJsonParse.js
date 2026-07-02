/**
 * @file safeJsonParse.js
 * @description Safe JSON parsing utility that handles markdown code fences,
 * leading/trailing junk, and performs basic extraction to avoid crashes.
 */

function safeJsonParse(raw) {
  if (!raw || typeof raw !== 'string') return null;

  // Attempt 1: parse as-is
  try { 
    return JSON.parse(raw); 
  } catch (e) {}

  // Attempt 2: strip markdown code fences
  const stripped = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  try { 
    return JSON.parse(stripped); 
  } catch (e) {}

  // Attempt 3: extract first {...} or [...] block
  const objMatch = stripped.match(/(\{[\s\S]*\})/);
  if (objMatch) {
    try { 
      return JSON.parse(objMatch[1]); 
    } catch (e) {}
  }
  const arrMatch = stripped.match(/(\[[\s\S]*\])/);
  if (arrMatch) {
    try { 
      return JSON.parse(arrMatch[1]); 
    } catch (e) {}
  }

  // All attempts failed
  return null;
}

module.exports = { safeJsonParse };
