# DriveIQ — Recording Steps (Events + Design Update)

Steps to reproduce each new change for the client clip. **Film on a real device or an iOS dev/standalone build** — Expo Go falls back to Apple Maps, so the Google map and the live-traffic colored roads only show in a proper build.

These design items are **staged for the client's approval** — frame them as "here's the version you asked for, let me know."

---

## 1. Wider, more accurate events + future days

**Tell client:** Two fixes. The event list now pulls the full window instead of just the nearest ~100, so more is on the map and further-out dates show up. And you can now browse ahead day-by-day to save/calendar future events.

**Film:**
1. Open the app on the map.
2. Look at the filter row near the top. Tap **Today** → show today's pins. Tap **Tomorrow** → show it now returns events (the old empty-Tomorrow problem).
3. Scroll the filter row sideways → tap an individual future day chip (e.g. **"Sat 27"**, ~2 weeks of days are listed) → map reframes to that day's events. Point out the little count next to each chip.
4. Tap a pin on a future day → on the detail card show **Save** and **Calendar** → the point being you can line up future events in advance.

---

## 2. Floating buttons now collapse into one (de-cluttered map)

**Tell client:** The stack of buttons no longer crowds the map. Only Re-centre and a single tools button show; tapping it fans out the rest, and tapping away tucks them back.

**Film:**
1. On the map, point to the bottom-right: only two buttons now — **Re-centre** (crosshair) and the **tools** button (grid icon) above it.
2. Tap the **grid** button → the actions fan out upward, each with a label: **Report, Transit, Airports, Live traffic, Layers, Notifications**.
3. Tap one (e.g. **Layers**) → show it opens and the menu collapses.
4. Re-open the grid, then **tap anywhere off the menu** → show it collapses back to a single button.
5. (Optional) Turn **Live traffic** on, collapse the menu → point out the small red dot on the tools button showing something's still active.

---

## 3. Live traffic is back

**Tell client:** The live traffic view from the maps API is back, on the same Traffic toggle — it now shows the live colored road flow *and* the incident pins together.

**Film:**
1. Open the tools menu (grid button) → tap **Live traffic** (or Menu → can also reach it via **Layers → Traffic**).
2. Show the roads shade in live traffic colors (green/amber/red) across London — zoom into a busy area so it reads on camera.
3. Toggle it off → roads return to normal. (Reminder: this colored flow shows on the **Google map build**, not Expo Go.)

---

## 4. Bigger, centered sidebar logo

**Tell client:** The DriveIQ logo in the menu header is larger and centered, with the white box gone — it now sits on a soft-blue backing so the mark stands on its own.

**Film:**
1. Tap the **menu** (top-left pill) to open the sidebar.
2. Hold on the **header** → show the larger, centered logo + "DriveIQ" wordmark on the soft-blue backing (vs the old small white badge).

---

## Still to come (don't film yet)

- **Event pin logo (the colored outline around the logo, no white circle):** waiting on your reference examples before I build it — leave it out of this clip.

## Suggested order for one smooth run
1. Map overview → collapsible buttons (2)
2. Live traffic on/off (3)
3. Filter row: Today → Tomorrow → a future day → Save/Calendar on a future event (1)
4. Open menu → new header logo (4)
