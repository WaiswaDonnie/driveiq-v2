# DriveIQ — Test Checklist (latest changes)

Run on a real device or dev build. To pick up the new code and the AeroDataBox key, start clean:

```
npx expo start -c
```

Then open in Expo Go (scan the QR). For the Google map + live-traffic colours you need a dev build (`npx expo run:ios`), but everything below works in Expo Go.

Tip: keep the Expo terminal visible — several checks are confirmed by the log lines it prints.

---

## 1. Loading screen
- On launch you should see the blue DriveIQ screen: logo drops in, soft pulse, "DriveIQ" + tagline, three dots, then it fades to the map.

## 2. Never-miss venues (the big one)
- Lord's + the Kia Oval specifically: on a day with county/international cricket, both must show a pin (was broken 8 July — county fixtures were dropped when internationals filled the cricket feed; both the feed fix and the venue-loop fix address this).
- Terminal should print `[sportsdb v2] venue ids resolved for N/…` — N should be well above 0 (the venue-by-venue check now arms itself automatically).
- If any marquee venue has nothing for 7 days, the terminal prints `⚠️ MARQUEE VENUES WITH NO EVENTS…` — treat that warning as a bug to investigate, not noise.
- Watch the terminal right after launch for:
  - `[ticketmaster] general N raw … priority venues added M → T total usable`
  - `[ticketmaster] priority venue raw counts: Tottenham Hotspur Stadium=…, Wembley Stadium=…, The O2=…, Allianz Stadium=…, OVO Arena Wembley=…, Royal Albert Hall=…, Hyde Park=…, Alexandra Palace=…, ExCeL=…`
- On the map, pan to each big venue and confirm a pin is there:
  - Tottenham Hotspur Stadium (N17) — this is the one that was missing before.
  - Wembley, The O2 (Greenwich), Twickenham, OVO Arena Wembley, Royal Albert Hall, Hyde Park, Alexandra Palace, ExCeL.
- Tap a few pins to confirm the events are real and named correctly.

## 3. Event end-times (must be airtight)
- Tap a concert at The O2 or Wembley.
- Confirm the finish time reads roughly 22:30–23:00, NOT 19:00/20:00.
- A late-starting show should still show a sensible finish (~2.5h after start).

## 4. Filtering + Wimbledon
- The date chips should be: All, Today, Tomorrow, then individual days. "Next 3 Days" is gone.
- Tap each day from tomorrow through 12 July — Wimbledon should appear every day (All England Lawn Tennis Club, ~11:00–21:00).

## 5. Airport pins
- Pinch out so all five airports are visible (Heathrow west, City east, Gatwick south, Stansted NE, Luton N).
- Confirm every airport shows a navy plane pin with a gold star — including Stansted, Luton and City (these were blank before).
- Tap each pin and confirm its sheet opens.

## 5b. Congestion handling — bubbles zoomed out, exact pins zoomed in
- ZOOMED OUT (city view): only genuinely congested patches (10+ events within roughly a central-London-sized area) collapse into a blue count bubble showing the number of EVENTS there. Small groups (2–3 pins near each other) stay as individual pins even if they slightly overlap.
- KEEP ZOOMING OUT: the bubble's number must NOT grow — grouping is fixed geographically, so the central bubble stays (e.g.) "23" and Camden/Brixton/Wembley pins stay separate all the way out to country level. No giant "90" swallowing everything.
- Tap a bubble (or just zoom in) → it splits into individual pins at their exact locations.
- ZOOMED IN (neighbourhood view): no bubbles at all — every venue shows a normal pin.
- SAME VENUE, at any zoom: several events at one venue (e.g. the O2) show ONE pin; tap it → a "N events at this location" sheet lists them all (soonest first); tap a row → event details. A single-event venue opens details directly.
- Wimbledon / Ascot gold featured pins NEVER enter a bubble and always show individually; airports never cluster and sit on top of everything.
- Pins self-heal: if a pin ever renders blank, any pan/zoom should bring it back instantly.

## 5c. Live traffic flicker
- Turn Live traffic on and leave the map open ~15 minutes: incident pins must not all vanish and reappear (previously a failed poll wiped them for 5 min).
- Note: the coloured road-flow tiles briefly redrawing right after a zoom is Google Maps tile loading, same as Google Maps/Waze.

## 5d. Feedback / About / Help / AI Support pages
- Open each from the menu: the page header must sit BELOW the clock/status bar, not under it (previously cropped wrong).
- About must show the real app version (was stuck on 5.0.2).

## 6. Airport sheet — rail links + flights board
- In an airport sheet, check the Rail links section shows that airport's lines (e.g. Heathrow → Heathrow Express + Elizabeth line; Gatwick → Gatwick Express + Thameslink). Tap a link to open the detail sheet.
- Check the new flights board:
  - Departures/Arrivals toggle.
  - Each row: coloured left bar (green on-time, amber delayed, red cancelled), scheduled time with the estimated time beneath when delayed, and a status pill.
  - Only upcoming flights show (nothing from hours ago).
- Terminal should print `[aerodatabox] EGLL: N flights (… arr, … dep, … delayed, … cancelled)`. If a board is empty/error, check that line for the reason.

## 7. Report sheet (keyboard fix)
- Tap the ➕ tools button → Report something → tap the note field.
- Confirm the keyboard no longer covers the category buttons or Submit — the sheet lifts above the keyboard.

## 8. AI assistant — event questions
- Menu → DriveIQ AI Support.
- Try: "what's on tomorrow?" → a list with type/time/venue + Remind / Add to calendar buttons.
- Try: "what time does [event] start?" or "how long is Wimbledon?" → exact start/end times for the matching event, with the same buttons.
- Tap Remind / Add to calendar and confirm the chat acknowledges it.

---

## Not in this build (so don't test yet)
- Hamburger-menu interaction + button polish (mockups coming for sign-off).
- AI free-form/open-ended answers (needs the LLM proxy + key).
- Dropdown-overlay tidy (waiting on your screen recording).
- The route-line flourish on the loading screen (needs react-native-svg).
