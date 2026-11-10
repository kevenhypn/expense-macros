import { useState } from "react";
import { Pressable, View } from "react-native";
import {
  ArrowDownRight, ArrowRight, CalendarDays, ChartNoAxesColumnIncreasing, ChevronLeft, ChevronRight,
  CircleDollarSign, List, Plus, Wallet,
} from "lucide-react-native";
import type { Transaction } from "../types";
import { budgetFor, dateLabel, isoDate, money, moveDay, moveMonth, weekDates } from "../lib/budget";
import { Action, Arc, Badge, Contours, IconButton, Txt, useTheme } from "./ui";

type Budget = ReturnType<typeof budgetFor>;
const dayName = (date: string) => dateLabel(date, { weekday: "short", month: "short", day: "numeric" });
const monthName = (date: string) => dateLabel(date, { month: "long", year: "numeric" });
const percent = (used: number, target: number) => target > 0 ? Math.max(0, Math.round(used / target * 100)) : null;
const nearingLimit = (used: number, target: number) => target > 0 && used > target * 0.8;

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
  return <View style={[s.panel, { paddingHorizontal: 10, paddingBottom: 9 }]}>
    <View style={[s.between, { minHeight: 49 }]}>
      <IconButton label="Previous week" onPress={() => onDate(moveDay(date, -7))}><ChevronLeft size={18} color={c.muted} /></IconButton>
      <View style={[s.row, { gap: 6 }]}><CalendarDays size={14} color={c.accent} /><Txt style={s.label}>{label}</Txt></View>
      <IconButton label="Next week" onPress={() => onDate(moveDay(date, 7))} disabled={moveDay(last, 1) > today}><ChevronRight size={18} color={c.muted} /></IconButton>
    </View>
    <View style={{ flexDirection: "row", gap: 3 }}>
      {week.map(day => {
        const selected = day === date;
        const logged = entries.some(tx => tx.date === day && !tx.isSystem);
        return <Pressable key={day} onPress={() => onDate(day)} disabled={day > today} accessibilityRole="button"
          accessibilityState={{ selected, disabled: day > today }} accessibilityLabel={dayName(day)}
          style={({ pressed }) => ({ flex: 1, minHeight: 61, gap: 3, justifyContent: "center", alignItems: "center", borderRadius: 13,
            backgroundColor: selected ? c.primary : day === today ? c.soft : "transparent", opacity: day > today ? 0.48 : pressed ? 0.7 : 1 })}>
          <Txt style={{ color: selected ? c.onPrimary : c.muted, fontSize: 10, fontWeight: "700" }}>{dateLabel(day, { weekday: "short" })}</Txt>
          <Txt style={{ color: selected ? c.onPrimary : c.ink, fontSize: 16, fontWeight: "800" }}>{Number(day.slice(-2))}</Txt>
          <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: logged ? selected ? c.heroGreen : c.accent : "transparent" }} />
        </Pressable>;
      })}
    </View>
  </View>;
}

