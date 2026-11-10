import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, View, useWindowDimensions } from "react-native";
import { ArrowDownLeft, ArrowUpRight, CircleDollarSign, LockKeyhole, PiggyBank, Plus, ReceiptText, RotateCcw, Trash2, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BudgetConfig, Transaction, TransactionCategory } from "../types";
import { amountValue, expenseCategories, isoDate, isDate, money, planTotals } from "../lib/budget";
import { generateId } from "../lib/storage";
import { Action, Field, IconButton, Txt, useTheme } from "./ui";

import { DateField } from "./DateField";

const types = [
  { id: "expense", label: "Expense", icon: ArrowUpRight },
  { id: "refund", label: "Refund", icon: RotateCcw },
  { id: "income", label: "Income", icon: ArrowDownLeft },
] as const;
type Kind = (typeof types)[number]["id"];

export function TransactionForm({ entry, initialDate, busy, error, onClose, onSave, onDelete }: {
  entry?: Transaction; initialDate: string; busy: boolean; error?: string; onClose: () => void;
  onSave: (entry: Transaction) => void; onDelete: (entry: Transaction) => void;
}) {
  const { c, s, cat } = useTheme();
  const [kind, setKind] = useState<Kind>(entry?.category === "Income" ? "income" : entry && entry.amount > 0 ? "refund" : "expense");
  const [category, setCategory] = useState<TransactionCategory>(entry && entry.category !== "Income" ? entry.category : "Food");
  const [amount, setAmount] = useState(entry ? String(Math.abs(entry.amount)) : "");
  const [pending, setPending] = useState(entry?.pending ?? false);
  const [note, setNote] = useState(entry?.note ?? "");
  const [date, setDate] = useState(entry?.date ?? initialDate);
  const [issue, setIssue] = useState("");
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  function submit() {
    const value = amountValue(amount);
    if (value === null || value <= 0) { setIssue("Enter an amount greater than $0, with up to two decimal places."); return; }
    if (!isDate(date) || date > isoDate()) { setIssue("Choose a valid date on or before today."); return; }
    setIssue("");
    onSave({ id: entry?.id ?? generateId(), amount: kind === "expense" ? -value : value, date,
      category: kind === "income" ? "Income" : category, note: note.trim() || undefined,
      account: entry?.account, pending: pending || undefined });
  }

  return <Modal transparent visible animationType={Platform.OS === "web" ? "none" : "fade"} onRequestClose={onClose}>
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, alignItems: "center", justifyContent: width >= 650 ? "center" : "flex-end" }}>
      <Pressable onPress={onClose} accessibilityElementsHidden importantForAccessibility="no"
        style={[StyleSheet.absoluteFillObject, { backgroundColor: c.shade }]} />
      <View accessibilityViewIsModal style={{ width: "100%", maxWidth: 500, maxHeight: "96%", flexShrink: 1, backgroundColor: c.surface,
        borderTopLeftRadius: 26, borderTopRightRadius: 26, borderBottomLeftRadius: width >= 650 ? 26 : 0, borderBottomRightRadius: width >= 650 ? 26 : 0 }}>
        <View style={[s.between, { paddingHorizontal: 20, paddingTop: 13, paddingBottom: 8 }]}>
          <View style={{ gap: 3 }}><Txt style={s.eyebrow}>YOUR MONEY LOG</Txt><Txt style={s.title}>{entry ? "Edit transaction" : "Log a transaction"}</Txt></View>
          <IconButton label="Close transaction form" onPress={onClose} disabled={busy} style={{ backgroundColor: c.bg }}><X size={19} color={c.ink} /></IconButton>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: 15, gap: 12 }}>
          <View style={{ flexDirection: "row", backgroundColor: c.bg, borderRadius: 13, padding: 3, gap: 3 }}>
            {types.map(({ id, label, icon: Icon }) => <Pressable accessibilityRole="button" accessibilityState={{ selected: kind === id }}
              key={id} onPress={() => setKind(id)} style={{ flex: 1, minHeight: 44, borderRadius: 10, gap: 4, alignItems: "center", justifyContent: "center",
                flexDirection: "row", backgroundColor: kind === id ? c.soft : "transparent" }}>
              <Icon size={14} color={kind === id ? c.purple : c.muted} />
              <Txt style={{ color: kind === id ? c.purple : c.muted, fontSize: 12, fontWeight: "700" }}>{label}</Txt>
            </Pressable>)}
          </View>
          <Field label="Amount ($)" placeholder="0.00" value={amount} onChangeText={value => { setAmount(value); setIssue(""); }} inputMode="decimal" keyboardType="decimal-pad"
            maxLength={14} style={{ fontSize: 31, fontWeight: "700", minHeight: 64 }} />
          {kind !== "income" && <View style={{ gap: 7 }}>
            <Txt style={s.label}>Category</Txt>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {expenseCategories.map(item => {
                const { icon: Icon, color, bg } = cat[item];
                return <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: category === item }}
                  onPress={() => setCategory(item)} style={[s.row, { backgroundColor: category === item ? bg : c.bg, borderWidth: 1,
                    borderColor: category === item ? color : c.border, minHeight: 44, paddingHorizontal: 9, borderRadius: 11, gap: 5 }]}>
                  <Icon size={14} color={color} /><Txt style={{ fontSize: 12, color: c.ink, fontWeight: "600" }}>{item}</Txt>
                </Pressable>;
              })}
            </View>
          </View>}
          <Field label="Note (optional)" placeholder="e.g. Morning coffee" value={note} onChangeText={setNote} maxLength={100} />
          {kind === "expense" && (category === "Bills" || category === "Savings") &&
            <Txt style={[s.muted, { fontSize: 12 }]}>Log only amounts beyond what you already set aside in your plan.</Txt>}
          <DateField value={date} onChange={value => { setDate(value); setIssue(""); }} />
          {entry?.pending !== undefined && <View style={s.between}>
            <Txt style={s.label}>Pending transaction</Txt>
            <Switch accessibilityLabel="Pending transaction" value={pending} onValueChange={setPending}
              trackColor={{ true: c.primary }} />
          </View>}
          {entry && <Action tone="danger" onPress={() => onDelete(entry)} disabled={busy}>Delete transaction</Action>}
        </ScrollView>
        <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12 + insets.bottom, borderTopWidth: 1, borderColor: c.border, gap: 8 }}>
          {!!(issue || error) && <Txt style={{ color: c.error, lineHeight: 19 }}>{issue || error}</Txt>}
          <Action onPress={submit} disabled={busy}>{busy ? "Saving…" : entry ? "Save changes" : "Save transaction"}</Action>
        </View>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}

