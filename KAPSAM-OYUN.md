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
- All five positions must be filled: PG, SG, SF, PF, C.
- A player costs what he is worth — his Score.
- Budget: 100.
- Run out of money and the lineup finishes short, scoring zero for the gaps.
- Final score: the total Score of the five.

The budget is the whole game. Jordan 1991 costs 45 of your 100, which leaves
55 for four more players. Spend early or hold out — that is the decision the
game is made of.

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

## Open question, deliberately left for the playtest

If a player costs exactly his Score, then spending the budget well is the same
as filling it up, and the game may turn out to be arithmetic rather than a
choice. Raised twice before building; Bulut chose to try it and see. If it
plays flat, the fix is to separate price from value — charge for fame (career
length, awards) and score for production, so the game becomes hunting for
players the price is wrong about.
