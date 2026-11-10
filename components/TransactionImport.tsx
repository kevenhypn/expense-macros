import { useState } from "react";
import { View } from "react-native";
import { formatCents, isoDate, moveDay } from "../lib/budget";
import { dollarsToCents } from "../lib/money";
import { parseTransactionImport } from "../lib/transactionImport";
import type { Transaction } from "../types";
import { Action, Banner, Field, Txt, useTheme } from "./ui";

export function TransactionImport({ busy, error, existing, onSave, onCancel }: {
  busy: boolean; error?: string; existing: Transaction[]; onSave: (entries: Transaction[]) => void; onCancel: () => void;
}) {
  const { c, s } = useTheme();
  const [input, setInput] = useState("");
  const [issue, setIssue] = useState("");
  const [review, setReview] = useState<Transaction[] | null>(null);
  const today = isoDate();
  const example = [
    `${moveDay(today, -1)} | -12.40 | Food | Lunch | Checking | posted`,
    `${today} | -8.40 | Other | Pharmacy | Visa | pending`,
  ].join("\n");

  function reviewInput() {
    try {
      setReview(parseTransactionImport(input, today));
      setIssue("");
    } catch (failure) {
      setReview(null);
      setIssue(failure instanceof Error ? failure.message : "Could not read the transactions.");
    }
  }

  const known = new Set(existing.map(tx => tx.id));
  const fresh = review?.filter(tx => !known.has(tx.id)) ?? [];
  const skipped = (review?.length ?? 0) - fresh.length;
  const posted = fresh.filter(tx => !tx.pending);
  const pending = fresh.filter(tx => tx.pending);
  const netSpend = posted.reduce((total, tx) => total + (tx.category === "Income" ? 0 : -(dollarsToCents(tx.amount) ?? 0)), 0);
  const pendingSpend = pending.reduce((total, tx) => total + (tx.category === "Income" ? 0 : -(dollarsToCents(tx.amount) ?? 0)), 0);

  return <>
    <View style={{ gap: 4 }}>
      <Txt accessibilityRole="header" style={s.title}>Import</Txt>
      <Txt style={s.muted}>Paste rows, check them, then save. Nothing is stored until you confirm.</Txt>
    </View>
    {review ? <View style={[s.panel, { padding: 16, gap: 12 }]}>
      <Txt style={s.label}>{fresh.length} new {fresh.length === 1 ? "transaction" : "transactions"}{skipped ? ` · ${skipped} already saved` : ""}</Txt>
      <Txt style={s.muted}>{posted.length} posted · net spending {formatCents(netSpend)}</Txt>
      <Txt style={s.muted}>{pending.length} pending · {formatCents(pendingSpend)} not included in totals</Txt>
      <View style={{ gap: 0 }}>
        {review.map(tx => {
          const cents = dollarsToCents(tx.amount) ?? 0;
          const duplicate = known.has(tx.id);
          return <View key={tx.id} style={[s.between, { gap: 12, minHeight: 56, borderTopWidth: 1, borderColor: c.border }]}>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt lines={1} style={s.label}>{tx.note || tx.category}</Txt>
              <Txt lines={1} style={[s.muted, { fontSize: 13 }]}>
                {tx.date} · {tx.category}{tx.account ? ` · ${tx.account}` : ""}{tx.pending ? " · Pending" : ""}{duplicate ? " · Already saved" : ""}
              </Txt>
            </View>
            <Txt style={[s.number, { color: duplicate ? c.faint : cents > 0 ? c.green : c.ink }]}>
              {cents < 0 ? formatCents(cents).replace("-", "−") : `+${formatCents(cents)}`}
            </Txt>
          </View>;
        })}
      </View>
      {fresh.length === 0 && <Banner tone="warning">Every row is already in the log. Nothing new will be saved.</Banner>}
      <Action disabled={busy || fresh.length === 0} onPress={() => onSave(fresh)}>
        {busy ? "Saving…" : fresh.length === 1 ? "Save 1 transaction" : `Save ${fresh.length} transactions`}
      </Action>
      <Action tone="soft" disabled={busy} onPress={() => setReview(null)}>Edit rows</Action>
    </View> : <View style={[s.panel, { padding: 16, gap: 12 }]}>
      <Txt style={s.muted}>One transaction per line. Fields: date, amount, category, description, account, status.</Txt>
      <Txt style={[s.muted, { fontSize: 13, lineHeight: 18 }]}>
        Separate fields with a vertical bar, comma, semicolon, or tab. Quote a field that contains a comma. An amount without a sign is an expense, unless the category is Income. Dates can be 2026-11-10 or 11/10/2026.
      </Txt>
      <Field label="Rows" multiline autoCapitalize="none" autoCorrect={false} value={input}
        onChangeText={value => { setInput(value); setIssue(""); }}
        placeholder={example}
        style={{ minHeight: 160, paddingVertical: 12, textAlignVertical: "top" }} />
      <View style={[s.row, { gap: 8, flexWrap: "wrap" }]}>
        <Action onPress={reviewInput}>Review rows</Action>
        <Action tone="soft" onPress={() => { setInput(example); setIssue(""); }}>Insert example</Action>
      </View>
    </View>}
    {!!issue && <Txt accessibilityRole="alert" style={{ color: c.error, lineHeight: 20 }}>{issue}</Txt>}
    {!!(review && error) && <Txt accessibilityRole="alert" style={{ color: c.error, lineHeight: 20 }}>{error}</Txt>}
    <Action tone="soft" onPress={onCancel} disabled={busy}>Cancel</Action>
  </>;
}
