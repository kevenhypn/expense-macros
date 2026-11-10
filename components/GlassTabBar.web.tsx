import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { GlassTabBarProps } from "./GlassTabBar";
import { useTheme } from "./ui";
import "./glassTabBar.css";

export function GlassTabBar<Name extends string>({ tabs, active, bottom, height, onSelect }: GlassTabBarProps<Name>) {
  const { c, scheme } = useTheme();
  const [dragPosition, setDragPosition] = useState<number | null>(null);
  const gesture = useRef<{ id: number; startX: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const selected = tabs.findIndex(tab => tab.name === active);
  const highlighted = dragPosition === null ? selected : Math.round(dragPosition);

  function positionAt(event: PointerEvent<HTMLDivElement>) {
    const { left, width } = event.currentTarget.getBoundingClientRect();
    const index = (event.clientX - left) / (width / tabs.length) - 0.5;
    return Math.max(0, Math.min(tabs.length - 1, index));
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    suppressClick.current = false;
    gesture.current = { id: event.pointerId, startX: event.clientX, moved: false };
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    if (!current.moved) {
      if (Math.abs(event.clientX - current.startX) < 8) return;
      current.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    setDragPosition(positionAt(event));
  }

  function endDrag(event: PointerEvent<HTMLDivElement>, cancelled = false) {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    gesture.current = null;
    setDragPosition(null);
    if (current.moved) {
      suppressClick.current = true;
      if (!cancelled) onSelect(tabs[Math.round(positionAt(event))].name);
    }
  }

  function navigateWithKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
    onSelect(tabs[next].name);
  }

  return <div className="glass-tab-dock" data-scheme={scheme} style={{ bottom, height }}>
    <div className="glass-tab-material" aria-hidden="true" />
    <div role="tablist" aria-label="Main navigation" className="glass-tab-track"
      data-dragging={dragPosition !== null}
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      onPointerDown={startDrag} onPointerMove={moveDrag}
      onPointerUp={event => endDrag(event)} onPointerCancel={event => endDrag(event, true)}
      onLostPointerCapture={event => endDrag(event, true)}>
      <div aria-hidden="true" className="glass-tab-lens"
        style={{ width: `${100 / tabs.length}%`, transform: `translateX(${(dragPosition ?? selected) * 100}%)` }} />
      {tabs.map(({ name, icon: Icon }, index) => <button key={name} type="button" role="tab"
        aria-selected={name === active} tabIndex={name === active ? 0 : -1}
        className="glass-tab-button" style={index === highlighted ? { color: c.accent } : undefined}
        onKeyDown={event => navigateWithKey(event, index)}
        onClick={event => {
          if (event.detail !== 0 && suppressClick.current) return;
          onSelect(name);
        }}>
        <span aria-hidden="true" className="glass-tab-icon"><Icon size={24} strokeWidth={index === highlighted ? 2.4 : 2.1} /></span>
        <span className="glass-tab-label">{name}</span>
      </button>)}
    </div>
  </div>;
}
