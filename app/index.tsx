import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { ArrowRight, CalendarDays, FlaskConical, List, LockKeyhole, Plus, SlidersHorizontal, X } from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Activity, Allowance, Today } from "../components/dashboard";
import { TransactionImport } from "../components/TransactionImport";
import { PlanForm, PlanSummary, TransactionForm } from "../components/forms";
import { Action, Brand, IconButton, ThemeToggle, Txt, useTheme } from "../components/ui";
import { budgetFor, isoDate } from "../lib/budget";
import { sampleData } from "../lib/demo";
import { loadData, saveConfig, saveTransactions } from "../lib/storage";
import type { BudgetConfig, Transaction } from "../types";

const tabs = [
  { name: "Today", icon: CalendarDays },
  { name: "Activity", icon: List },
  { name: "Plan", icon: SlidersHorizontal },
] as const;
type Screen = (typeof tabs)[number]["name"];
type Store = Awaited<ReturnType<typeof loadData>>;

function Tab({ item, selected, desktop, onPress }: { item: (typeof tabs)[number]; selected: boolean; desktop: boolean; onPress: () => void }) {
  const { c } = useTheme();
  const Icon = item.icon;
  return <Pressable accessibilityRole="tab" accessibilityState={{ selected }} onPress={onPress}
    style={({ pressed }) => ({ flex: desktop ? undefined : 1, flexDirection: desktop ? "row" : "column",
      gap: desktop ? 11 : 4, alignItems: "center", justifyContent: desktop ? "flex-start" : "center", minHeight: desktop ? 48 : 54,
      paddingHorizontal: desktop ? 13 : 2, borderRadius: 13, backgroundColor: selected ? c.soft : "transparent", opacity: pressed ? 0.65 : 1 })}>
    <Icon size={20} color={selected ? c.purple : c.muted} strokeWidth={selected ? 2.4 : 1.8} />
    <Txt style={{ color: selected ? c.purple : c.muted, fontWeight: selected ? "800" : "600", fontSize: desktop ? 14 : 11 }}>{item.name}</Txt>
  </Pressable>;
}

function Welcome({ compact, onStart, onDemo }: { compact: boolean; onStart: () => void; onDemo: () => void }) {
  const { c, s } = useTheme();
  return <>
    <View style={{ gap: 10, marginTop: compact ? 10 : 22, maxWidth: 600 }}>
      <View style={{ alignSelf: "flex-start", backgroundColor: c.soft, borderRadius: 22, paddingVertical: 7, paddingHorizontal: 11 }}>
        <Txt style={[s.eyebrow, { color: c.purple }]}>A DAILY MONEY TRACKER</Txt>
      </View>
      <Txt style={{ fontSize: compact ? 42 : 59, lineHeight: compact ? 46 : 63, letterSpacing: compact ? -2.3 : -3.4, fontWeight: "800" }}>Know what you can spend today.</Txt>
      <Txt style={[s.muted, { maxWidth: 460, fontSize: 16, lineHeight: 23 }]}>Set a monthly plan, get a daily target, and log spending as you go.</Txt>
    </View>
    <View style={{ flexDirection: compact ? "column" : "row", gap: 10 }}>
      <Action onPress={onStart} label="Create my plan"><Txt style={{ color: c.onPrimary, fontWeight: "700" }}>Create my plan</Txt><ArrowRight size={16} color={c.onPrimary} /></Action>
      <Action tone="soft" onPress={onDemo}>Explore with sample data</Action>
    </View>
    <View style={{ gap: 8, marginTop: 3 }}>
      <Txt style={s.eyebrow}>EXAMPLE DAILY CHECK-IN</Txt>
      <Allowance left={42.05} spent={19.95} limit={62} rollover compact={compact} />
    </View>
    <View style={[s.row, { gap: 7 }]}><LockKeyhole size={15} color={c.faint} />
      <Txt style={[s.muted, { fontSize: 12, flex: 1 }]}>Your data stays on this device. No account needed.</Txt></View>
  </>;
}

