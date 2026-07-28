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
- [ ] Turn the CSV text into a usable list of players
- [ ] Pick two players from a list
- [ ] Show their per-game stats side by side
- [ ] Invent a "who's better" score and explain how it works

## LATER (not in v1)

- The 82-0 game: wheel, 5 rounds, team/era draft, season simulation
- Persist things across reloads (`localStorage`)
- Compare more than two players at once
- Charts instead of a plain table
- Filter by season instead of career averages
- Make it look good
