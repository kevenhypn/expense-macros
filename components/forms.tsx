import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, View, useWindowDimensions } from "react-native";
import { ArrowDownLeft, ArrowUpRight, CircleDollarSign, LockKeyhole, PiggyBank, Plus, ReceiptText, RotateCcw, Trash2, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BudgetConfig, Transaction, TransactionCategory } from "../types";
import { amountValue, expenseCategories, formatCents, isoDate, isDate, planCents } from "../lib/budget";
import { centsToInput, dollarsToCents } from "../lib/money";
import { generateId } from "../lib/storage";
import { Action, Banner, Field, IconButton, Txt, useTheme } from "./ui";
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
  const [amount, setAmount] = useState(entry ? centsToInput(Math.abs(dollarsToCents(entry.amount) ?? 0)) : "");
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
    onSave({
      id: entry?.id ?? generateId(),
      amount: kind === "expense" ? -value : value,
      date,
      category: kind === "income" ? "Income" : category,
      note: note.trim() || undefined,
      account: entry?.account,
      pending: pending || undefined,
    });
  }

  return <Modal transparent visible animationType={Platform.OS === "web" ? "none" : "fade"} onRequestClose={onClose}>
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, alignItems: "center", justifyContent: width >= 720 ? "center" : "flex-end" }}>
      <Pressable onPress={onClose} accessibilityElementsHidden importantForAccessibility="no"
        style={[StyleSheet.absoluteFillObject, { backgroundColor: c.shade }]} />
      <View accessibilityViewIsModal style={{ width: "100%", maxWidth: 520, maxHeight: "96%", flexShrink: 1, backgroundColor: c.surface,
        borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomLeftRadius: width >= 720 ? 16 : 0, borderBottomRightRadius: width >= 720 ? 16 : 0, borderCurve: "continuous" }}>
        <View style={[s.between, { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }]}>
          <Txt accessibilityRole="header" style={[s.label, { fontSize: 20 }]}>{entry ? "Edit transaction" : "Log transaction"}</Txt>
          <IconButton label="Close" onPress={onClose} disabled={busy} style={{ backgroundColor: c.bg }}><X size={18} color={c.ink} /></IconButton>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingTop: 8, gap: 16 }}>
          <View style={{ flexDirection: "row", backgroundColor: c.bg, borderRadius: 10, padding: 4, gap: 4 }}>
            {types.map(({ id, label, icon: Icon }) => <Pressable accessibilityRole="button" accessibilityState={{ selected: kind === id }}
              key={id} onPress={() => setKind(id)} style={{ flex: 1, minHeight: 44, borderRadius: 8, gap: 4, alignItems: "center", justifyContent: "center",
                flexDirection: "row", backgroundColor: kind === id ? c.soft : "transparent" }}>
              <Icon size={15} color={kind === id ? c.accent : c.muted} />
              <Txt style={{ color: kind === id ? c.accent : c.muted, fontSize: 13, fontWeight: "600" }}>{label}</Txt>
            </Pressable>)}
          </View>
          <Field label="Amount" placeholder="0.00" value={amount} onChangeText={value => { setAmount(value); setIssue(""); }}
            inputMode="decimal" keyboardType="decimal-pad" autoFocus maxLength={14}
            style={{ fontSize: 28, fontWeight: "700", minHeight: 64 }} />
          {kind !== "income" && <View style={{ gap: 8 }}>
            <Txt style={s.label}>Category</Txt>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {expenseCategories.map(item => {
                const { icon: Icon, color, bg } = cat[item];
                const selected = category === item;
                return <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected }}
                  onPress={() => setCategory(item)} style={[s.row, { backgroundColor: selected ? bg : c.bg, borderWidth: 1,
                    borderColor: selected ? color : c.border, minHeight: 44, paddingHorizontal: 8, borderRadius: 10, gap: 6, width: "31%", justifyContent: "center" }]}>
                  <Icon size={15} color={color} /><Txt style={{ fontSize: 13, color: c.ink, fontWeight: "600" }}>{item}</Txt>
                </Pressable>;
              })}
            </View>
          </View>}
          <Field label="Note" placeholder="Morning coffee" value={note} onChangeText={setNote} maxLength={100} onSubmitEditing={submit} />
          {kind === "expense" && (category === "Bills" || category === "Savings") && <Banner tone="warning">
            The plan already sets {category.toLowerCase()} aside. Log only an extra payment here, or it is counted twice.
          </Banner>}
          <DateField value={isDate(date) ? date : isoDate()} onChange={value => { setDate(value); setIssue(""); }} />
          <View style={[s.between, { gap: 12 }]}>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt style={s.label}>Pending</Txt>
              <Txt style={s.muted}>Keep it in the log, but leave it out of the totals until it posts.</Txt>
            </View>
            <Switch accessibilityLabel="Pending" value={pending} onValueChange={setPending}
              trackColor={{ false: c.border, true: c.primary }} />
          </View>
          {entry && <Action tone="danger" onPress={() => onDelete(entry)} disabled={busy}>Delete transaction</Action>}
        </ScrollView>
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 + insets.bottom, borderTopWidth: 1, borderColor: c.border, gap: 8 }}>
          {!!(issue || error) && <Txt accessibilityRole="alert" style={{ color: c.error, lineHeight: 20 }}>{issue || error}</Txt>}
          <Action onPress={submit} disabled={busy}>{busy ? "Saving…" : entry ? "Save changes" : "Save transaction"}</Action>
        </View>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}

