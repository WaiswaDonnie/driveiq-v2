# DriveIQ — Client Feedback Response & Demo Recording Guide

For each point the client raised: **status**, **what to tell them**, and **where it is / how to film it**.

**Legend**
- ✅ Done — works in the app now, ready to film
- 🟡 Done — needs the client's visual approval (that's the point of the clip)
- ⚙️ Built — but needs a proper device build to actually function (see "Build notes" at the end)
- 📋 Planned — agreed, scheduled for later

Recording tip: film on a real device or an iOS **dev/standalone build** (not Expo Go — Expo Go falls back to Apple Maps; the Google map only shows in a real build).

---

## 1. Flickering events ✅
**Tell client:** Fixed. The pins were re-drawing themselves repeatedly; they now draw once and stay frozen, so no flicker when you pan or zoom.
**Film:** Open the app on the map. Pan around and pinch-zoom in/out over the cluster of London pins. Show they stay rock-steady. (Good to put side-by-side with the old recording.)

## 2. Enlarge animation on tap ✅
**Tell client:** Done. Tapping a pin now springs it up ~1.3× and it eases back to normal when you tap away or close — the "pop" you described.
**Film:** Tap a single pin → watch it grow as the detail card opens. Close the card → watch it shrink back. Repeat on one or two pins slowly so it reads on camera.

## 3. Colour coding as an outline (instead of the dot) 🟡 — needs his approval
**Tell client:** Built it the way you suggested — the loose dot is gone and the category colour is now the **ring/outline** around the pin. This clip is for you to confirm you like it before we lock it in.
**Film:** Show the map with several pins so the different coloured rings are visible (blue sports, purple music, pink theatre, etc.). Tap one to show the matching colour on the detail card. Mention: "this is the outline version you asked to see — let me know if you want the ring thicker/thinner."

## 4. Top "DriveIQ" + logo, and logo in the menu ✅
**Tell client:** Done — the logo now sits next to "DriveIQ" at the top, and the same logo + branding shows in the menu header.
**Film:** Point camera at the top-left pill (menu icon + logo badge + "DriveIQ"). Tap it to open the side menu → show the logo badge + "DriveIQ" in the menu header.

## 5. "DriveIQ AI Support" button 🟡 — built, wants your thoughts
**Tell client:** Added exactly where you asked — a **"DriveIQ AI Support"** row directly under "Send feedback". It opens a chat that answers "how do I…" questions about the app. It's a working first version; we can connect it to a smarter AI backend once onboarding + testing are done.
**Film:** Open menu → scroll to the **Support** section → tap **DriveIQ AI Support** → type something like "how do I save an event?" → show it answer. Also tap one of the suggested-question chips.

## 6. Full onboarding ✅ (first pass) / 📋 (full version later)
**Tell client:** Built a first-launch walkthrough — 6 cards covering the map, pins, colour key, saving, transport buttons and reporting. As you said, the full polished version comes after design is locked and testing's done.
**Film:** This only shows on a **fresh install**. Delete the app and reinstall (or clear app data), launch it, and the tour appears → tap **Next** through all 6 cards → ends on "Let's go".

## 7. Add / Report feature (brought back) 🟡 — built, wants to work through it together
**Tell client:** It's back and rebuilt around the map. Tap the **➕ button** (right-hand button stack, just under the crosshair), line the map up over the spot, pick what's happening (hazard, accident, roadworks, closure, police, event), add a note, submit — it drops a coloured pin and clears itself after a while. You wanted to shape this together, so treat this clip as a starting point.
**Film:** Tap the **➕** button → choose e.g. **Hazard** → type a short note → **Submit report** → show the new coloured pin on the map → tap that pin → show the details popup with the **Remove** option.

## 8. Big events missing from the API (Epsom / Ascot) ✅
**Tell client:** Solved with a curated "featured events" layer that sits alongside the live data. **Royal Ascot is on the map this week** (it runs today through Saturday), shown as a gold pin with a ⭐ so it stands out. Wimbledon's on there too. Any big event the APIs miss, we can add the same way.
**Film:** With the date filter on **Today**, zoom/pan west of London to **Ascot** → tap the gold ⭐ pin → show "Royal Ascot 2026" details. Switch the filter to **All** to also show the Wimbledon featured pin. Call out the gold ring + star = featured.

## 9. Help/FAQ, Send feedback, About, Chat copy & layout ✅
**Tell client:** All four are built as real screens with written copy: **Help & FAQs** (9-question accordion), **Send feedback** (composer that emails support), **About DriveIQ**, and **DriveIQ AI Support**. Happy to tweak any wording.
**Film:** Open menu → Support section → open each one in turn: **Help & FAQs** (expand a couple of questions), **Send feedback** (show the form), **About DriveIQ**, **DriveIQ AI Support**.

## 10. Do notifications actually work? ⚙️ — honest status
**Tell client:** The logic is fully built — it watches road incidents, train/tube line closures, and now schedules saved-event reminders. BUT it only actually fires once we make a proper build that includes the notifications module (it does nothing in Expo Go). So: ready, not yet verified live on a device. That's the next testing step.
**Film:** Best to **not** film this as "working" yet — instead show **Menu → Notifications** (the settings/toggles screen) and explain delivery gets verified on the next device build. Don't claim it's firing until we've tested it.

## 11. Event saving + add to calendar ⚙️/✅
**Tell client:** Done. Open any event and you get **Save** (reminds you an hour before it starts) and **Calendar** (adds it to your phone calendar with start + end time and a reminder). The buttons work now; the actual reminder firing + calendar write need the device build (same as point 10).
**Film:** Tap a pin → on the detail card show the **Save** button (tap it → it changes to "Saved") and the **Calendar** button (tap → confirmation popup). Mention the 1-hour reminder + start/end time.

---

## Build notes (so the clips are accurate)
- **Works in any build (film freely):** points 1, 2, 3, 4, 5, 6, 7, 8, 9, and the Save/Calendar *buttons* in 11.
- **Needs a device build with native modules to actually fire:** notifications (10) and the reminder/calendar *actions* (11). To enable: `bunx expo install expo-calendar`, make sure `expo-notifications` is installed, reinstall pods, then build.
- **Onboarding (6)** only appears on a fresh install — delete & reinstall to film it.
- Record on a real device / dev build for the Google map (Expo Go on iOS shows Apple Maps instead).

## Suggested recording order (one smooth run)
1. Fresh launch → onboarding tour (6)
2. Map overview → flicker-free pan/zoom (1) + coloured-ring pins (3)
3. Tap a pin → pop animation (2) → Save + Calendar buttons (11)
4. Today filter → Ascot gold ⭐ pin (8)
5. ➕ → make a report (7)
6. Top pill / menu branding (4)
7. Menu → Support → Help & FAQs, Send feedback, About, DriveIQ AI Support (5, 9)
8. Menu → Notifications screen, explain status (10)
