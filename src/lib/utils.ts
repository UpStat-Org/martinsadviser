import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Strips characters that have special meaning inside a PostgREST `.or()`
 * filter or `ilike` pattern — commas/parens split the OR list, dots split
 * column/operator, `%` and `_` are SQL wildcards, `*` and `\` are PostgREST
 * escapes. Anything left over is safe to drop inside `%...%`.
 */
export function sanitizeSearchTerm(value: string): string {
  return value.replace(/[,%().*\\_]/g, "").trim();
}
