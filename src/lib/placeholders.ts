/**
 * Replaces placeholders like {company_name}, {dot}, etc. with actual client data.
 */
export function replacePlaceholders(
  text: string,
  client?: { company_name?: string; dot?: string | null; mc?: string | null; ein?: string | null; email?: string | null; phone?: string | null } | null
): string {
  if (!client) return text;
  return text
    .replace(/\{company_name\}/g, client.company_name || "")
    .replace(/\{dot\}/g, client.dot || "")
    .replace(/\{mc\}/g, client.mc || "")
    .replace(/\{ein\}/g, client.ein || "")
    .replace(/\{email\}/g, client.email || "")
    .replace(/\{phone\}/g, client.phone || "");
}
