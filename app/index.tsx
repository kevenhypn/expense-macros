import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, AppState, Platform, Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { ArrowRight, CalendarDays, FlaskConical, List, LockKeyhole, Plus, SlidersHorizontal, X } from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Activity, Allowance, Today } from "../components/dashboard";
import { GlassTabBar } from "../components/GlassTabBar";
import { TransactionImport } from "../components/TransactionImport";
import { PlanForm, PlanSummary, TransactionForm } from "../components/forms";
import { Action, Banner, Brand, IconButton, ThemeToggle, Txt, useTheme } from "../components/ui";
import { budgetFor, isoDate } from "../lib/budget";
import { sampleData } from "../lib/demo";
import { DataError, clearData, loadData, saveConfig, saveTransactions } from "../lib/storage";
import type { BudgetConfig, Transaction } from "../types";

const glassTabBarHeight = 64;

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
      gap: desktop ? 8 : 4, alignItems: "center", justifyContent: desktop ? "flex-start" : "center", minHeight: desktop ? 48 : 56,
      paddingHorizontal: desktop ? 12 : 4, borderRadius: 10, backgroundColor: selected ? c.soft : "transparent", opacity: pressed ? 0.7 : 1 })}>
    <Icon size={20} color={selected ? c.accent : c.muted} strokeWidth={selected ? 2.3 : 1.9} />
    <Txt style={{ color: selected ? c.accent : c.muted, fontWeight: selected ? "700" : "600", fontSize: desktop ? 15 : 12 }}>{item.name}</Txt>
  </Pressable>;
}

function Welcome({ compact, onStart, onDemo }: { compact: boolean; onStart: () => void; onDemo: () => void }) {
  const { c, s } = useTheme();
  const today = isoDate();
  const sample = sampleData(today);
  const preview = budgetFor(sample.config, sample.transactions, today, today);
  return <>
    <View style={{ gap: 8, marginTop: compact ? 8 : 16, maxWidth: 560 }}>
      <Txt accessibilityRole="header" style={{ fontSize: compact ? 32 : 40, lineHeight: compact ? 38 : 46, letterSpacing: -0.6, fontWeight: "700" }}>
        See what you can spend today.
      </Txt>
      <Txt style={[s.muted, { maxWidth: 460 }]}>Enter take-home income, bills, and a savings target. Expense Macros turns the rest into a daily pace.</Txt>
    </View>
    <View style={{ flexDirection: compact ? "column" : "row", gap: 8 }}>
      <Action onPress={onStart} label="Create a plan"><Txt style={{ color: c.onPrimary, fontWeight: "600" }}>Create a plan</Txt><ArrowRight size={16} color={c.onPrimary} /></Action>
      <Action tone="soft" onPress={onDemo}>Try sample data</Action>
    </View>
    <View style={{ gap: 8 }}>
      <Txt style={s.caption}>Example from the sample plan</Txt>
      <Allowance data={preview} date={today} rollover={false} isToday />
    </View>
    <View style={[s.row, { gap: 8 }]}>
      <LockKeyhole size={16} color={c.faint} />
      <Txt style={[s.muted, { fontSize: 13, flex: 1 }]}>Saved on this device. No account.</Txt>
    </View>
  </>;
}

