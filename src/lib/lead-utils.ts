type UnknownRecord = Record<string, unknown>;

const isRecord = (v: unknown): v is UnknownRecord =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const safeJsonParse = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const unwrapPrimitiveString = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value).trim();

  // Common answer wrappers
  if (isRecord(value)) {
    const candidates = [
      value.value,
      value.answer,
      value.response,
      value.text,
      value.content,
      value.selected,
      value.result,
    ];
    for (const c of candidates) {
      const s = unwrapPrimitiveString(c);
      if (s) return s;
    }
  }

  return "";
};

const flattenForScan = (
  input: unknown,
  prefix = "",
  depth = 0,
  maxDepth = 4
): Array<{ key: string; value: unknown }> => {
  if (depth > maxDepth) return [];

  if (Array.isArray(input)) {
    return input.flatMap((item, idx) =>
      flattenForScan(item, `${prefix}${prefix ? "." : ""}${idx}`, depth + 1, maxDepth)
    );
  }

  if (isRecord(input)) {
    return Object.entries(input).flatMap(([k, v]) => {
      const nextKey = `${prefix}${prefix ? "." : ""}${k}`;
      if (isRecord(v) || Array.isArray(v)) {
        return flattenForScan(v, nextKey, depth + 1, maxDepth);
      }
      return [{ key: nextKey, value: v }];
    });
  }

  return [{ key: prefix || "value", value: input }];
};

/**
 * Normaliza o formato de lead.data para um objeto simples.
 * Suporta:
 * - objeto (JSONB padrão)
 * - string JSON
 * - array de respostas (ex: [{ label, value }, ...])
 */
export const normalizeLeadData = (raw: unknown): UnknownRecord => {
  if (raw === null || raw === undefined) return {};

  if (typeof raw === "string") {
    const parsed = safeJsonParse(raw);
    return normalizeLeadData(parsed);
  }

  if (Array.isArray(raw)) {
    const out: UnknownRecord = {};
    raw.forEach((item, idx) => {
      if (!isRecord(item)) {
        out[`item_${idx}`] = item;
        return;
      }

      // Common shapes
      const label =
        unwrapPrimitiveString(item.label) ||
        unwrapPrimitiveString(item.name) ||
        unwrapPrimitiveString(item.key) ||
        unwrapPrimitiveString(item.id) ||
        (isRecord(item.field) ? unwrapPrimitiveString(item.field.label) : "") ||
        `item_${idx}`;

      const value =
        item.value ??
        item.answer ??
        item.response ??
        item.text ??
        item.content ??
        (isRecord(item.field) ? item.field.value : undefined) ??
        item;

      out[label] = value;
    });
    return out;
  }

  if (isRecord(raw)) return raw;

  return { value: raw };
};

const looksLikeEmail = (v: string) => /\S+@\S+\.\S+/.test(v);
const digitsOnly = (v: string) => v.replace(/\D/g, "");
const looksLikePhone = (v: string) => digitsOnly(v).length >= 10;

export const extractLeadMainFields = (raw: unknown) => {
  const data = normalizeLeadData(raw);

  let name = "-";
  let email = "-";
  let phone = "-";

  const scan = flattenForScan(data);

  for (const { key, value } of scan) {
    const keyLower = key.toLowerCase();
    const strValue = unwrapPrimitiveString(value);
    if (!strValue) continue;

    if (
      name === "-" &&
      (keyLower.includes("nome") ||
        keyLower.includes("name") ||
        keyLower.includes("seu nome") ||
        keyLower.includes("full") ||
        keyLower.includes("completo"))
    ) {
      name = strValue;
      continue;
    }

    if (
      email === "-" &&
      (keyLower.includes("email") || keyLower.includes("e-mail") || looksLikeEmail(strValue))
    ) {
      email = strValue;
      continue;
    }

    if (
      phone === "-" &&
      (keyLower.includes("telefone") ||
        keyLower.includes("phone") ||
        keyLower.includes("whatsapp") ||
        keyLower.includes("celular") ||
        keyLower.includes("contato") ||
        looksLikePhone(strValue))
    ) {
      phone = strValue;
      continue;
    }
  }

  // Fallbacks (quando vier no formato clássico)
  if (name === "-" && isRecord(data)) {
    const v = (data as any).name ?? (data as any).nome ?? (data as any).Name ?? (data as any).Nome;
    const s = unwrapPrimitiveString(v);
    if (s) name = s;
  }
  if (email === "-" && isRecord(data)) {
    const v = (data as any).email ?? (data as any).Email;
    const s = unwrapPrimitiveString(v);
    if (s) email = s;
  }
  if (phone === "-" && isRecord(data)) {
    const v = (data as any).phone ?? (data as any).telefone ?? (data as any).whatsapp ?? (data as any).celular;
    const s = unwrapPrimitiveString(v);
    if (s) phone = s;
  }

  return { name, email, phone };
};
