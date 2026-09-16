/** Preserve useful API errors without assuming thrown values are Error objects. */
export function getErrorMessage(value: unknown): string {
  if (value instanceof Error) return value.message;
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "message" in value) {
    return String(value.message);
  }
  return "Unexpected error";
}
