import { format } from "date-fns";

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

interface ClientData {
  company_name: string;
  dot?: string | null;
  mc?: string | null;
  ein?: string | null;
}

interface PermitData {
  permit_type: string;
  permit_number?: string | null;
  state?: string | null;
  expiration_date?: string | null;
}

function getPermitStats(permits: PermitData[]) {
  const now = new Date();
  const valid = permits.filter((p) => {
    if (!p.expiration_date) return false;
    return new Date(p.expiration_date) > now;
  });
  const score = permits.length > 0 ? Math.round((valid.length / permits.length) * 100) : 0;
  const healthLabel = score >= 80 ? "Saudável" : score >= 50 ? "Atenção" : "Crítico";
  const healthColor = score >= 80 ? "#16a34a" : score >= 50 ? "#d97706" : "#dc2626";
  return { score, healthLabel, healthColor, validCount: valid.length };
}

function generatePermitRows(permits: PermitData[]): string {
  return permits.map((p) => {
    const exp = p.expiration_date ? new Date(p.expiration_date) : null;
    const diff = exp ? Math.ceil((exp.getTime() - Date.now()) / 86400000) : null;
    const status = !exp ? "Sem data" : diff! < 0 ? "Vencido" : diff! <= 30 ? `${diff}d restantes` : diff! <= 90 ? `${diff}d restantes` : "Válido";
    const color = !exp || diff! < 0 ? "#dc2626" : diff! <= 30 ? "#dc2626" : diff! <= 90 ? "#d97706" : "#16a34a";
    return `<tr>
      <td>${escapeHtml(p.permit_type)}</td>
      <td>${escapeHtml(p.permit_number || "—")}</td>
      <td>${escapeHtml(p.state || "—")}</td>
      <td>${exp ? format(exp, "dd/MM/yyyy") : "—"}</td>
      <td style="color:${color}">${status}</td>
    </tr>`;
  }).join("");
}

export function generateClientComplianceSection(client: ClientData, permits: PermitData[]): string {
  const { score, healthLabel, healthColor, validCount } = getPermitStats(permits);

  return `
    <div class="client-section" style="page-break-inside: avoid; margin-bottom: 32px;">
      <h2 style="font-size:18px;margin-bottom:4px;border-bottom:2px solid #e4e4e7;padding-bottom:8px;">${escapeHtml(client.company_name)}</h2>
      <div class="info" style="display:flex;gap:24px;margin-bottom:12px;font-size:13px;">
        ${client.dot ? `<div><span style="color:#666">DOT:</span> ${escapeHtml(client.dot)}</div>` : ""}
        ${client.mc ? `<div><span style="color:#666">MC:</span> ${escapeHtml(client.mc)}</div>` : ""}
        ${client.ein ? `<div><span style="color:#666">EIN:</span> ${escapeHtml(client.ein)}</div>` : ""}
      </div>
      <div style="display:inline-block;padding:8px 16px;border-radius:6px;background:${healthColor}15;border:2px solid ${healthColor};margin-bottom:12px;">
        <span style="font-size:24px;font-weight:bold;color:${healthColor}">${score}%</span>
        <span style="font-size:12px;color:${healthColor};margin-left:8px;">${healthLabel}</span>
      </div>
      <p style="font-size:12px;color:#666;margin-bottom:8px">${validCount} de ${permits.length} permits em dia</p>
      ${permits.length > 0 ? `
        <table>
          <thead><tr><th>Tipo</th><th>Número</th><th>Estado</th><th>Validade</th><th>Status</th></tr></thead>
          <tbody>${generatePermitRows(permits)}</tbody>
        </table>
      ` : '<p style="font-size:12px;color:#999;">Nenhum permit cadastrado</p>'}
    </div>
  `;
}

export function generateBatchCompliancePdf(clientsWithPermits: Array<{ client: ClientData; permits: PermitData[] }>) {
  const sections = clientsWithPermits.map(({ client, permits }) =>
    generateClientComplianceSection(client, permits)
  ).join("");

  const totalClients = clientsWithPermits.length;
  const totalPermits = clientsWithPermits.reduce((s, c) => s + c.permits.length, 0);
  const avgScore = clientsWithPermits.length > 0
    ? Math.round(clientsWithPermits.reduce((s, c) => {
        const valid = c.permits.filter((p) => p.expiration_date && new Date(p.expiration_date) > new Date()).length;
        return s + (c.permits.length > 0 ? (valid / c.permits.length) * 100 : 0);
      }, 0) / clientsWithPermits.length)
    : 0;

  const html = `<!DOCTYPE html><html><head><title>Relatório de Compliance em Lote</title>
    <style>
      body{font-family:Arial,sans-serif;margin:40px;color:#1a1a1a}
      h1{font-size:22px;margin-bottom:4px}
      .meta{color:#666;font-size:12px;margin-bottom:24px}
      .summary{display:flex;gap:24px;margin-bottom:32px;padding:16px;background:#f4f4f5;border-radius:8px}
      .summary-item{text-align:center}
      .summary-item .number{font-size:28px;font-weight:bold;color:#1a1a1a}
      .summary-item .label{font-size:11px;color:#666;text-transform:uppercase}
      table{width:100%;border-collapse:collapse;font-size:11px;margin-top:8px}
      th{background:#f4f4f5;padding:6px;text-align:left;border-bottom:2px solid #e4e4e7;font-weight:600}
      td{padding:5px 6px;border-bottom:1px solid #e4e4e7}
      .footer{margin-top:24px;font-size:10px;color:#999;text-align:right}
      @media print { .client-section { page-break-inside: avoid; } }
    </style></head><body>
    <h1>Relatório de Compliance em Lote</h1>
    <div class="meta">${new Date().toLocaleDateString()} — ${totalClients} clientes</div>
    <div class="summary">
      <div class="summary-item"><div class="number">${totalClients}</div><div class="label">Clientes</div></div>
      <div class="summary-item"><div class="number">${totalPermits}</div><div class="label">Permits</div></div>
      <div class="summary-item"><div class="number">${avgScore}%</div><div class="label">Score Médio</div></div>
    </div>
    ${sections}
    <div class="footer">MartinsAdviser — Batch Compliance Report</div>
  </body></html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
    return true;
  }
  return false;
}
