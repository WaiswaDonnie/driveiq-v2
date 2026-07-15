# DriveIQ — Recording Guide (latest updates)

How to film a clean walkthrough for the client covering everything from the last round.

## Before you record
- Start clean so the new code + AeroDataBox key load: `npx expo start -c`.
- Record on a real device or a dev build. Expo Go is fine for everything except the Google map + live-traffic colours (those need `npx expo run:ios`).
- Use the phone's built-in screen recorder. Turn on Do Not Disturb so notifications don't pop in.
- Optional: keep the Expo terminal on screen for one shot, to prove the never-miss venue check (see step 2).

## Suggested order (one continuous take)

1. **App open / loading screen**
   Launch the app. Let the blue DriveIQ loading screen play (logo drop, pulse, wordmark) into the map.

2. **Never-miss venues (the big accuracy fix)**
   Say: "Big events at key venues can no longer be missed." Pan to Tottenham Hotspur Stadium and tap the event pin (this is the one that was missing before). Then pan to Wembley and The O2 and tap an event at each.
   Optional power move: cut to the Expo terminal and point to the line `priority venue raw counts: Tottenham…=…, Wembley…=…, The O2=…` to show it checking each venue every load.

3. **Correct finish times**
   Open a concert at The O2 or Wembley. Point out the finish time now reads about 10.30–11pm, not 7/8pm.

4. **Flicker fixed / pins stay put**
   Pan and pinch-zoom around the London cluster. Show the pins stay steady and don't flicker, and that events stay visible as you move (no more popping in only after zooming).

5. **Filtering + Wimbledon**
   Show the date row: All, Today, Tomorrow, then individual days ("Next 3 Days" is gone). Tap a few days up to 12 July and show Wimbledon appearing each day with the gold star, like Ascot.

6. **Airports + flights board**
   Pinch out so the airport pins show (they're on all five now, including Stansted/Luton/City). Tap Heathrow: show the rail links at the top (Heathrow Express, Elizabeth line) with live status, then the redesigned flights board — coloured status bars, scheduled time with the estimated time when delayed, and only upcoming flights. Toggle Departures/Arrivals. Mention the "Subscribe" is the Pro placeholder.

7. **Report sheet fix**
   Tap the tools button, then "Report something", then the note field. Show the keyboard no longer covers the buttons.

8. **Hamburger menu behaviour**
   Open the menu. Show you can pan/zoom the map with the menu open and it stays open; it only closes with the X.

9. **AI assistant**
   Menu → DriveIQ AI Support. Ask "what's on tomorrow?" — show the list plus the Remind / Add to calendar buttons. Ask "what time does [event] start?" for a named event. Show the X closes it cleanly (that exit bug is fixed).

## Say at the end (honest status)
- Live flight data depends on the AeroDataBox plan; the board and design are done.
- A couple of items are still in progress: the event-pin logo restyle (waiting on reference images), minor button polish, and the AI's fuller free-form answers.

## Don't film as "done" yet
- The event-pin logo redesign (not started — awaiting your examples).
- Any cricket-ground women's fixtures until confirmed in the feed.