export function PlanSummary({ config, onEdit, onErase }: { config: BudgetConfig; onEdit: () => void; onErase?: () => void }) {
  const { c, s, cat } = useTheme();
  const values = planCents(config);
  const planItems = [
    { key: "income" as const, label: "Take-home income", detail: "Each month", icon: CircleDollarSign, bg: c.soft, color: c.accent },
    { key: "bills" as const, label: "Recurring bills", detail: config.bills.length ? `${config.bills.length} ${config.bills.length === 1 ? "bill" : "bills"}` : "None yet", icon: ReceiptText, bg: cat.Bills.bg, color: cat.Bills.color },
    { key: "savings" as const, label: "Savings target", detail: config.savingsGoal.mode === "percent" ? `${config.savingsGoal.percent}% of income` : "Fixed amount", icon: PiggyBank, bg: cat.Savings.bg, color: cat.Savings.color },
  ];
  return <>
    <View style={[s.between, { gap: 12, alignItems: "flex-end" }]}>
      <View style={{ flex: 1, gap: 4 }}>
        <Txt accessibilityRole="header" style={s.title}>Plan</Txt>
        <Txt style={s.muted}>Income, bills, and savings set the daily pace.</Txt>
      </View>
    </View>
    <Action onPress={onEdit}>Edit plan</Action>
    {values.flex < 0 && <Banner tone="warning" title="Bills and savings exceed income">
      The plan is short by {formatCents(-values.flex)}. The daily target stays negative until this changes.
    </Banner>}
    <View style={{ backgroundColor: c.hero, padding: 16, borderRadius: 16, borderCurve: "continuous", gap: 4 }}>
      <Txt style={[s.caption, { color: c.heroMuted }]}>Left for spending</Txt>
      <Txt selectable style={[s.number, { color: values.flex < 0 ? c.heroError : values.flex > 0 ? c.heroGreen : c.onHero, fontSize: 36, letterSpacing: -0.6 }]}>{formatCents(values.flex)}</Txt>
      <Txt style={{ color: c.heroMuted, fontSize: 13, lineHeight: 18 }}>
        {formatCents(values.income)} income − {formatCents(values.bills)} bills − {formatCents(values.savings)} savings
      </Txt>
    </View>
    <View style={[s.panel, { paddingHorizontal: 16 }]}>
      {planItems.map(({ key, label, detail, icon: Icon, bg, color }, index) => <View key={key}
        style={[s.between, { minHeight: 64, gap: 12, borderTopWidth: index ? 1 : 0, borderColor: c.border }]}>
        <View style={[s.row, { gap: 12, flexShrink: 1 }]}>
          <View style={{ backgroundColor: bg, width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center" }}><Icon size={18} color={color} /></View>
          <View style={{ flexShrink: 1 }}>
            <Txt style={s.label}>{label}</Txt>
            <Txt style={[s.muted, { fontSize: 13 }]}>{detail}</Txt>
          </View>
        </View>
        <Txt style={s.number}>{formatCents(values[key])}</Txt>
      </View>)}
    </View>
    {config.bills.length > 0 && <View style={[s.panel, { padding: 16, gap: 12 }]}>
      <Txt style={s.label}>Bills</Txt>
      {config.bills.map(bill => <View key={bill.id} style={[s.between, { gap: 12, minHeight: 32 }]}>
        <Txt style={[s.muted, { flexShrink: 1 }]}>{bill.name}</Txt>
        <Txt style={s.number}>{formatCents(dollarsToCents(bill.amount) ?? 0)}</Txt>
      </View>)}
    </View>}
    <View style={[s.panel, { padding: 16, gap: 4 }]}>
      <Txt style={s.label}>{config.rolloverUnspent ? "Adaptive pace" : "Fixed pace"}</Txt>
      <Txt style={s.muted}>{config.rolloverUnspent
        ? "Each day gets an equal share of what is still left, including extra income from today."
        : "Each day gets an equal share of the plan. Extra income raises that share. Earlier spending does not."}</Txt>
    </View>
    {onErase && <Action tone="danger" onPress={onErase}>Erase data on this device</Action>}
    <View style={[s.row, { gap: 8, justifyContent: "center" }]}>
      <LockKeyhole size={14} color={c.faint} />
      <Txt style={{ color: c.muted, fontSize: 13 }}>The plan and the log stay on this device.</Txt>
    </View>
  </>;
}

export function PlanForm({ config, onSave, onCancel, busy, error }: {
  config: BudgetConfig | null; onSave: (config: BudgetConfig) => void; onCancel: () => void; busy: boolean; error?: string;
}) {
  const { c, s } = useTheme();
  const [income, setIncome] = useState(config ? centsToInput(dollarsToCents(config.monthlyIncome) ?? 0) : "");
  const [bills, setBills] = useState(() => config?.bills.map(bill => ({ ...bill, amount: centsToInput(dollarsToCents(bill.amount) ?? 0) })) ?? []);
  const [mode, setMode] = useState(config?.savingsGoal.mode ?? "fixed");
  const [fixed, setFixed] = useState(config?.savingsGoal.mode === "fixed" ? centsToInput(dollarsToCents(config.savingsGoal.amount) ?? 0) : "");
  const [rate, setRate] = useState(config?.savingsGoal.mode === "percent" ? String(config.savingsGoal.percent) : "");
  const [rollover, setRollover] = useState(config?.rolloverUnspent ?? false);
  const [issue, setIssue] = useState("");
  const monthlyIncome = amountValue(income);
  const savings = amountValue((mode === "percent" ? rate : fixed) || "0");
  const normalized = bills.map(bill => ({ ...bill, name: bill.name.trim(), amount: amountValue(bill.amount) }));
  const plan: BudgetConfig = {
    monthlyIncome: monthlyIncome ?? 0,
    startDate: config?.startDate && isDate(config.startDate) ? config.startDate : isoDate(),
    rolloverUnspent: rollover,
    savingsGoal: mode === "percent" ? { mode, percent: savings ?? 0 } : { mode, amount: savings ?? 0 },
    bills: normalized.filter(bill => bill.name && bill.amount).map(bill => ({ id: bill.id, name: bill.name, amount: bill.amount! })),
  };
  const preview = planCents(plan);
  function submit() {
    if (monthlyIncome === null) return setIssue("Enter take-home income in dollars. Use 0 if there is nothing to plan yet.");
    if (savings === null || (mode === "percent" && savings > 100)) return setIssue(mode === "percent" ? "Enter a savings percentage from 0 to 100." : "Enter a savings amount, or 0.");
    if (normalized.some(bill => !bill.name || !bill.amount)) return setIssue("Name each bill and enter an amount greater than $0, or remove the empty row.");
    setIssue("");
    onSave(plan);
  }
  return <>
    <View style={{ gap: 4 }}>
      <Txt accessibilityRole="header" style={s.title}>{config ? "Edit plan" : "Create a plan"}</Txt>
      <Txt style={s.muted}>The daily target is what remains after bills and savings.</Txt>
    </View>
    <View style={[s.panel, { padding: 16, gap: 16 }]}>
      <Field label="Monthly take-home income" value={income} onChangeText={setIncome} placeholder="0.00" inputMode="decimal" maxLength={14} />
      <View style={s.divider} />
      <View style={[s.between, { gap: 8 }]}>
        <Txt style={s.label}>Recurring bills</Txt>
        <Action tone="soft" label="Add a bill" onPress={() => setBills([...bills, { id: generateId(), name: "", amount: "" }])}>
          <Plus size={16} color={c.accent} /><Txt style={{ color: c.accent, fontWeight: "600" }}>Add bill</Txt>
        </Action>
      </View>
      {bills.length === 0 && <Txt style={s.muted}>Rent, insurance, and subscriptions belong here.</Txt>}
      {bills.map((bill, index) => <View key={bill.id} style={{ gap: 8, padding: 12, borderWidth: 1, borderColor: c.border, borderRadius: 12 }}>
        <View style={s.between}>
          <Txt style={s.label}>Bill {index + 1}</Txt>
          <IconButton label={`Remove bill ${index + 1}`} onPress={() => setBills(bills.filter(item => item.id !== bill.id))}><Trash2 size={16} color={c.error} /></IconButton>
        </View>
        <Field label="Name" value={bill.name} placeholder="Rent" maxLength={60}
          onChangeText={name => setBills(bills.map(item => item.id === bill.id ? { ...item, name } : item))} />
        <Field label="Amount" value={bill.amount} placeholder="0.00" maxLength={14} inputMode="decimal"
          onChangeText={amount => setBills(bills.map(item => item.id === bill.id ? { ...item, amount } : item))} />
      </View>)}
      <View style={s.divider} />
      <View style={[s.between, { gap: 8, flexWrap: "wrap" }]}>
        <Txt style={s.label}>Savings target</Txt>
        <View style={[s.row, { gap: 8 }]}>
          <Action onPress={() => setMode("fixed")} tone={mode === "fixed" ? "primary" : "soft"}>Dollars</Action>
          <Action onPress={() => setMode("percent")} tone={mode === "percent" ? "primary" : "soft"}>Percent</Action>
        </View>
      </View>
      {mode === "fixed"
        ? <Field label="Savings amount" value={fixed} onChangeText={setFixed} placeholder="0.00" inputMode="decimal" maxLength={14} />
        : <Field label="Savings percent of income" value={rate} onChangeText={setRate} placeholder="0" inputMode="decimal" maxLength={6} />}
      <View style={s.divider} />
      <View style={[s.between, { gap: 12 }]}>
        <View style={{ flex: 1, gap: 4 }}>
          <Txt style={s.label}>Adapt to past spending</Txt>
          <Txt style={s.muted}>Off keeps the same daily share. On spreads what is left across the remaining days.</Txt>
        </View>
        <Switch accessibilityLabel="Adapt to past spending" value={rollover} onValueChange={setRollover} trackColor={{ false: c.border, true: c.primary }} />
      </View>
    </View>
    <View style={[s.panel, { padding: 16, gap: 4 }]}>
      <View style={[s.between, { gap: 8 }]}>
        <Txt style={s.label}>Left for spending</Txt>
        <Txt style={[s.number, { color: preview.flex < 0 ? c.error : preview.flex > 0 ? c.green : c.ink, fontSize: 20 }]}>{formatCents(preview.flex)}</Txt>
      </View>
      <Txt style={s.muted}>{formatCents(preview.income)} − {formatCents(preview.bills)} − {formatCents(preview.savings)}</Txt>
    </View>
    {preview.flex < 0 && <Banner tone="warning">This plan spends more than it brings in. You can save it, and the daily target will be negative.</Banner>}
    {!!(issue || error) && <Txt accessibilityRole="alert" style={{ color: c.error, lineHeight: 20 }}>{issue || error}</Txt>}
    <Action onPress={submit} disabled={busy}>{busy ? "Saving…" : "Save plan"}</Action>
    <Action tone="soft" onPress={onCancel} disabled={busy}>Cancel</Action>
  </>;
}
