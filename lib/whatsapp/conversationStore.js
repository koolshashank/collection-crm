/**
 * lib/whatsapp/conversationStore.js
 * Port of includes/whatsapp_conversation_store.php.
 *
 * Lightweight local conversation log — one JSONL file per customer phone
 * number, storing every message (sent by us OR received from them).
 * Files live in PROJECT_ROOT/data/whatsapp_conversations/ — same shape as
 * the PHP storage/whatsapp_conversations/ files. All fs work is wrapped in
 * try/catch (mirrors the PHP @-suppressed calls).
 */

import fs from "fs";
import path from "path";

const CONV_DIR = path.join(process.cwd(), "data", "whatsapp_conversations");

/** Resolves the JSONL file path for a phone number (digits only). */
export function waConvFile(phone) {
  const clean = String(phone || "").replace(/\D/g, "");
  try {
    if (!fs.existsSync(CONV_DIR)) fs.mkdirSync(CONV_DIR, { recursive: true });
  } catch {
    /* directory creation failed — reads/writes below will no-op */
  }
  return path.join(CONV_DIR, clean + ".jsonl");
}

/**
 * Appends one message to a customer's conversation log.
 * @param {string} phone      Customer's phone number (any format; cleaned inside)
 * @param {string} direction  'out' (we sent it) or 'in' (they sent it)
 * @param {string} content    Message text
 * @param {?string} messageId Dootiq's message/external ID, if known
 * @param {string} status     sent | delivered | read | received | failed
 */
export function waConvLog(phone, direction, content, messageId = null, status = "sent") {
  const entry = {
    direction,
    content,
    message_id: messageId,
    status,
    timestamp: new Date().toISOString(),
  };
  try {
    fs.appendFileSync(waConvFile(phone), JSON.stringify(entry) + "\n");
  } catch {
    /* best-effort, same as PHP @file_put_contents */
  }
}

/**
 * Reads the full conversation for a customer, oldest first.
 * @returns {Array<object>}
 */
export function waConvRead(phone) {
  try {
    const file = waConvFile(phone);
    if (!fs.existsSync(file)) return [];
    const lines = fs
      .readFileSync(file, "utf8")
      .split("\n")
      .filter((l) => l.trim() !== "");
    const messages = [];
    for (const line of lines) {
      try {
        const decoded = JSON.parse(line);
        if (decoded && typeof decoded === "object") messages.push(decoded);
      } catch {
        /* skip corrupt line */
      }
    }
    return messages;
  } catch {
    return [];
  }
}

/**
 * Updates the status of a previously-logged message (e.g. sent →
 * delivered → read), matched by message_id. Used when Dootiq sends a
 * delivery-status webhook.
 */
export function waConvUpdateStatus(phone, messageId, newStatus) {
  try {
    const file = waConvFile(phone);
    if (!fs.existsSync(file)) return;

    const lines = fs
      .readFileSync(file, "utf8")
      .split("\n")
      .filter((l) => l.trim() !== "");
    const updated = lines.map((line) => {
      try {
        const entry = JSON.parse(line);
        if (entry && typeof entry === "object" && (entry.message_id ?? null) === messageId) {
          entry.status = newStatus;
        }
        return JSON.stringify(entry);
      } catch {
        return line;
      }
    });
    fs.writeFileSync(file, updated.join("\n") + "\n");
  } catch {
    /* best-effort */
  }
}
