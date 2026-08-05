# NBA comparator and draft game

Two pages built on one pile of Basketball Reference data, 1947 to 2026.

**Compare** (`index.html`) — put two player-seasons side by side and get a
single number for each. The number is called the Score.

**Draft** (`game.html`) — $100M, five rounds, five positions. You are shown
what a player costs and what he did on the floor, never what he is worth.
Guessing that is the game.

## The Score

Everything is measured in points of scoring margin, anchored on one fact: an
average NBA possession is worth about 1.15 points, so a possession changing
hands is worth 2.30 — 1.15 to one side and 1.15 to the other.

| | | why |
|---|---|---|
| points | × eFG% | a point counts for what it cost, so 30 on 20 shots beats 30 on 30 |
| assist | 1.20 | an assisted basket averages 2.35, but the possession was already worth 1.15 |
| off. rebound | 1.68 | 0.73 × 2.30 — the defence collects 73% of misses, so this is the outcome nobody expected |
| def. rebound | 0.62 | 0.27 × 2.30 — mostly it confirms what was already likely |
| steal | 2.30 | a full, certain change of possession |
| block | 0.60 | the arithmetic says 0.4, published models say 0.6 |
| turnover | −2.30 | a steal seen from the other side |

On top of the box score: MVP and DPOY vote share, All-NBA and All-Defensive
selections, and a quarter of the player's Win Shares.

`rating()` in `score.js` is deliberately kept free of award data. Once the
awards are inside a formula it can no longer be tested against them, and that
test is the only honest check there is: over 70 seasons the box-score half puts
the real MVP first 41% of the time and in its top five 84% of the time.

## The game

Price and value are different numbers and only the price is shown. Price comes
from points per game, because scoring is what a player is famous for. Value is
the Score, which counts everything else too. The gap between them is the game:
a quiet rebounder is cheap and pays well, a volume scorer on a bad shooting
year costs a fortune and pays little.

Rules that came out of playtesting rather than out of the plan:

- You cannot spend money the still-empty positions need, so no run ends a man
  short.
- Rebounds are divided by what a rebound was worth that season — 0.65 in 1960,
  1.00 today — or every bargain on the board is a 1960s centre.
- A man in his own position is worth two more than the same man borrowed for
  the box next door.
- Five lifelines, one use each, plus five looks at a single card's score.

The final score is read as a season: 121 is 51-31, 175 is 73-9, and above the
real record the ladder carries on to 82-0, which nobody has ever done.

## Running it

```
node tools/serve.js      # http://localhost:8000
```

A plain file:// page cannot fetch the CSVs, so a server is needed. Any static
server works; this one also caches headshots to `data/headshots/` while you
play, which is why that folder is not in the repo.

## Data

From [sumitrodatta/nba-data-historical](https://github.com/sumitrodatta/nba-data-historical),
scraped from Basketball Reference. Player photos are loaded from Basketball
Reference directly and are not redistributed here.

## Journal

`GUNLUK.md` is the working diary — what was built each session, what broke,
and what was not understood the first time. `KAPSAM.md` and `KAPSAM-OYUN.md`
are the scope files: what the thing is for, and what was deliberately left out.
