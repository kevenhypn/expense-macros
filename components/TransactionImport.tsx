import { useState } from "react";
import { View } from "react-native";
import { money } from "../lib/budget";
import { parseTransactionImport } from "../lib/transactionImport";
import type { Transaction } from "../types";
import { Action, Field, Txt, useTheme } from "./ui";

export function TransactionImport({ busy, error, onSave, onCancel }: {
  busy: boolean; error?: string; onSave: (entries: Transaction[]) => void; onCancel: () => void;
}) {
  const { c, s } = useTheme();
  const [input, setInput] = useState("");
  const [issue, setIssue] = useState("");
  const [review, setReview] = useState<Transaction[] | null>(null);

  function reviewInput() {
    try {
      setReview(parseTransactionImport(input));
      setIssue("");
    } catch (failure) {
      setIssue(failure instanceof Error ? failure.message : "Could not read the transactions.");
    }
  }

  const posted = review?.filter(tx => !tx.pending) ?? [];
  const pending = review?.filter(tx => tx.pending) ?? [];
  const netSpend = posted.reduce((total, tx) => total - (tx.category === "Income" ? 0 : Math.round(tx.amount * 100)), 0) / 100;
  const pendingTotal = pending.reduce((total, tx) => total - Math.round(tx.amount * 100), 0) / 100;

  return <>
    <Txt style={s.title}>Import transactions</Txt>
    <Txt style={s.muted}>Paste one transaction per line. Pending entries stay out of spending totals until you mark them posted.</Txt>
    {review ? <View style={[s.panel, { padding: 16, gap: 12 }]}>
      <Txt style={s.label}>{posted.length} posted · {pending.length} pending</Txt>
      <Txt style={s.muted}>Net posted spending {money(netSpend)}</Txt>
      <Txt style={s.muted}>Net pending {money(pendingTotal)}</Txt>
      <Action disabled={busy} onPress={() => onSave(review)}>{busy ? "Saving…" : "Save transactions"}</Action>
      <Action tone="soft" disabled={busy} onPress={() => setReview(null)}>Edit pasted rows</Action>
    </View> : <View style={[s.panel, { padding: 16, gap: 12 }]}>
      <Txt style={s.muted}>Date | signed amount | category | description | account | posted or pending</Txt>
      <Txt style={s.muted}>Categories: Food, Shopping, Transport, Entertainment, Other, Bills, Savings, Income.</Txt>
      <Field label="Transaction rows" multiline autoCapitalize="none" autoCorrect={false} value={input}
        onChangeText={setInput} style={{ minHeight: 160, paddingVertical: 12, textAlignVertical: "top" }} />
      <Action onPress={reviewInput}>Review transactions</Action>
    </View>}
    {!!(issue || (review && error)) && <Txt style={{ color: c.error }}>{issue || error}</Txt>}
    <Action tone="soft" onPress={onCancel} disabled={busy}>Cancel</Action>
  </>;
}
