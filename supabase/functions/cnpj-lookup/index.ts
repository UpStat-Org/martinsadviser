// Consulta de CNPJ — o equivalente brasileiro do fmcsa-lookup.
//
// Onde o lado americano identifica a transportadora pelo USDOT na base da
// FMCSA, o lado brasileiro identifica pelo CNPJ na base da Receita Federal.
// O papel no produto é o mesmo: preencher o cadastro do cliente sozinho no
// onboarding, em vez de o operador digitar razão social e endereço à mão.
//
// Fonte: BrasilAPI (https://brasilapi.com.br), que serve os dados públicos da
// Receita sem exigir chave. Por não haver segredo envolvido, esta função
// poderia rodar no browser — ela existe mesmo assim por três motivos:
//
//   1. Simetria com fmcsa-lookup: as duas telas de onboarding chamam o mesmo
//      tipo de coisa do mesmo jeito.
//   2. Trocar de provedor (ReceitaWS, CNPJá) vira uma mudança de servidor, sem
//      esperar rebuild do frontend.
//   3. O CORS da BrasilAPI é liberado hoje, mas isso é promessa de terceiro,
//      não contrato.
//
// Autenticação: exige JWT como fmcsa-lookup. Não é dado sensível, mas também
// não há razão para oferecer um proxy de consulta aberto ao mundo.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Validação dos dígitos verificadores — espelha isValidCnpj em lib/brCompliance.ts. */
function isValidCnpj(digits: string): boolean {
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;

  const check = (slice: string, weights: number[]): number => {
    const sum = weights.reduce((acc, w, i) => acc + Number(slice[i]) * w, 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  if (check(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) !== Number(digits[12])) return false;
  return check(digits.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(digits[13]);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("Missing authorization header");
    }
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      throw new Error("Not authenticated");
    }

    const body = await req.json();
    const digits = String(body?.cnpj ?? "").replace(/\D/g, "");

    // Valida antes de ir à rede: erro de digitação é o caso comum, e um
    // "não encontrado" vindo da API sugeriria empresa inexistente quando o
    // problema foi um dígito trocado.
    if (!isValidCnpj(digits)) {
      return new Response(JSON.stringify({ error: "CNPJ inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`, {
      headers: { Accept: "application/json" },
    });

    if (response.status === 404) {
      return new Response(JSON.stringify({ error: "CNPJ não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`BrasilAPI [${response.status}]: ${text}`);
    }

    const data = await response.json();

    // Normalizado para o shape que o formulário de cliente consome, do mesmo
    // jeito que fmcsa-lookup normaliza o retorno da FMCSA. A UI nunca vê o
    // formato do provedor, o que é o que torna a troca de provedor barata.
    const result = {
      cnpj: digits,
      company_name: data.razao_social ?? "",
      trade_name: data.nome_fantasia ?? "",
      status: data.descricao_situacao_cadastral ?? "",
      opened_on: data.data_inicio_atividade ?? "",
      legal_nature: data.natureza_juridica ?? "",
      main_activity: data.cnae_fiscal_descricao ?? "",
      phone: [data.ddd_telefone_1, data.ddd_telefone_2].filter(Boolean)[0] ?? "",
      email: data.email ?? "",
      address: [
        [data.descricao_tipo_de_logradouro, data.logradouro].filter(Boolean).join(" "),
        data.numero,
        data.complemento,
        data.bairro,
      ].filter((part) => part && String(part).trim() !== "").join(", "),
      city: data.municipio ?? "",
      state: data.uf ?? "",
      postal_code: data.cep ? String(data.cep).replace(/\D/g, "") : "",
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
