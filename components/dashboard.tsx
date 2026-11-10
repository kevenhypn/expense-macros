import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react-native";
import type { Transaction, TransactionCategory } from "../types";
import { budgetFor, dateLabel, dayEquation, formatCents, monthEquation, moveDay, moveMonth, weekDates } from "../lib/budget";
import { dollarsToCents } from "../lib/money";
import { Action, Badge, Banner, IconButton, Meter, Txt, useTheme } from "./ui";

type Budget = ReturnType<typeof budgetFor>;
const dayName = (date: string) => dateLabel(date, { weekday: "short", month: "short", day: "numeric" });
const monthName = (date: string) => dateLabel(date, { month: "long", year: "numeric" });

function usedPercent(spent: number, target: number) {
  if (target > 0) return Math.max(0, Math.round(spent / target * 100));
  return spent > 0 ? 100 : null;
}

function signedMoney(cents: number) {
  if (cents > 0) return `+${formatCents(cents)}`;
  return formatCents(cents).replace("-", "−");
}

export function DateStrip({ date, today, entries, onDate }: {
  date: string; today: string; entries: Transaction[]; onDate: (date: string) => void;
}) {
  const { c, s } = useTheme();
  const week = weekDates(date);
  const first = week[0];
  const last = week[6];
  const label = first.slice(0, 7) === last.slice(0, 7)
    ? `${dateLabel(first, { month: "long" })} ${Number(first.slice(-2))}–${Number(last.slice(-2))}`
    : `${dateLabel(first, { month: "short", day: "numeric" })} – ${dateLabel(last, { month: "short", day: "numeric" })}`;
  return <View style={[s.panel, { paddingHorizontal: 8, paddingBottom: 8 }]}>
    <View style={[s.between, { minHeight: 48 }]}>
      <IconButton label="Previous week" onPress={() => onDate(moveDay(date, -7))}><ChevronLeft size={18} color={c.muted} /></IconButton>
      <View style={[s.row, { gap: 8 }]}><CalendarDays size={16} color={c.accent} /><Txt style={s.label}>{label}</Txt></View>
      <IconButton label="Next week" onPress={() => onDate(moveDay(date, 7))} disabled={moveDay(last, 1) > today}><ChevronRight size={18} color={c.muted} /></IconButton>
    </View>
    <View style={{ flexDirection: "row", gap: 4 }}>
      {week.map(day => {
        const selected = day === date;
        const logged = entries.some(tx => tx.date === day && !tx.isSystem);
        return <Pressable key={day} onPress={() => onDate(day)} disabled={day > today} accessibilityRole="button"
          accessibilityState={{ selected, disabled: day > today }}
          accessibilityLabel={`${dayName(day)}${day === today ? ", today" : ""}${logged ? ", transaction logged" : ""}`}
          style={({ pressed }) => ({ flex: 1, minHeight: 56, gap: 2, justifyContent: "center", alignItems: "center", borderRadius: 10,
            borderCurve: "continuous", backgroundColor: selected ? c.primary : day === today ? c.soft : "transparent",
            opacity: day > today ? 0.4 : pressed ? 0.75 : 1 })}>
          <Txt style={{ color: selected ? c.onPrimary : c.muted, fontSize: 12, fontWeight: "600" }}>{dateLabel(day, { weekday: "short" })}</Txt>
          <Txt style={{ color: selected ? c.onPrimary : c.ink, fontSize: 16, fontWeight: "700" }}>{Number(day.slice(-2))}</Txt>
          <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: logged ? (selected ? c.onPrimary : c.accent) : "transparent" }} />
        </Pressable>;
      })}
    </View>
  </View>;
}

