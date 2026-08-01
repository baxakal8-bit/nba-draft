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
      → Score. Everything is measured in points of scoring margin,
        anchored on an average possession being worth 1.15 points.
        assist 1.20 · oreb 1.68 · dreb 0.62 · steal 2.30 · block 0.60 ·
        turnover -2.30. Scoring is not a flat weight: points are multiplied
        by eFG%, so the same 30 points count for less when they took more
        shots. The file only has eFG% from 1980 on, but before the three
        point line eFG% and FG% are identical, so FG% fills the gap exactly
        and every era is measured with one ruler.
      → Efficiency hole: closed. Three earlier attempts each broke something
        (raw points let Westbrook outrank Jordan; penalising misses let
        efficiency run away; penalising attempts put Gobert level with
        Jordan). Weighting points by FG% fixed both, but punished three-point
        shooters, so it became eFG%. True Shooting was the other candidate;
        eFG% won because it separates Curry from Westbrook more cleanly, and
        because the gap it leaves before 1980 is fillable exactly.
      → Still open: shot creation. The box score cannot tell a player who
        makes his own shot from one who is set up for it.
- [x] Add award-vote bonuses on top of the box score
      → `data/player-award-shares.csv`. MVP voting 1956-2025 is worth up to 5
        points, DPOY 1983-2025 up to 3, each scaled by the share of the vote
        won. Both get their own row in the table so the bonus is never hidden.
      → DPOY is worth less than MVP on purpose: it judges one half of the
        game, and the box score already sees some defence through steals and
        blocks.
      → This finally gives defensive specialists somewhere to go. Gobert 2017
        was 21.6 and dead last among the players we kept testing; his 54% DPOY
        share takes him to 23.2. Giannis 2020 won both awards in one season
        and goes from 29.2 to 36.6, which moves him past Jordan 1991.
      → Seasons an award was not voted on show "—" and take no bonus. 2026 is
        still being played; DPOY did not exist before 1983. Neither is the
        same as getting zero votes.
      → IMPORTANT: `rating()` in main.js stays free of MVP data on purpose.
        The 70-season check below only means something asked of a formula that
        has never seen the answer. Anything tuned against MVP results must be
        tuned against `rating()`, never against the displayed total.

- [x] Search for better weights, then decide not to use them
      → `tools/tune.js` hill-climbs the six weights against MVP voting,
        tuning on half the seasons and testing on the other half.
        `tools/compare.js` puts several weight sets through three tests.
      → The search found weights that pick the MVP in 35 seasons instead of
        29. It got there partly by setting the block weight to zero, which
        costs nothing when your only target is "who won MVP" -- no defensive
        specialist ever wins it.
      → Bulut predicted this before it was measured: optimising the top of the
        list would scramble everyone below it. The DPOY ballot confirmed it,
        58.6% down to 56.6%.
      → Kept the possession-derived weights. They hold their own against two
        published formulas, and they can be explained.

- [x] Add Win Shares to the score
      → `data/player-advanced.csv`, Win Shares 1950-2026. A quarter of a
        player's season total is added, shown as its own row.
      → Bulut first wanted `ws / team wins`, on the reasoning that it measures
        how much of the team a player carried. The data killed it: the top of
        that list is the one good player on a terrible team (Brook Lopez on a
        12-win Nets team scores twice Jordan 1991), and Curry's 73-win season
        comes out lowest of every star we tested. He switched to plain `ws`
        after noticing that "won games for his team" is what `ws` already is.
      → Noted and accepted: Win Shares is a finished formula, not raw material.
        Points, rebounds and assists are already inside it with Basketball
        Reference's own weights, so those stats now count twice.
      → Like the award bonuses, this is added outside `rating()`. The tuning
        tools still see a clean box score formula.

- [x] Add All-NBA and All-Defensive teams
      → `data/end-of-season-teams.csv`. All-NBA 1950-2025, All-Defensive
        1969-2025. All-NBA 1st 3, 2nd 2.25, 3rd 1.75. All-Defensive 1st 2,
        2nd 1.
      → Bulut set the All-NBA numbers and squeezed the gap between 2nd and 3rd
        on purpose: missing the 2nd team is often one voter's opinion rather
        than a real drop in quality.
      → All-Rookie is in the same file and was left out. It rewards being new,
        not being good.
      → Reaches far more players than MVP does -- fifteen a season instead of
        one. Gobert 2017 goes 26.8 to 31.0 on an All-NBA 2nd and All-Defensive
        1st. Jordan 1991 passes Jokić 2022 for the first time, on the strength
        of an All-Defensive 1st team Jokić never made.
      → Seasons before an honour existed show "—", not a miss. Wilt 1962 could
        not have made an All-Defensive team; there wasn't one until 1969.

## How weight sets compare

|                     | MVP 1st | MVP ballot | DPOY ballot |
|---------------------|---------|------------|-------------|
| Bulut (possession)  | 29/70   | 72.8%      | 58.6%       |
| Tuned for MVP       | 35/70   | 73.7%      | 56.6%       |
| Game Score          | 30/70   | 74.0%      | 57.4%       |
| Win Score           | 27/70   | 72.0%      | 59.4%       |

Ballot columns: of every pair of players who got votes that season, how often
the formula agreed with the voters about which of the two was better.

Nothing wins everywhere. There is no best formula, only a formula that is best
at the thing you chose to measure.

## How well does the box score formula match MVP voting?

Measured over 70 seasons, using `rating()` alone (no MVP bonus), minimum 50
games played:

- its top-ranked player was the real MVP in 29 of 70 seasons (41%)
- the real MVP was in its top five in 59 of 70 seasons (84%)
- median rank of the real MVP in its ordering: 2nd

MVP voting also rewards team success, which a box score cannot see, so 100%
was never available.

## LATER (not in v1)

- Use more of the dataset. The file we downloaded is one of 22 in the same
  repo. Worth a look, roughly in this order:
  - `Player Play By Play.csv` → tried and rejected. Its
    `points_generated_by_assists` would replace the estimated 1.20 assist
    weight with real numbers, but the estimate was already good: 2.35 assumed
    against a real league average of 2.293. Swapping it moved almost every
    score by less than a point and barely changed the order, while the data
    only starts in 1997 -- so every player before that would keep the old
    estimate and the eras would be measured differently again. Not worth it.
    The file also has on-court plus/minus and turnover types, still unlooked at.
  - `Advanced.csv` → usage rate, defensive BPM and defensive win shares.
    A way into the two things the formula still cannot see: who creates a
    shot, and who defends.
  - `Player Award Shares.csv` → MVP voting. Not an input to the formula but a
    way to test it: does the Score ranking agree with how the season
    was actually judged?
  - `Player Shooting.csv` → shot distance, dunks, and `percent_assisted_x2p_fg`.
    Set aside for now: most baskets are assisted for most players, so it may
    say less than it looks like it does.
  - Check first whether any of these cover the old seasons. Probably not.

- The 82-0 game: wheel, 5 rounds, team/era draft, season simulation
- Persist things across reloads (`localStorage`)
- Compare more than two players at once
- Charts instead of a plain table
- Filter by season instead of career averages
- Make it look good