export function Allowance({ left, spent, limit, rollover, compact, isToday = true }: {
  left: number; spent: number; limit: number; rollover: boolean; compact: boolean; isToday?: boolean;
}) {
  const { c, s } = useTheme();
  const over = left < 0;
  const progressColor = over ? c.heroError : nearingLimit(spent, limit) ? c.heroWarning : c.heroGreen;
  const balanceColor = over ? c.heroError : left > 0 ? c.heroGreen : c.onHero;
  return <View style={{ backgroundColor: c.hero, borderRadius: 26, overflow: "hidden", padding: compact ? 20 : 26, gap: 17 }}>
    <Contours />
    <View style={s.between}>
      <View style={[s.row, { gap: 8 }]}><Wallet size={15} color={c.heroGreen} /><Txt style={[s.eyebrow, { color: c.heroMuted }]}>DAILY ALLOWANCE</Txt></View>
      <View style={{ backgroundColor: c.heroPill, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 20 }}>
        <Txt style={{ color: c.onHero, fontSize: 10, fontWeight: "700" }}>{rollover ? "Adaptive pace" : "Fixed pace"}</Txt>
      </View>
    </View>
    <View style={[s.between, { gap: 4 }]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt style={{ color: c.heroMuted, fontSize: 13, fontWeight: "600" }}>{over ? "Over allowance" : isToday ? "Left to spend today" : "Left to spend that day"}</Txt>
        <Txt lines={1} style={[s.number, { color: balanceColor, fontSize: Math.abs(left) >= 1000 ? (compact ? 30 : 38) : (compact ? 43 : 54), letterSpacing: -2.5, marginTop: 1 }]}>{money(Math.abs(left))}</Txt>
      </View>
      <Arc percent={percent(spent, limit)} color={progressColor} size={compact ? 99 : 122} />
    </View>
    <View style={{ height: 1, backgroundColor: c.heroLine }} />
    <View style={[s.row, { gap: 18 }]}>
      <View style={{ flex: 1, gap: 3 }}><Txt style={{ color: c.heroMuted, fontSize: 11 }}>{spent < 0 ? "Net refunded" : "Net spent"}</Txt>
        <Txt style={[s.number, { color: c.onHero, fontSize: 17 }]}>{money(Math.abs(spent))}</Txt></View>
      <View style={{ width: 1, alignSelf: "stretch", backgroundColor: c.heroLine }} />
      <View style={{ flex: 1, gap: 3 }}><Txt style={{ color: c.heroMuted, fontSize: 11 }}>Daily target</Txt>
        <Txt style={[s.number, { color: c.onHero, fontSize: 17 }]}>{money(limit)}</Txt></View>
    </View>
  </View>;
}

export function MonthCard({ data, date, onPress }: { data: Budget; date: string; onPress?: () => void }) {
  const { c, s } = useTheme();
  const used = percent(data.monthSpent, data.monthBudget);
  const over = data.monthLeft < 0;
  const progressColor = over ? c.error : nearingLimit(data.monthSpent, data.monthBudget) ? c.warning : c.green;
  const balanceColor = over ? c.error : data.monthLeft > 0 ? c.green : c.ink;
  const bar = Math.min(100, used ?? (over ? 100 : 0));
  const content = <>
    <View style={[s.between, { gap: 8 }]}>
      <View style={[s.row, { gap: 10 }]}>
        <View style={{ backgroundColor: c.soft, borderRadius: 11, width: 35, height: 35, justifyContent: "center", alignItems: "center" }}><ChartNoAxesColumnIncreasing color={c.accent} size={18} /></View>
        <View style={{ gap: 1 }}><Txt style={s.label}>{dateLabel(date, { month: "long" })} budget</Txt><Txt style={{ color: c.muted, fontSize: 11 }}>Flexible spending</Txt></View>
      </View>
      {onPress && <ArrowRight size={17} color={c.accent} />}
    </View>
    <View style={[s.between, { alignItems: "flex-end", gap: 8 }]}>
      <View style={{ flexShrink: 1 }}>
        <Txt style={[s.number, { fontSize: 25, letterSpacing: -0.7, color: balanceColor }]}>{money(Math.abs(data.monthLeft))}</Txt>
        <Txt style={{ color: c.muted, fontSize: 11, marginTop: 2 }}>{over ? "over budget" : "remaining this month"}</Txt>
      </View>
      <Txt style={{ color: c.muted, fontSize: 11 }}>{used === null ? "No allowance" : `${used}% used`}</Txt>
    </View>
    <View style={{ height: 7, backgroundColor: c.track, borderRadius: 8, overflow: "hidden" }}>
      <View style={{ height: 7, width: `${bar}%`, backgroundColor: progressColor, borderRadius: 8 }} />
    </View>
    <View style={s.between}><Txt style={{ color: c.muted, fontSize: 11 }}>Net spent {money(data.monthSpent)}</Txt><Txt style={{ color: c.muted, fontSize: 11 }}>Budget {money(data.monthBudget)}</Txt></View>
  </>;
  const style = [s.panel, { padding: 17, gap: 13 }];
  return onPress ? <Pressable accessibilityRole="button" accessibilityLabel="Open monthly activity" onPress={onPress} style={({ pressed }) => [style, { opacity: pressed ? 0.74 : 1 }]}>{content}</Pressable>
    : <View style={style}>{content}</View>;
}

export function Entries({ items, emptyTitle, emptyText, add, edit, showDate = false }: {
  items: Transaction[]; emptyTitle: string; emptyText: string; add?: () => void; edit: (tx: Transaction) => void; showDate?: boolean;
}) {
  const { c, s } = useTheme();
  if (!items.length) return <View style={[s.panel, { padding: 21, alignItems: "center", gap: 7 }]}>
    <View style={{ padding: 10, borderRadius: 13, backgroundColor: c.soft }}><List size={20} color={c.accent} /></View>
    <Txt style={s.label}>{emptyTitle}</Txt><Txt style={[s.muted, { textAlign: "center" }]}>{emptyText}</Txt>
    {add && <Action tone="soft" onPress={add} style={{ marginTop: 4 }}>Log a transaction</Action>}
  </View>;
  return <View style={[s.panel, { paddingHorizontal: 13 }]}>
    {items.map((tx, i) => <Pressable key={tx.id} onPress={() => edit(tx)} accessibilityRole="button"
      accessibilityLabel={`Edit ${tx.note || tx.category}, ${money(tx.amount)}`}
      style={({ pressed }) => [s.row, { gap: 10, minHeight: 65, paddingVertical: 8, opacity: pressed ? 0.63 : 1,
        borderBottomWidth: i === items.length - 1 ? 0 : 1, borderBottomColor: c.border }]}>
      <Badge category={tx.category} />
      <View style={{ flex: 1, gap: 3 }}>
        <Txt lines={1} style={s.label}>{tx.note?.trim() || (tx.category === "Income" ? "Extra income" : tx.category)}</Txt>
        <Txt lines={1} style={{ color: c.muted, fontSize: 11 }}>
          {tx.category}{tx.amount > 0 && tx.category !== "Income" ? " · Refund" : ""}{showDate ? ` · ${dayName(tx.date)}` : ""}{tx.pending ? " · Pending" : ""}
        </Txt>
        {!!tx.account && <Txt lines={1} style={{ color: c.muted, fontSize: 11 }}>{tx.account}</Txt>}
      </View>
      <Txt style={[s.number, { color: tx.amount > 0 ? c.green : c.ink, fontSize: 14 }]}>{tx.amount > 0 ? "+" : "−"}{money(Math.abs(tx.amount))}</Txt>
      <ChevronRight size={15} color={c.faint} />
    </Pressable>)}
  </View>;
}

function Breakdown({ data }: { data: Budget }) {
  const { c, s, cat } = useTheme();
  const categories = data.categories.filter(row => row.amount !== 0).sort((a, b) => b.amount - a.amount);
  const total = categories.reduce((sum, row) => sum + Math.max(0, row.amount), 0);
  return <View style={[s.panel, { padding: 17, gap: 15 }]}>
    <View style={[s.row, { gap: 8 }]}><ArrowDownRight color={c.accent} size={19} /><Txt style={s.label}>Where it went</Txt></View>
    {categories.length === 0 ? <Txt style={s.muted}>Category totals appear when you log spending.</Txt> : <>
      {total > 0 && <View style={{ flexDirection: "row", gap: 3, borderRadius: 8, overflow: "hidden", height: 9 }}>
        {categories.filter(row => row.amount > 0).map(row => <View key={row.category} style={{ flex: row.amount / total, backgroundColor: cat[row.category].bar }} />)}
      </View>}
      {categories.map(row => <View key={row.category} style={[s.between, { gap: 8 }]}>
        <View style={[s.row, { gap: 8 }]}><Badge category={row.category} size={30} /><Txt style={s.label}>{row.category}</Txt></View>
        <Txt style={[s.number, { color: row.amount < 0 ? c.green : c.ink }]}>{row.amount < 0 ? "+" : ""}{money(Math.abs(row.amount))}</Txt>
      </View>)}
    </>}
  </View>;
}

export function Today({ data, transactions, date, today, compact, wide, rollover, onDate, add, edit, activity }: {
  data: Budget; transactions: Transaction[]; date: string; today: string; compact: boolean; wide: boolean; rollover: boolean;
  onDate: (date: string) => void; add: () => void; edit: (tx: Transaction) => void; activity: () => void;
}) {
  const { c, s } = useTheme();
  const isToday = date === today;
  return <>
    <View style={[s.between, { gap: 10 }]}>
      <View style={{ flexShrink: 1, gap: 4 }}>
        <Txt style={s.eyebrow}>{dateLabel(date, { weekday: "long", month: "long", day: "numeric" }).toUpperCase()}</Txt>
        <Txt style={{ fontSize: compact ? 34 : 41, letterSpacing: -1.7, fontWeight: "800" }}>{isToday ? "Today" : dateLabel(date, { month: "long", day: "numeric" })}</Txt>
      </View>
      {!isToday && <Action tone="soft" onPress={() => onDate(today)}>Back to today</Action>}
    </View>
    <DateStrip date={date} today={today} entries={transactions} onDate={value => onDate(value > today ? today : value)} />
    <View style={{ flexDirection: wide ? "row" : "column", gap: 13 }}>
      <View style={{ flex: wide ? 1.45 : undefined, minWidth: 0 }}>
        <Allowance left={data.dayLeft} spent={data.daySpent} limit={data.daily} rollover={rollover} compact={compact} isToday={isToday} />
      </View>
      {wide && <View style={{ flex: 1, minWidth: 0, justifyContent: "center" }}><MonthCard data={data} date={date} onPress={activity} /></View>}
    </View>
    <View style={{ gap: 7 }}>
      <View style={s.between}>
        <Txt style={s.title}>{isToday ? "Today’s log" : "Daily log"}</Txt>
        <IconButton label="Add transaction for selected day" onPress={add} style={{ backgroundColor: c.soft }}><Plus size={20} color={c.accent} /></IconButton>
      </View>
      <Entries items={data.entries.filter(tx => tx.date === date)} emptyTitle="Nothing logged yet" emptyText="Log a purchase, refund, or extra income to start." add={add} edit={edit} />
    </View>
    {!wide && <MonthCard data={data} date={date} onPress={activity} />}
  </>;
}

const filters = ["All", "Expenses", "Refunds", "Income", "Pending"] as const;
export function Activity({ data, date, wide, onDate, edit, add, openImport }: {
  data: Budget; date: string; wide: boolean; onDate: (value: string) => void; edit: (tx: Transaction) => void; add: () => void; openImport: () => void;
}) {
  const { c, s } = useTheme();
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const sorted = data.entries.filter(tx => {
    if (filter === "All") return true;
    if (filter === "Pending") return !!tx.pending;
    if (tx.pending) return false;
    if (filter === "Income") return tx.category === "Income";
    if (filter === "Refunds") return tx.category !== "Income" && tx.amount > 0;
    return tx.amount < 0;
  })
    .sort((a, b) => b.date.localeCompare(a.date));
  return <>
    <View style={{ gap: 4 }}><Txt style={s.eyebrow}>THE BIG PICTURE</Txt><Txt style={{ fontSize: 36, fontWeight: "800", letterSpacing: -1.5 }}>Activity</Txt>
      <Txt style={s.muted}>See where your money went this month.</Txt></View>
    <View style={[s.panel, s.between, { paddingHorizontal: 9 }]}>
      <IconButton label="Previous month" onPress={() => onDate(moveMonth(date, -1))}><ChevronLeft size={19} color={c.muted} /></IconButton>
      <Txt style={s.label}>{monthName(date)}</Txt>
      <IconButton label="Next month" onPress={() => onDate(moveMonth(date, 1))} disabled={date.slice(0, 7) >= isoDate().slice(0, 7)}><ChevronRight size={19} color={c.muted} /></IconButton>
    </View>
    <View style={{ flexDirection: wide ? "row" : "column", gap: 13, alignItems: wide ? "flex-start" : "stretch" }}>
      <View style={{ flex: wide ? 1 : undefined, gap: 13, minWidth: 0 }}>
        <MonthCard data={data} date={date} />
        <Breakdown data={data} />
      </View>
      <View style={{ flex: wide ? 1.45 : undefined, minWidth: 0, gap: 10 }}>
        <View style={s.between}>
          <Txt style={s.title}>Transactions</Txt>
          <View style={[s.row, { gap: 6 }]}>
            <Action onPress={openImport} tone="soft">Import</Action>
            <IconButton label="Add transaction for selected month" onPress={add} style={{ backgroundColor: c.soft }}><Plus size={20} color={c.accent} /></IconButton>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 5, flexWrap: "wrap" }}>
          {filters.map(item => <Pressable accessibilityRole="button" accessibilityState={{ selected: item === filter }} key={item}
            onPress={() => setFilter(item)} style={{ backgroundColor: item === filter ? c.soft : c.surface, minHeight: 44, justifyContent: "center",
              borderColor: item === filter ? c.soft : c.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 10 }}>
            <Txt style={{ color: item === filter ? c.accent : c.muted, fontSize: 12, fontWeight: "700" }}>{item}</Txt>
          </Pressable>)}
        </View>
        <Entries items={sorted} emptyTitle={filter === "All" ? "No transactions this month" : `No ${filter.toLowerCase()} this month`}
          emptyText={filter === "All" ? "Add an entry to start your monthly log." : "Switch filters to see your other entries."}
          add={filter === "All" ? add : undefined} edit={edit} showDate />
      </View>
    </View>
  </>;
}