export function Allowance({ data, date, rollover, isToday = true, wide = false, onMonth }: {
  data: Budget; date: string; rollover: boolean; isToday?: boolean; wide?: boolean; onMonth?: () => void;
}) {
  const { c, s } = useTheme();
  const over = data.dayLeftCents < 0;
  const percent = usedPercent(data.daySpentCents, data.dailyCents);
  const meterColor = over ? c.heroError : percent !== null && percent > 80 ? c.heroWarning : c.heroGreen;
  const balanceColor = over ? c.heroError : data.dayLeftCents > 0 ? c.heroGreen : c.onHero;
  const dayLabel = over ? (isToday ? "Over today" : "Over that day") : (isToday ? "Left to spend today" : "Left that day");
  const monthOver = data.monthLeftCents < 0;
  const monthPercent = usedPercent(data.monthSpentCents, data.monthBudgetCents);
  const monthColor = monthOver ? c.heroError : monthPercent !== null && monthPercent > 80 ? c.heroWarning : c.heroGreen;
  const pendingParts = [
    data.pendingSpendCents > 0 ? `${formatCents(data.pendingSpendCents)} in pending charges` : "",
    data.pendingIncomeCents > 0 ? `${formatCents(data.pendingIncomeCents)} in pending income` : "",
  ].filter(Boolean);
  const pending = pendingParts.join(" and ");
  return <View style={{ backgroundColor: c.hero, borderRadius: 16, borderCurve: "continuous", padding: 16, gap: 12 }}>
    <View style={{ flexDirection: wide && onMonth ? "row" : "column", gap: 16 }}>
      <View style={{ flex: 1.3, minWidth: 0, gap: 8 }}
        accessibilityLabel={`${dayLabel}: ${formatCents(Math.abs(data.dayLeftCents))}. ${dayEquation(data)}`}>
        <View style={s.between}>
          <Txt style={[s.caption, { color: c.heroMuted }]}>{dayLabel}</Txt>
          <Txt style={{ color: c.onHero, fontSize: 12, fontWeight: "600" }}>{rollover ? "Adaptive pace" : "Fixed pace"}</Txt>
        </View>
        <Txt selectable maxFontSizeMultiplier={1.3} style={[s.number, { color: balanceColor, fontSize: 40, lineHeight: 44, letterSpacing: -0.8 }]}>
          {formatCents(Math.abs(data.dayLeftCents))}
        </Txt>
        <Txt style={{ color: c.heroMuted, fontSize: 13, lineHeight: 18 }}>{dayEquation(data)}</Txt>
        <Meter percent={percent} color={meterColor} track={c.heroLine}
          label={percent === null ? "No daily target" : `${percent}% of today’s target used`} />
        <Txt style={{ color: c.heroMuted, fontSize: 12, lineHeight: 16 }}>
          {rollover ? "Today’s share of what is still left this month." : "The same share of the plan each day."}
        </Txt>
      </View>
      {onMonth && <>
        <View style={{ width: wide ? 1 : undefined, height: wide ? undefined : 1, backgroundColor: c.heroLine }} />
        <Pressable accessibilityRole="button" accessibilityLabel={`Open ${dateLabel(date, { month: "long" })} in Activity`} onPress={onMonth}
          style={({ pressed }) => ({ flex: 1, minWidth: 0, justifyContent: "center", gap: 8, opacity: pressed ? 0.75 : 1 })}>
          <View style={s.between}>
            <Txt style={[s.caption, { color: c.heroMuted }]}>{monthOver ? `Over in ${dateLabel(date, { month: "long" })}` : `Left in ${dateLabel(date, { month: "long" })}`}</Txt>
            <Txt selectable style={[s.number, { color: monthOver ? c.heroError : data.monthLeftCents > 0 ? c.heroGreen : c.onHero, fontSize: wide ? 24 : 16 }]}>
              {formatCents(Math.abs(data.monthLeftCents))}
            </Txt>
          </View>
          <Meter percent={monthPercent} color={monthColor} track={c.heroLine}
            label={monthPercent === null ? "No monthly allowance" : `${monthPercent}% of this month’s budget used`} />
          {wide && <Txt style={{ color: c.heroMuted, fontSize: 12, lineHeight: 16 }}>{monthEquation(data)}</Txt>}
        </Pressable>
      </>}
    </View>
    {!!pending && <Txt style={{ color: c.heroMuted, fontSize: 13, lineHeight: 18 }}>
      {pending} {pendingParts.length > 1 ? "are" : "is"} not included.
    </Txt>}
  </View>;
}

