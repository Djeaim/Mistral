export type LineInput = { description: string; quantity: number; unit_price: number; vat_rate?: number | null };

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computeTotals(lines: LineInput[], docVatRate?: number | null, defaultVatRate = 20): {
  lines: { line_total_ht: number; line_total_tva: number; line_total_ttc: number }[];
  total_ht: number;
  total_tva: number;
  total_ttc: number;
} {
  let total_ht = 0;
  let total_tva = 0;
  const outLines = lines.map((l) => {
    const qty = Number(l.quantity || 0);
    const unit = Number(l.unit_price || 0);
    const rate = l.vat_rate ?? docVatRate ?? defaultVatRate;
    const ht = round2(qty * unit);
    const tva = round2((ht * Number(rate || 0)) / 100);
    const ttc = round2(ht + tva);
    total_ht += ht;
    total_tva += tva;
    return { line_total_ht: ht, line_total_tva: tva, line_total_ttc: ttc };
  });
  const total_ttc = round2(total_ht + total_tva);
  return { lines: outLines, total_ht: round2(total_ht), total_tva: round2(total_tva), total_ttc };
}


