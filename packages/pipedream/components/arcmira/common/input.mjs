export function text(value, name, {
  optional = false, max = Infinity,
} = {}) {
  if (optional && (value === undefined || value === null || value === "")) return undefined;
  if (typeof value !== "string" || value.trim().length < 2 || value.trim().length > max) {
    throw new Error(`${name} must contain at least two characters${max === Infinity
      ? ""
      : ` and at most ${max}`}.`);
  }
  return value.trim();
}

export function integer(value, name, max, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (!Number.isInteger(value) || value < 1 || value > max) throw new Error(`${name} must be an integer from 1 to ${max}.`);
  return value;
}

export function option(value, name, options) {
  if (value === undefined || value === null || value === "") return undefined;
  if (!options.includes(value)) throw new Error(`${name} must be one of: ${options.join(", ")}.`);
  return value;
}

export function ids(value, name, pattern) {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value) || value.length > 8 || value.some((id) => typeof id !== "string" || !pattern.test(id))) {
    throw new Error(`${name} accepts up to eight canonical IDs. Resolve names separately and confirm the intended match.`);
  }
  return value.length
    ? value.join(",")
    : undefined;
}

export const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/;
export const ENTITY_ID = /^ent_\d+$/;
export const SOURCES = [
  "arcmira_premium",
  "creator_captions",
  "third_party_quick",
];
export const ENTITY_TYPES = [
  "person",
  "organization",
  "product",
  "topic",
  "channel",
];
export const SPONSOR_STATUSES = [
  "active",
  "lapsed",
  "ended",
  "uncertain",
];