export function Entries({ items, emptyTitle, emptyText, add, edit, showDate = false }: {
  items: Transaction[]; emptyTitle: string; emptyText: string; add?: () => void; edit: (tx: Transaction) => void; showDate?: boolean;
}) {
  const { c, s } = useTheme();
  if (!items.length) return <View style={[s.panel, { padding: 20, alignItems: "center", gap: 8 }]}>
    <Txt style={s.label}>{emptyTitle}</Txt>
    <Txt style={[s.muted, { textAlign: "center" }]}>{emptyText}</Txt>
    {add && <Action tone="soft" onPress={add} style={{ marginTop: 4 }}>Log transaction</Action>}
  </View>;
  return <View style={[s.panel, { paddingHorizontal: 12 }]}>
    {items.map((tx, index) => {
      const cents = dollarsToCents(tx.amount) ?? 0;
      const title = tx.note?.trim() || (tx.category === "Income" ? "Extra income" : tx.category);
      return <Pressable key={tx.id} onPress={() => edit(tx)} accessibilityRole="button"
        accessibilityLabel={`Edit ${title}, ${formatCents(cents)}${tx.pending ? ", pending" : ""}`}
        style={({ pressed }) => [s.row, { gap: 12, minHeight: 64, paddingVertical: 8, opacity: pressed ? 0.7 : 1,
          borderBottomWidth: index === items.length - 1 ? 0 : 1, borderBottomColor: c.border }]}>
        <Badge category={tx.category} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt lines={1} style={s.label}>{title}</Txt>
          <Txt lines={1} style={{ color: c.muted, fontSize: 13 }}>
            {tx.category}{cents > 0 && tx.category !== "Income" ? " · Refund" : ""}{showDate ? ` · ${dayName(tx.date)}` : ""}{tx.pending ? " · Pending" : ""}
          </Txt>
          {!!tx.account && <Txt lines={1} style={{ color: c.muted, fontSize: 13 }}>{tx.account}</Txt>}
        </View>
        <Txt style={[s.number, { color: cents > 0 ? c.green : c.ink, fontSize: 15 }]}>{signedMoney(cents)}</Txt>
        <ChevronRight size={16} color={c.faint} />
      </Pressable>;
    })}
  </View>;
}

function Breakdown({ data, selected, onSelect }: {
  data: Budget; selected: TransactionCategory | null; onSelect: (category: TransactionCategory) => void;
}) {
  const { c, s, cat } = useTheme();
  const categories = data.categories.filter(row => row.cents !== 0).sort((a, b) => b.cents - a.cents);
  const total = categories.reduce((sum, row) => sum + Math.max(0, row.cents), 0);
  return <View style={[s.panel, { padding: 16, gap: 12 }]}>
    <Txt style={s.label}>Where it went</Txt>
    {categories.length === 0 ? <Txt style={s.muted}>Category totals show up after you log a posted expense.</Txt> : <>
      {total > 0 && <View accessibilityLabel="Spending by category" style={{ flexDirection: "row", height: 8, borderRadius: 4, overflow: "hidden", gap: 2 }}>
        {categories.filter(row => row.cents > 0).map(row => <View key={row.category} style={{ flex: row.cents / total, backgroundColor: cat[row.category].bar }} />)}
      </View>}
      {categories.map(row => {
        const active = selected === row.category;
        return <Pressable key={row.category} accessibilityRole="button" accessibilityState={{ selected: active }}
          accessibilityLabel={`${active ? "Stop filtering" : "Filter"} by ${row.category}, ${formatCents(Math.abs(row.cents))}`}
          onPress={() => onSelect(row.category)}
          style={({ pressed }) => [s.between, { gap: 8, minHeight: 44, borderRadius: 10, paddingHorizontal: 4, opacity: pressed ? 0.7 : 1, backgroundColor: active ? c.soft : "transparent" }]}>
          <View style={[s.row, { gap: 8 }]}><Badge category={row.category} size={32} /><Txt style={s.label}>{row.category}</Txt></View>
          <Txt style={[s.number, { color: row.cents < 0 ? c.green : c.ink }]}>{row.cents < 0 ? `+${formatCents(-row.cents)}` : formatCents(row.cents)}</Txt>
        </Pressable>;
      })}
    </>}
  </View>;
}