export function PlanSummary({ config, onEdit }: { config: BudgetConfig; onEdit: () => void }) {
  const { c, s, cat } = useTheme();
  const planItems = [
    { key: "income", label: "Take-home income", icon: CircleDollarSign, bg: c.soft, color: c.purple },
    { key: "bills", label: "Recurring bills", icon: ReceiptText, bg: cat.Bills.bg, color: cat.Bills.color },
    { key: "savings", label: "Savings target", icon: PiggyBank, bg: cat.Savings.bg, color: cat.Savings.color },
  ] as const;
  const values = planTotals(config);
  return <>
    <View style={{ gap: 4 }}><Txt style={s.eyebrow}>SET YOUR TARGETS</Txt>
      <Txt style={{ fontSize: 36, fontWeight: "800", letterSpacing: -1.5 }}>Monthly plan</Txt>
      <Txt style={s.muted}>Set money aside for bills and savings before you spend.</Txt></View>
    <View style={{ backgroundColor: c.hero, padding: 22, borderRadius: 24, gap: 6 }}>
      <Txt style={[s.eyebrow, { color: "#dcd1ff" }]}>FLEXIBLE SPENDING TARGET</Txt>
      <Txt style={[s.number, { color: c.onHero, fontSize: 37, letterSpacing: -1.5 }]}>{money(values.flex)}</Txt>
      <Txt style={{ color: "#e0d9ef", lineHeight: 19, fontSize: 13 }}>Monthly income minus planned bills and savings.</Txt>
    </View>
    <View style={[s.panel, { paddingHorizontal: 16 }]}>
      {planItems.map(({ key, label, icon: Icon, bg, color }, index) => <View key={key}
        style={[s.between, { minHeight: 65, gap: 9, borderTopWidth: index ? 1 : 0, borderColor: c.border }]}>
        <View style={[s.row, { gap: 10, flexShrink: 1 }]}><View style={{ backgroundColor: bg, padding: 10, borderRadius: 12 }}><Icon size={17} color={color} /></View>
          <Txt style={s.label}>{label}</Txt></View><Txt style={s.number}>{money(values[key])}</Txt>
      </View>)}
    </View>
    {config.bills.length > 0 && <View style={[s.panel, { padding: 16, gap: 13 }]}>
      <Txt style={s.label}>Bill details</Txt>
      {config.bills.map(bill => <View key={bill.id} style={[s.between, { gap: 10 }]}><Txt style={[s.muted, { flexShrink: 1 }]}>{bill.name}</Txt><Txt style={s.number}>{money(bill.amount)}</Txt></View>)}
    </View>}
    <View style={[s.panel, { padding: 16, gap: 5 }]}>
      <Txt style={s.label}>{config.rolloverUnspent ? "Adaptive daily pace" : "Fixed daily pace"}</Txt>
      <Txt style={s.muted}>{config.rolloverUnspent ? "Past spending changes what’s available over the remaining days of the month." : "The monthly spending target is divided evenly across the days of the month."}</Txt>
    </View>
    <Action onPress={onEdit}>Edit monthly plan</Action>
    <View style={[s.row, { gap: 6, justifyContent: "center" }]}><LockKeyhole size={13} color={c.faint} />
      <Txt style={{ color: c.muted, fontSize: 11 }}>Your plan and entries stay on this device.</Txt></View>
  </>;
}