export default function ExpenseMacros() {
  const { c, s } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const desktop = width >= 960;
  const wide = width >= 800;
  const compact = width < 560;
  const [today, setToday] = useState(isoDate);
  const [date, setDate] = useState(isoDate);
  const [screen, setScreen] = useState<Screen>("Today");
  const [stored, setStored] = useState<Store | null>(null);
  const [demo, setDemo] = useState<Store | null>(null);
  const [loadError, setLoadError] = useState("");
  const [importing, setImporting] = useState(false);
  const [editingPlan, setEditingPlan] = useState(false);
  const [confirmErase, setConfirmErase] = useState(false);
  const [hideWarnings, setHideWarnings] = useState(false);
  const [form, setForm] = useState<{ initialDate: string; entry?: Transaction } | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [notice, setNotice] = useState<{ message: string; deleted?: Transaction } | null>(null);
  const busyRef = useRef(false);
  const scroller = useRef<ScrollView>(null);
  const data = demo ?? stored;
  const config = data?.config;
  const transactions = data?.transactions ?? [];
  const warnings = demo ? [] : stored?.warnings ?? [];

  function refresh() {
    setLoadError("");
    loadData().then(value => { setStored(value); setLoadError(""); }).catch(error => {
      setLoadError(error instanceof DataError ? error.message : "Couldn’t open the saved data on this device.");
    });
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
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || busyRef.current) return;
      if (form) setForm(null);
      else if (confirmErase) setConfirmErase(false);
      else if (editingPlan) { setEditingPlan(false); setSaveError(""); }
      else if (importing) { setImporting(false); setSaveError(""); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [form, confirmErase, editingPlan, importing]);

  function jump(next: Screen) {
    setScreen(next);
    setEditingPlan(false);
    setImporting(false);
    setConfirmErase(false);
    setSaveError("");
    scroller.current?.scrollTo({ y: 0, animated: false });
  }
  function changePlan() {
    setSaveError("");
    setConfirmErase(false);
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
    if (busyRef.current) {
      setSaveError("Still saving the last change. Try again.");
      return false;
    }
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
      setSaveError("Couldn’t save on this device. Try again.");
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
      setSaveError("These entries are already in the log.");
      return;
    }
    const skipped = incoming.length - additions.length;
    if (await persist({ config: config ?? null, transactions: [...additions, ...transactions], warnings }, "transactions")) {
      setDate(additions.reduce((latest, tx) => tx.date > latest ? tx.date : latest, additions[0].date));
      jump("Activity");
      setNotice({ message: skipped
        ? `Imported ${additions.length}. Skipped ${skipped} already in the log.`
        : `Imported ${additions.length} ${additions.length === 1 ? "transaction" : "transactions"}.` });
    }
  }
  async function updateEntry(entry: Transaction) {
    const entries = form?.entry ? transactions.map(tx => tx.id === entry.id ? entry : tx) : [entry, ...transactions];
    if (await persist({ config: config ?? null, transactions: entries, warnings }, "transactions")) {
      const edited = !!form?.entry;
      setDate(entry.date > today ? today : entry.date);
      setForm(null);
      setNotice({ message: edited ? "Changes saved" : "Transaction logged" });
    }
  }
  async function deleteEntry(entry: Transaction) {
    if (await persist({ config: config ?? null, transactions: transactions.filter(tx => tx.id !== entry.id), warnings }, "transactions")) {
      setForm(null);
      setNotice({ message: `Deleted ${entry.note?.trim() || entry.category}`, deleted: entry });
    }
  }
  async function undoDelete() {
    if (!notice?.deleted) return;
    const entry = notice.deleted;
    if (await persist({ config: config ?? null, transactions: [entry, ...transactions], warnings }, "transactions")) {
      setNotice({ message: "Transaction restored" });
    } else setNotice(current => current ? { ...current, message: "Couldn’t restore it. Try again." } : null);
  }
  async function updatePlan(next: BudgetConfig) {
    if (await persist({ config: next, transactions, warnings }, "config")) {
      jump(config ? "Plan" : "Today");
      setNotice({ message: "Plan saved" });
    }
  }
  async function erase() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      if (!demo) await clearData();
      const empty = { config: null, transactions: [], warnings: [] };
      if (demo) setDemo(null);
      setStored(empty);
      setLoadError("");
      setConfirmErase(false);
      setDate(today);
      jump("Today");
      setNotice({ message: demo ? "Left sample data" : "Erased the data on this device" });
    } catch {
      setSaveError("Couldn’t erase the data on this device.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const loggingSelectedDate = screen === "Today" || (screen === "Activity" && date.slice(0, 7) !== today.slice(0, 7));
  const logEntry = () => openEntry(undefined, loggingSelectedDate);
  const showTabs = !!config && !editingPlan && !importing;
  const showGlassTabs = Platform.OS === "web" && !desktop && showTabs;
  const glassBottom = Math.max(16, insets.bottom - 8);
  const glassClearance = glassBottom + glassTabBarHeight;
  const bottomPadding = showGlassTabs ? glassClearance + 16 : 24 + (!showTabs || desktop ? insets.bottom : 0);
  const metrics = useMemo(
    () => config ? budgetFor(config, transactions, date, today) : null,
    [config, transactions, date, today],
  );

  return <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top", "left", "right"]}>
    <View style={{ flex: 1, flexDirection: desktop && showTabs ? "row" : "column" }}>
      {desktop && showTabs && <View style={{ width: 232, backgroundColor: c.surface, borderRightWidth: 1, borderColor: c.border,
        padding: 16, paddingTop: 24, paddingBottom: 16 + insets.bottom, gap: 24 }}>
        <Brand />
        <View accessibilityRole="tablist" style={{ gap: 4 }}>
          {tabs.map(item => <Tab key={item.name} item={item} selected={screen === item.name} desktop onPress={() => jump(item.name)} />)}
        </View>
        <Action label="Log transaction" onPress={logEntry}><Plus size={18} color={c.onPrimary} /><Txt style={{ color: c.onPrimary, fontWeight: "600" }}>Log transaction</Txt></Action>
        <View style={[s.between, { marginTop: "auto" }]}>
          <View style={[s.row, { gap: 8 }]}><LockKeyhole size={14} color={c.faint} /><Txt style={{ color: c.muted, fontSize: 12 }}>On this device</Txt></View>
          <ThemeToggle />
        </View>
      </View>}
      <View style={{ flex: 1 }}>
        {(!desktop || !showTabs) && <View style={{ backgroundColor: c.surface, borderBottomWidth: 1, borderColor: c.border }}>
          <View style={[s.between, { minHeight: 60, paddingHorizontal: compact ? 16 : 24, width: "100%", maxWidth: 960, alignSelf: "center" }]}>
            <Brand small={compact} />
            <View style={[s.row, { gap: 8 }]}>
              <ThemeToggle />
              {showTabs && <IconButton label="Log transaction" onPress={logEntry} style={{ backgroundColor: c.primary }}>
                <Plus size={22} color={c.onPrimary} />
              </IconButton>}
            </View>
          </View>
        </View>}
        <ScrollView ref={scroller} keyboardShouldPersistTaps="handled" contentContainerStyle={{
          flexGrow: 1, paddingTop: compact ? 16 : 24, paddingHorizontal: compact ? 16 : 24, paddingBottom: bottomPadding,
        }}>
          <View style={{ width: "100%", maxWidth: editingPlan || importing ? 640 : !config ? 680 : screen === "Plan" ? 680 : 980, alignSelf: "center", gap: 16 }}>
            {!stored && !demo && (loadError ? <View style={[s.panel, { padding: 20, gap: 12 }]}>
              <Txt accessibilityRole="header" style={[s.label, { fontSize: 20 }]}>Couldn’t open your data</Txt>
              <Txt style={s.muted}>{loadError} You can try again, or erase the saved plan and log and start over.</Txt>
              {!confirmErase ? <>
                <Action onPress={refresh}>Try again</Action>
                <Action tone="danger" onPress={() => setConfirmErase(true)}>Erase data on this device</Action>
              </> : <>
                <Banner tone="error" title="Erase everything stored here?">The plan and every transaction will be deleted. This cannot be undone.</Banner>
                <Action tone="danger" onPress={erase} disabled={busy}>Erase everything</Action>
                <Action tone="soft" onPress={() => setConfirmErase(false)}>Keep data</Action>
              </>}
            </View> : <ActivityIndicator color={c.accent} accessibilityLabel="Loading your budget" style={{ marginTop: 40 }} />)}
            {demo && <View style={[s.row, { backgroundColor: c.soft, paddingLeft: 12, borderRadius: 12, gap: 8 }]}>
              <FlaskConical size={16} color={c.accent} />
              <Txt style={{ color: c.accent, flex: 1, fontSize: 13, fontWeight: "600" }}>Sample data is not saved.</Txt>
              <IconButton label="Leave sample data" onPress={stopDemo} disabled={busy}><X size={18} color={c.accent} /></IconButton>
            </View>}
            {!hideWarnings && warnings.length > 0 && showTabs && <Banner title="Some saved rows were skipped">
              {warnings.join(" ")} The readable plan and log are still here.
            </Banner>}
            {!hideWarnings && warnings.length > 0 && showTabs && <Action tone="soft" onPress={() => setHideWarnings(true)}>Dismiss</Action>}
            {!!stored && !config && !editingPlan && !loadError && <Welcome compact={compact} onStart={changePlan} onDemo={() => { setDemo({ ...sampleData(today), warnings: [] }); setDate(today); jump("Today"); }} />}
            {editingPlan && <PlanForm config={config ?? null} busy={busy} error={saveError} onSave={updatePlan} onCancel={() => { setEditingPlan(false); setSaveError(""); }} />}
            {importing && <TransactionImport busy={busy} error={saveError} existing={transactions} onSave={importEntries} onCancel={() => jump("Activity")} />}
            {confirmErase && showTabs && <View style={[s.panel, { padding: 16, gap: 12 }]}>
              <Txt style={[s.label, { fontSize: 18 }]}>Erase the data on this device?</Txt>
              <Txt style={s.muted}>This deletes the plan and every transaction. It cannot be undone.</Txt>
              <Action tone="danger" onPress={erase} disabled={busy}>Erase everything</Action>
              <Action tone="soft" onPress={() => setConfirmErase(false)}>Keep data</Action>
            </View>}
            {showTabs && metrics && config && !confirmErase && (screen === "Today" ?
              <Today data={metrics} transactions={transactions} date={date} today={today} wide={wide}
                rollover={!!config.rolloverUnspent} onDate={setDate} add={() => openEntry(undefined, true)} edit={openEntry} activity={() => jump("Activity")} /> :
              screen === "Activity" ? <Activity data={metrics} date={date} today={today} wide={wide} onDate={setDate}
                add={logEntry} edit={openEntry} openImport={() => {
                  setSaveError("");
                  setImporting(true);
                  scroller.current?.scrollTo({ y: 0, animated: false });
                }} /> :
              <PlanSummary config={config} onEdit={changePlan} onErase={demo ? undefined : () => { setSaveError(""); setConfirmErase(true); }} />)}
          </View>
        </ScrollView>
        {!!notice && !form && !editingPlan && !importing && !confirmErase && <View accessibilityLiveRegion="polite" accessibilityRole="alert" style={[s.between, {
          alignSelf: "center", marginHorizontal: 16, marginBottom: 8, backgroundColor: c.hero, paddingLeft: 16, borderRadius: 12, gap: 8, minHeight: 48,
        }, showGlassTabs && { position: "absolute", left: 16, right: 16, bottom: glassClearance + 12, zIndex: 2, marginHorizontal: 0, borderWidth: 1, borderColor: c.heroLine }]}>
          <Txt style={{ color: c.onHero, fontWeight: "600", fontSize: 14, flex: 1 }}>{notice.message}</Txt>
          {notice.deleted && <Action tone="soft" onPress={undoDelete} disabled={busy} style={{ minHeight: 36 }}>Undo</Action>}
          <IconButton label="Dismiss message" onPress={() => setNotice(null)} disabled={busy}><X size={16} color={c.onHero} /></IconButton>
        </View>}
        {showGlassTabs && <GlassTabBar tabs={tabs} active={screen} bottom={glassBottom} height={glassTabBarHeight} onSelect={jump} />}
        {!desktop && showTabs && !showGlassTabs && <View accessibilityRole="tablist" style={{
          flexDirection: "row", gap: 8, backgroundColor: c.surface, borderTopWidth: 1, borderColor: c.border,
          paddingTop: 8, paddingHorizontal: 12, paddingBottom: Math.max(insets.bottom, 8),
        }}>
          {tabs.map(item => <Tab key={item.name} item={item} desktop={false} selected={screen === item.name} onPress={() => jump(item.name)} />)}
        </View>}
      </View>
    </View>
    {form && <TransactionForm initialDate={form.initialDate} entry={form.entry} busy={busy} error={saveError}
      onClose={() => { if (!busyRef.current) setForm(null); }} onSave={updateEntry} onDelete={deleteEntry} />}
  </SafeAreaView>;
}
