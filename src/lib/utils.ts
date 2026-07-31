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

/**
 * Pulls a displayable message out of a caught value. Lets `catch (e)` stay
 * `unknown` instead of widening to `any` just to reach `.message` — Supabase
 * and fetch both throw plain objects that aren't Error instances.
 */
export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return "Unexpected error";
}