export default function ExpenseMacros() {
  const { c, s } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const desktop = width >= 970;
  const wide = width >= 740;
  const compact = width < 530;
  const [today, setToday] = useState(isoDate);
  const [date, setDate] = useState(isoDate);
  const [screen, setScreen] = useState<Screen>("Today");
  const [stored, setStored] = useState<Store | null>(null);
  const [demo, setDemo] = useState<Store | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [importing, setImporting] = useState(false);
  const [editingPlan, setEditingPlan] = useState(false);
  const [form, setForm] = useState<{ initialDate: string; entry?: Transaction } | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [notice, setNotice] = useState<{ message: string; deleted?: Transaction } | null>(null);
  const busyRef = useRef(false);
  const scroller = useRef<ScrollView>(null);
  const data = demo ?? stored;
  const config = data?.config;
  const transactions = data?.transactions ?? [];

  function refresh() {
    setLoadError(false);
    loadData().then(setStored).catch(() => setLoadError(true));
  }
  useEffect(refresh, []);
  useEffect(() => {
    const update = () => {
      const now = isoDate();
      setToday(previous => previous === now ? previous : now);
    };
    const subscription = AppState.addEventListener("change", state => { if (state === "active") update(); });
    const timer = setInterval(update, 45_000);
    return () => { subscription.remove(); clearInterval(timer); };
  }, []);
  const priorToday = useRef(today);
  useEffect(() => {
    if (today !== priorToday.current) {
      const previous = priorToday.current;
      setDate(current => current === previous || current > today ? today : current);
      priorToday.current = today;
    }
  }, [today]);
  useEffect(() => {
    if (!notice || notice.deleted) return;
    const timer = setTimeout(() => setNotice(null), 3800);
    return () => clearTimeout(timer);
  }, [notice]);

  function jump(next: Screen) {
    setScreen(next);
    setEditingPlan(false);
    setImporting(false);
    setSaveError("");
    scroller.current?.scrollTo({ y: 0, animated: false });
  }
  function changePlan() {
    setSaveError("");
    setEditingPlan(true);
    scroller.current?.scrollTo({ y: 0, animated: false });
  }
  function openEntry(entry?: Transaction, fromToday = false) {
    setSaveError("");
    setForm({ initialDate: fromToday ? date : today, entry });
  }
  function stopDemo() {
    setDemo(null);
    setNotice(null);
    setDate(today);
    jump("Today");
  }
  async function persist(next: Store, part: "config" | "transactions") {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    setSaveError("");
    try {
      if (demo) setDemo(next);
      else {
        if (part === "config" && next.config) await saveConfig(next.config);
        if (part === "transactions") await saveTransactions(next.transactions);
        setStored(next);
      }
      return true;
    } catch {
      setSaveError("Couldn’t save to this device. Please try again.");
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  async function importEntries(incoming: Transaction[]) {
    const existingIds = new Set(transactions.map(tx => tx.id));
    const additions = incoming.filter(tx => !existingIds.has(tx.id));
    if (additions.length === 0) {
      setSaveError("These entries have already been imported.");
      return;
    }
    if (await persist({ config: config ?? null, transactions: [...additions, ...transactions] }, "transactions")) {
      setDate(additions.reduce((latest, tx) => tx.date > latest ? tx.date : latest, additions[0].date));
      jump("Activity");
      setNotice({ message: `${additions.length} transactions imported` });
    }
  }
  async function updateEntry(entry: Transaction) {
    const entries = form?.entry ? transactions.map(tx => tx.id === entry.id ? entry : tx) : [entry, ...transactions];
    if (await persist({ config: config ?? null, transactions: entries }, "transactions")) {
      const edited = !!form?.entry;
      setDate(entry.date);
      setForm(null);
      setNotice({ message: edited ? "Changes saved" : "Transaction logged" });
    }
  }
  async function deleteEntry(entry: Transaction) {
    if (await persist({ config: config ?? null, transactions: transactions.filter(tx => tx.id !== entry.id) }, "transactions")) {
      setForm(null);
      setNotice({ message: "Transaction deleted", deleted: entry });
    }
  }
  async function undoDelete() {
    if (!notice?.deleted) return;
    const entry = notice.deleted;
    if (await persist({ config: config ?? null, transactions: [entry, ...transactions] }, "transactions")) {
      setNotice({ message: "Transaction restored" });
    } else setNotice(current => current ? { ...current, message: "Couldn’t restore. Try again." } : null);
  }
  async function updatePlan(next: BudgetConfig) {
    if (await persist({ config: next, transactions }, "config")) {
      jump(config ? "Plan" : "Today");
      setNotice({ message: "Monthly plan saved" });
    }
  }

  const loggingSelectedDate = screen === "Today" || (screen === "Activity" && date.slice(0, 7) !== today.slice(0, 7));
  const logEntry = () => openEntry(undefined, loggingSelectedDate);
  const showTabs = !!config && !editingPlan && !importing;
  const metrics = config ? budgetFor(config, transactions, date) : null;

  return <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top", "left", "right"]}>
    <View style={{ flex: 1, flexDirection: desktop && showTabs ? "row" : "column" }}>
      {desktop && showTabs && <View style={{ width: 222, backgroundColor: c.surface, borderRightWidth: 1, borderColor: c.border,
        padding: 17, paddingTop: 24, paddingBottom: 20 + insets.bottom, gap: 23 }}>
        <Brand small />
        <View accessibilityRole="tablist" style={{ gap: 5 }}>
          <Txt style={[s.eyebrow, { marginBottom: 7, marginLeft: 10 }]}>WORKSPACE</Txt>
          {tabs.map(item => <Tab key={item.name} item={item} selected={screen === item.name} desktop onPress={() => jump(item.name)} />)}
        </View>
        <Action label="Log a transaction" onPress={logEntry}><Plus size={18} color={c.onPrimary} /><Txt style={{ color: c.onPrimary, fontWeight: "700" }}>Log transaction</Txt></Action>
        <View style={[s.between, { marginTop: "auto" }]}>
          <View style={[s.row, { gap: 8 }]}><LockKeyhole size={14} color={c.faint} /><Txt style={{ color: c.muted, fontSize: 11 }}>Stored on this device</Txt></View>
          <ThemeToggle />
        </View>
      </View>}
      <View style={{ flex: 1 }}>
        {(!desktop || !showTabs) && <View style={{ backgroundColor: c.surface, borderBottomWidth: 1, borderColor: c.border }}>
          <View style={[s.between, { minHeight: 62, paddingHorizontal: compact ? 16 : 26, width: "100%", maxWidth: 940, alignSelf: "center" }]}>
            <Brand small={compact} />
            <View style={[s.row, { gap: 8 }]}>
              <ThemeToggle />
              {showTabs && <IconButton label="Log a transaction" onPress={logEntry} style={{ backgroundColor: c.primary }}>
                <Plus size={23} color={c.onPrimary} />
              </IconButton>}
            </View>
          </View>
        </View>}
        <ScrollView ref={scroller} keyboardShouldPersistTaps="handled" contentContainerStyle={{
          flexGrow: 1, paddingTop: compact ? 17 : 25, paddingHorizontal: compact ? 16 : 27, paddingBottom: 20 + (!showTabs || desktop ? insets.bottom : 0),
        }}>
          <View style={{ width: "100%", maxWidth: editingPlan ? 560 : !config ? 625 : screen === "Plan" ? 650 : 950, alignSelf: "center", gap: 13 }}>
            {!stored && (loadError ? <View style={[s.panel, { padding: 20, gap: 12 }]}>
              <Txt style={s.title}>Couldn’t open your data</Txt><Txt style={s.muted}>Check that storage is available on this device and try again.</Txt><Action onPress={refresh}>Try again</Action>
            </View> : <ActivityIndicator color={c.purple} accessibilityLabel="Loading your budget" style={{ marginTop: 40 }} />)}
            {demo && <View style={[s.row, { backgroundColor: c.soft, paddingLeft: 12, borderRadius: 13, gap: 7 }]}>
              <FlaskConical size={16} color={c.purple} /><Txt style={{ color: c.purple, flex: 1, fontSize: 12, fontWeight: "700" }}>Sample data · changes won’t be saved</Txt>
              <IconButton label="Exit sample data" onPress={stopDemo} disabled={busy}><X size={18} color={c.purple} /></IconButton>
            </View>}
            {!!stored && !config && !editingPlan && <Welcome compact={compact} onStart={changePlan} onDemo={() => { setDemo(sampleData(today)); setDate(today); jump("Today"); }} />}
            {editingPlan && <PlanForm config={config ?? null} busy={busy} error={saveError} onSave={updatePlan} onCancel={() => { setEditingPlan(false); setSaveError(""); }} />}
            {importing && <TransactionImport busy={busy} error={saveError} onSave={importEntries} onCancel={() => jump("Activity")} />}
            {showTabs && metrics && config && (screen === "Today" ?
              <Today data={metrics} transactions={transactions} date={date} today={today} compact={compact} wide={wide}
                rollover={!!config.rolloverUnspent} onDate={setDate} add={() => openEntry(undefined, true)} edit={openEntry} activity={() => jump("Activity")} /> :
              screen === "Activity" ? <Activity data={metrics} date={date} wide={wide} onDate={setDate}
                add={logEntry} edit={openEntry} openImport={() => {
                  setSaveError("");
                  setImporting(true);
                  scroller.current?.scrollTo({ y: 0, animated: false });
                }} /> :
              <PlanSummary config={config} onEdit={changePlan} />)}
          </View>
        </ScrollView>
        {!!notice && !form && !editingPlan && !importing && <View accessibilityLiveRegion="polite" style={[s.between, {
          alignSelf: "center", marginHorizontal: 15, marginBottom: 7, backgroundColor: c.hero, paddingLeft: 14, borderRadius: 13, gap: 9, minHeight: 43,
        }]}>
          <Txt style={{ color: c.onHero, fontWeight: "600", fontSize: 13 }}>{notice.message}</Txt>
          {notice.deleted && <Action tone="soft" onPress={undoDelete} disabled={busy} style={{ minHeight: 36 }}>Undo</Action>}
          <IconButton label="Dismiss message" onPress={() => setNotice(null)} disabled={busy}><X size={16} color={c.onHero} /></IconButton>
        </View>}
        {!desktop && showTabs && <View accessibilityRole="tablist" style={{
          flexDirection: "row", gap: 7, backgroundColor: c.surface, borderTopWidth: 1, borderColor: c.border,
          paddingTop: 6, paddingHorizontal: 13, paddingBottom: Math.max(insets.bottom, 7),
        }}>
          {tabs.map(item => <Tab key={item.name} item={item} desktop={false} selected={screen === item.name} onPress={() => jump(item.name)} />)}
        </View>}
      </View>
    </View>
    {form && <TransactionForm initialDate={form.initialDate} entry={form.entry} busy={busy} error={saveError}
      onClose={() => { if (!busyRef.current) setForm(null); }} onSave={updateEntry} onDelete={deleteEntry} />}
  </SafeAreaView>;
}
