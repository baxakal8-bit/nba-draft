# Scope — The draft game

Not a clone of 82-0. That was only the example of a basketball game worth
copying the *feeling* of, not the rules. What Bulut wanted from it was one
thing: a hard target you keep retrying, where every run is different.

**Who it's for:** Bulut. Maybe friends later.

**Done means:** I play five rounds, pick five players under a budget, and get
a final score I want to beat.

## The rules

- Five rounds, one pick each.
- Each round deals a deck of five random player-seasons.
- The deck only holds players whose position is still open, so no run can dead
  end with a slot nobody can fill.
- All five positions must be filled: PG, SG, SF, PF, C. You are never allowed
  to buy a man if what is left would not cover the cheapest available player
  at every slot still open, so no run can end short.
- Spend too much and the deck does not close, it drops. The floor falls to a
  score of 2 and ten games, and only cards you can still reach are dealt. The
  lineup fills; it fills with bench players.
- Price and value are different numbers, and only the price is shown.
  Price comes from points per game, because scoring is what a player is
  famous for. Value is his Score, which counts everything else too.
- Budget: 100. The average player costs 20, so five of them is the budget.
- Final score: the total Score of the five.

The gap between price and value is the whole game. Wilt 1967 costs 27.8 and
pays 60.7; Jerry Stackhouse 2001 costs 34.4 and pays 19.1. You are shown the
price and the stat line, never the value, so every pick is a judgement rather
than a subtraction.

## NOW

- [ ] `game.html` on the same server, reusing `score.js` and the data files
- [ ] Deal a deck, show name, season, team, position, price
- [ ] Pick one, fill the slot, take the money
- [ ] Five rounds, then a final score
- [ ] Play again

## LATER (not in v1)

- Keep the best score across runs
- Skips, the way 82-0 gives you one team skip and one era skip
- Deck filters by a minimum in points, rebounds or assists, so no scrubs
- Simulate a season record out of the lineup
- Share a run with a friend
- Make it look good

## What the first playtest found

Built first with price = Score, then played 800 times by two robot strategies
before Bulut ever touched it. It was flat, exactly as feared: the score came
out equal to the money spent, the ceiling was the budget itself, and no
strategy beat any other.

Splitting price from value fixed it. Four strategies, 400 runs each:

| Strategy            | Average | Best  |
|---------------------|---------|-------|
| Hunt for bargains   | 107.9   | 155.3 |
| Random              | 96.2    | 130.7 |
| Always the priciest | 92.0    | 132.3 |
| Always the cheapest | 89.8    | 117.3 |

Skill now beats random by 12 points and the ceiling is gone.

## The second playtest — the empty slot

The rule that all five positions must be filled turned out to be a sentence in
this file and nothing else. "Always the priciest" finished 97% of its runs a
man short and was not punished for it.

Two tries. Dropping the floor so a bargain bin appears when the money runs low
barely moved anything — the strategy ends with $0-2M left and the cheapest man
in the league cost $3M, so there was nothing to buy at any floor. What worked
was the reserve: you cannot spend money the open slots still need. Combined
with a bin that goes down to ten games, where a bench player costs $1M, every
run now finishes with five.

| Strategy            | Average | Best  | Full lineup |
|---------------------|---------|-------|-------------|
| Hunt for bargains   | 121.0   | 184.9 | 100%        |
| Always the priciest | 108.4   | 143.9 | 100%        |
| Random              |  86.5   | 126.0 | 100%        |
| Always the cheapest |  61.7   |  88.0 | 100%        |

The ceiling went up, not down: three stars and two scrubs is now a legal
lineup, and a good one.

## Still wrong

- The biggest bargains are all 1960s centres — rebounds were plentiful then,
  so their Score inflates. The game may collapse into "always take the old
  centre" once a player notices.