export function PlanForm({ config, onSave, onCancel, busy, error }: {
  config: BudgetConfig | null; onSave: (config: BudgetConfig) => void; onCancel: () => void; busy: boolean; error?: string;
}) {
  const { c, s } = useTheme();
  const [income, setIncome] = useState(config ? String(config.monthlyIncome) : "");
  const [bills, setBills] = useState(() => config?.bills.map(bill => ({ ...bill, amount: String(bill.amount) })) ?? []);
  const [mode, setMode] = useState(config?.savingsGoal.mode ?? "fixed");
  const [fixed, setFixed] = useState(config?.savingsGoal.mode === "fixed" ? String(config.savingsGoal.amount) : "");
  const [rate, setRate] = useState(config?.savingsGoal.mode === "percent" ? String(config.savingsGoal.percent) : "");
  const [rollover, setRollover] = useState(config?.rolloverUnspent ?? true);
  const [issue, setIssue] = useState("");
  const monthlyIncome = amountValue(income);
  const savings = amountValue((mode === "percent" ? rate : fixed) || "0");
  const normalized = bills.map(bill => ({ ...bill, name: bill.name.trim(), amount: amountValue(bill.amount) }));
  const plan: BudgetConfig = {
    monthlyIncome: monthlyIncome ?? 0, startDate: config?.startDate ?? isoDate(), rolloverUnspent: rollover,
    savingsGoal: mode === "percent" ? { mode, percent: savings ?? 0 } : { mode, amount: savings ?? 0 },
    bills: normalized.filter(bill => bill.name && bill.amount).map(bill => ({ ...bill, amount: bill.amount! })),
  };
  const preview = planTotals(plan);
  function submit() {
    if (monthlyIncome === null) return setIssue("Enter your take-home income in dollars. Enter 0 if you have no income to plan.");
    if (savings === null || (mode === "percent" && savings > 100)) return setIssue(mode === "percent" ? "Enter a savings percentage from 0 to 100." : "Enter a valid savings amount.");
    if (normalized.some(bill => !bill.name || !bill.amount)) return setIssue("Add a name and an amount greater than $0 for each bill, or remove the empty bill.");
    setIssue("");
    onSave(plan);
  }
  return <>
    <View style={{ gap: 4 }}><Txt style={s.eyebrow}>{config ? "PLAN SETTINGS" : "GET STARTED"}</Txt>
      <Txt style={{ fontSize: 34, fontWeight: "800", letterSpacing: -1.5 }}>{config ? "Edit monthly plan" : "Build your plan"}</Txt>
      <Txt style={s.muted}>Your daily target comes from what’s left after bills and savings.</Txt></View>
    <View style={[s.panel, { padding: 16, gap: 15 }]}>
      <Field label="Monthly take-home income ($)" value={income} onChangeText={setIncome} placeholder="0.00" inputMode="decimal" maxLength={14} />
      <View style={s.divider} />
      <View style={s.between}><Txt style={s.label}>Recurring bills</Txt>
        <Action tone="soft" label="Add a recurring bill" onPress={() => setBills([...bills, { id: generateId(), name: "", amount: "" }])}>
          <Plus size={15} color={c.purple} /><Txt style={[s.label, { color: c.purple }]}>Add bill</Txt>
        </Action></View>
      {bills.length === 0 && <Txt style={s.muted}>Add expenses such as rent, insurance, or subscriptions.</Txt>}
      {bills.map((bill, index) => <View key={bill.id} style={[s.panel, { padding: 10, gap: 8 }]}>
        <View style={[s.between, { gap: 4 }]}><Txt style={s.label}>Bill {index + 1}</Txt>
          <IconButton label={`Remove bill ${index + 1}`} onPress={() => setBills(bills.filter(item => item.id !== bill.id))}><Trash2 size={17} color={c.error} /></IconButton></View>
        <Field label={`Bill ${index + 1} name`} value={bill.name} placeholder="e.g. Rent" maxLength={60}
          onChangeText={name => setBills(bills.map(item => item.id === bill.id ? { ...item, name } : item))} />
        <Field label={`Bill ${index + 1} amount ($)`} value={bill.amount} placeholder="0.00" maxLength={14} inputMode="decimal"
          onChangeText={amount => setBills(bills.map(item => item.id === bill.id ? { ...item, amount } : item))} />
      </View>)}
      <View style={s.divider} />
      <View style={[s.between, { flexWrap: "wrap", gap: 6 }]}><Txt style={s.label}>Savings target</Txt>
        <View style={[s.row, { gap: 4 }]}><Action onPress={() => setMode("fixed")} tone={mode === "fixed" ? "primary" : "soft"}>Dollars</Action>
          <Action onPress={() => setMode("percent")} tone={mode === "percent" ? "primary" : "soft"}>Percent</Action></View></View>
      {mode === "fixed" ? <Field label="Savings amount ($)" value={fixed} onChangeText={setFixed} placeholder="0.00" inputMode="decimal" maxLength={14} />
        : <Field label="Savings (% of income)" value={rate} onChangeText={setRate} placeholder="0" inputMode="decimal" maxLength={6} />}
      <View style={s.divider} />
      <View style={[s.between, { gap: 12 }]}><View style={{ flex: 1, gap: 3 }}>
        <Txt style={s.label}>Adapt to past spending</Txt><Txt style={s.muted}>Recalculate the daily target as you log this month.</Txt>
      </View><Switch accessibilityLabel="Adapt to past spending" value={rollover} onValueChange={setRollover} trackColor={{ true: c.purple }} /></View>
    </View>
    <View style={[s.panel, s.between, { padding: 17, gap: 8 }]}><Txt style={[s.label, { flexShrink: 1 }]}>Monthly flexible spending</Txt>
      <Txt style={[s.number, { color: preview.flex < 0 ? c.error : c.purple, fontSize: 20 }]}>{money(preview.flex)}</Txt></View>
    {!!(issue || error) && <Txt style={{ color: c.error, lineHeight: 19 }}>{issue || error}</Txt>}
    <Action onPress={submit} disabled={busy}>{busy ? "Saving…" : "Save monthly plan"}</Action>
    <Action tone="soft" onPress={onCancel} disabled={busy}>Cancel</Action>
  </>;
}
