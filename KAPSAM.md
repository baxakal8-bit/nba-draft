# Scope — NBA Player Comparison

**Who it's for:** Bulut (me), first. Maybe friends later.

**Done means:** I pick two players, their per-game stats show up side by side.

## Decisions already made

- **Data source: a static dataset** (CSV/JSON from Basketball Reference exports),
  bundled with the project. Not a live API.
  - Free APIs put player stats behind a paywall (balldontlie: $9.99/mo).
  - `stats.nba.com` refuses browser requests — tested it, got
    `ERR_CONNECTION_RESET`. It needs headers a browser can't send.
  - Historical stats never change, so a live API is the wrong tool.
- **No caching layer needed.** The dataset loads once into memory.
- **Plain web page.** Not a Chrome extension.

## NOW

- [x] Find and download a stats dataset that covers old seasons
      → `data/player-per-game.csv`, 1947-2026, 33,340 rows
      → source: github.com/sumitrodatta/bball-reference-datasets
- [x] Load it in the browser and print the raw CSV to the console
- [x] Turn the CSV text into a usable list of players
- [x] Pick two players from a list
- [x] Show their per-game stats side by side
- [x] Invent a "who's better" score and explain how it works
      → Impact Score. Everything is measured in points of scoring margin,
        anchored on an average possession being worth 1.15 points.
        point 1.0 · assist 1.20 · oreb 1.68 · dreb 0.62 · steal 2.30 ·
        block 0.60 · turnover -2.30
      → Known hole: shooting percentages are ignored, so a high-volume,
        low-efficiency scorer reads too high. Tried two fixes (penalise
        missed shots, penalise attempts) -- each one broke something else,
        so v1 keeps the simple version and says so on the page.

## LATER (not in v1)

- The 82-0 game: wheel, 5 rounds, team/era draft, season simulation
- Persist things across reloads (`localStorage`)
- Compare more than two players at once
- Charts instead of a plain table
- Filter by season instead of career averages
- Make it look good
