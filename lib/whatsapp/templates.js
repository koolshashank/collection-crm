/**
 * lib/whatsapp/templates.js
 * Port of includes/whatsapp_templates_config.php + the live-template
 * mapping done at the top of whatsapp_template_modal.php.
 *
 * WHATSAPP_TEMPLATES: local fallback config. 'template_id' must EXACTLY
 * match the templateName of an approved template in your Dootiq/Meta
 * account (case-sensitive) — this is what gets sent as "templateName"
 * in the /messages/template API call.
 *
 * Each variable's 'source' says which lead-data field auto-fills it —
 * if no match, the field stays blank and the agent fills it manually.
 */

import {
  dootiqListTemplates,
  dootiqGuessVariableSource,
  sendWhatsappTemplateDootiq,
} from "./dootiq";

export const WHATSAPP_TEMPLATES = {
  payment_reminder: {
    label: "Payment Reminder",
    template_id: "payment_reminder_v1", // ⚠️ BSP me jo exact template name/id hai wahi daalo
    variables: [
      { key: "name", label: "Customer Name", source: "full_name" },
      { key: "amount", label: "Due Amount", source: "repayment_amount" },
      { key: "due_date", label: "Due Date", source: "repayment_date" },
    ],
    preview:
      "Hello {name}, your payment of {amount} is due on {due_date}. Please pay on time to avoid penalty charges. — BlinkrLoan",
  },

  ptp_confirmation: {
    label: "PTP Confirmation",
    template_id: "ptp_confirmation_v1",
    variables: [
      { key: "name", label: "Customer Name", source: "full_name" },
      { key: "amount", label: "Promised Amount", source: "" },
      { key: "ptp_date", label: "Promised Date", source: "" },
    ],
    preview:
      "Hi {name}, as discussed, we've noted your promise to pay {amount} on {ptp_date}. Thank you for confirming. — BlinkrLoan",
  },

  settlement_offer: {
    label: "Settlement Offer",
    template_id: "settlement_offer_v1",
    variables: [
      { key: "name", label: "Customer Name", source: "full_name" },
      { key: "settlement_amt", label: "Settlement Amount", source: "" },
      { key: "valid_till", label: "Valid Till", source: "" },
    ],
    preview:
      "Dear {name}, we're pleased to offer you a settlement of {settlement_amt}, valid till {valid_till}. Contact us to proceed. — BlinkrLoan",
  },
};

/**
 * Sends an approved WhatsApp template using the LOCAL config above —
 * port of includes/whatsapp_send.php send_whatsapp_template().
 * Maps positional values (from the frontend form) to the named
 * variables Dootiq expects.
 * @param {string} phone
 * @param {string} templateKey key of WHATSAPP_TEMPLATES
 * @param {Array<string>} variables ordered values matching the template's variables array
 */
export async function sendWhatsappTemplate(phone, templateKey, variables) {
  const tpl = WHATSAPP_TEMPLATES[templateKey];
  if (!tpl) {
    return { success: false, message: "Unknown template: " + templateKey, raw: null };
  }

  if (String(phone || "").replace(/\D/g, "").length < 10) {
    return { success: false, message: "Invalid phone number.", raw: null };
  }

  const namedVariables = {};
  tpl.variables.forEach((varDef, i) => {
    namedVariables[varDef.key] = variables?.[i] ?? "";
  });

  return sendWhatsappTemplateDootiq(
    phone,
    tpl.template_id,
    namedVariables,
    tpl.language ?? "en",
    tpl.header_media_url ?? null
  );
}

/**
 * Fetches templates LIVE from Dootiq and maps them to the shape used by
 * the template modal UI — exact port of the PHP block at the top of
 * whatsapp_template_modal.php (LP_WA_TEMPLATES).
 *
 * @returns {{success:boolean, templates:Object, message:string}}
 *   templates: { [name]: { label, language, preview, variables:[{key,label,source,example,position}] } }
 */
export async function getLiveTemplatesForModal(status = "APPROVED", limit = 100) {
  const result = await dootiqListTemplates(status, limit);
  const templates = {};

  if (result.success) {
    for (const t of result.templates) {
      const vars = Array.isArray(t?.body?.variables) ? [...t.body.variables] : [];
      vars.sort((a, b) => (a?.position ?? 0) - (b?.position ?? 0));

      templates[t.name] = {
        label: t.displayName ?? t.name,
        language: t.language ?? "en",
        preview: t?.body?.text ?? "",
        variables: vars.map((v) => ({
          key: v?.name ?? "var" + (v?.position ?? ""),
          label: ucwords(String(v?.name ?? "Value").replace(/[_-]/g, " ")),
          source: dootiqGuessVariableSource(v?.name ?? ""),
          example: v?.example ?? "",
          position: v?.position ?? null,
        })),
      };
    }
  }

  return { success: result.success, templates, message: result.message };
}

function ucwords(str) {
  return String(str).replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}