export function Today({ data, transactions, date, today, wide, rollover, onDate, add, edit, activity }: {
  data: Budget; transactions: Transaction[]; date: string; today: string; wide: boolean; rollover: boolean;
  onDate: (date: string) => void; add: () => void; edit: (tx: Transaction) => void; activity: () => void;
}) {
  const { c, s } = useTheme();
  const isToday = date === today;
  return <>
    <View style={[s.between, { gap: 12, alignItems: "flex-end" }]}>
      <View style={{ flexShrink: 1, gap: 2 }}>
        <Txt style={s.caption}>{dateLabel(date, { weekday: "long", month: "long", day: "numeric" })}</Txt>
        <Txt accessibilityRole="header" style={s.title}>{isToday ? "Today" : dateLabel(date, { month: "long", day: "numeric" })}</Txt>
      </View>
      {!isToday && <Action tone="soft" onPress={() => onDate(today)}>Back to today</Action>}
    </View>
    <DateStrip date={date} today={today} entries={transactions} onDate={value => onDate(value > today ? today : value)} />
    {data.plan.flex < 0 && <Banner tone="warning" title="The plan is short">
      Bills and savings are {formatCents(-data.plan.flex)} more than income, so the daily target stays negative until the plan changes.
    </Banner>}
    {data.hiddenFuture > 0 && <Banner>
      {data.hiddenFuture === 1 ? "1 transaction dated after today is hidden." : `${data.hiddenFuture} transactions dated after today are hidden.`}
    </Banner>}
    <Allowance data={data} date={date} rollover={rollover} isToday={isToday} wide={wide} onMonth={activity} />
    <View style={{ gap: 8 }}>
      <View style={s.between}>
        <Txt accessibilityRole="header" style={[s.label, { fontSize: 17 }]}>{isToday ? "Today’s log" : "That day’s log"}</Txt>
        <IconButton label="Log transaction" onPress={add} style={{ backgroundColor: c.soft }}><Plus size={18} color={c.accent} /></IconButton>
      </View>
      <Entries items={data.entries.filter(tx => tx.date === date)} emptyTitle="Nothing logged for this day"
        emptyText="Add a purchase, a refund, or extra income." add={add} edit={edit} />
    </View>
  </>;
}

const filters = ["All", "Expenses", "Refunds", "Income", "Pending"] as const;

export function Activity({ data, date, today, wide, onDate, edit, add, openImport }: {
  data: Budget; date: string; today: string; wide: boolean; onDate: (value: string) => void;
  edit: (tx: Transaction) => void; add: () => void; openImport: () => void;
}) {
  const { c, s, scheme } = useTheme();
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [category, setCategory] = useState<TransactionCategory | null>(null);
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const sorted = data.entries.filter(tx => {
    if (category && tx.category !== category) return false;
    if (filter === "Pending" && !tx.pending) return false;
    if (filter !== "All" && filter !== "Pending") {
      if (tx.pending) return false;
      if (filter === "Income" && tx.category !== "Income") return false;
      if (filter === "Refunds" && (tx.category === "Income" || tx.amount <= 0)) return false;
      if (filter === "Expenses" && tx.amount >= 0) return false;
    }
    if (!needle) return true;
    const cents = Math.abs(dollarsToCents(tx.amount) ?? 0);
    const hay = `${tx.note ?? ""} ${tx.category} ${tx.account ?? ""} ${(cents / 100).toFixed(2)} ${formatCents(cents)}`.toLowerCase();
    return hay.includes(needle);
  }).sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  const monthOver = data.monthLeftCents < 0;
  const monthPercent = usedPercent(data.monthSpentCents, data.monthBudgetCents);
  const narrowed = !!needle || !!category || filter !== "All";
  return <>
    <View style={{ gap: 4 }}>
      <Txt accessibilityRole="header" style={s.title}>Activity</Txt>
      <Txt style={s.muted}>Posted totals for the month. Pending charges stay out until you mark them posted.</Txt>
    </View>
    <View style={[s.panel, s.between, { paddingHorizontal: 8 }]}>
      <IconButton label="Previous month" onPress={() => onDate(moveMonth(date, -1))}><ChevronLeft size={18} color={c.muted} /></IconButton>
      <Txt style={s.label}>{monthName(date)}</Txt>
      <IconButton label="Next month" onPress={() => {
        const next = moveMonth(date, 1);
        onDate(next > today ? today : next);
      }} disabled={date.slice(0, 7) >= today.slice(0, 7)}><ChevronRight size={18} color={c.muted} /></IconButton>
    </View>
    <View style={{ flexDirection: wide ? "row" : "column", gap: 16, alignItems: wide ? "flex-start" : "stretch" }}>
      <View style={{ flex: wide ? 1 : undefined, gap: 12, minWidth: 0 }}>
        <View style={[s.panel, { padding: 16, gap: 8 }]}>
          <Txt style={s.caption}>{monthOver ? "Over this month" : "Left this month"}</Txt>
          <Txt selectable style={[s.number, { fontSize: 32, letterSpacing: -0.6, color: monthOver ? c.error : data.monthLeftCents > 0 ? c.green : c.ink }]}>
            {formatCents(Math.abs(data.monthLeftCents))}
          </Txt>
          <Meter percent={monthPercent} color={monthOver ? c.error : c.accent} track={c.track}
            label={monthPercent === null ? "No monthly allowance" : `${monthPercent}% of this month’s budget used`} />
          <Txt style={[s.muted, { fontSize: 13, lineHeight: 18 }]}>{monthEquation(data)}</Txt>
        </View>
        <Breakdown data={data} selected={category} onSelect={value => { setCategory(current => current === value ? null : value); setFilter("All"); }} />
      </View>
      <View style={{ flex: wide ? 1.2 : undefined, minWidth: 0, gap: 12 }}>
        <View style={s.between}>
          <Txt accessibilityRole="header" style={[s.label, { fontSize: 17 }]}>Transactions</Txt>
          <View style={[s.row, { gap: 8 }]}>
            <Action onPress={openImport} tone="soft">Import</Action>
            <IconButton label="Log transaction" onPress={add} style={{ backgroundColor: c.soft }}><Plus size={18} color={c.accent} /></IconButton>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {filters.map(item => <Pressable accessibilityRole="button" accessibilityState={{ selected: item === filter }} key={item}
            onPress={() => { setFilter(item); setCategory(null); }} style={{ backgroundColor: item === filter ? c.soft : c.surface, minHeight: 44, justifyContent: "center",
              borderColor: item === filter ? c.accent : c.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12 }}>
            <Txt style={{ color: item === filter ? c.accent : c.muted, fontSize: 13, fontWeight: "600" }}>{item}</Txt>
          </Pressable>)}
        </View>
        <View style={{ gap: 8 }}>
          <Txt style={s.label}>Search</Txt>
          <TextInput accessibilityLabel="Search" value={query} onChangeText={setQuery} keyboardAppearance={scheme}
            placeholder="Notes, categories, or amounts" placeholderTextColor={c.faint} style={s.field} />
        </View>
        {!!category && <Txt style={s.caption}>Showing {category}. Tap the category again to clear it.</Txt>}
        <Entries items={sorted}
          emptyTitle={narrowed ? "Nothing matches" : "No transactions this month"}
          emptyText={narrowed ? "Try another filter or clear the search." : "Log a transaction or import a few rows."}
          add={narrowed ? undefined : add} edit={edit} showDate />
      </View>
    </View>
  </>;
}
