// The draft game.
//
// Five rounds, five picks, one budget. You are shown what a player costs and
// what he did on the floor, but never what he is worth -- that is the number
// being kept from you until the end, and guessing it is the game.

var POSITIONS = ["PG", "SG", "SF", "PF", "C"];
var BUDGET = 100;
var DECK_SIZE = 15;

// The pool the decks are dealt from.
//
// Dealt from absolutely everybody the median player-season scores 8.8, five
// picks would cost about 45, and the budget would never bind. A floor keeps
// the table worth choosing from.
//
// Where to put it is a trade. Lower means a wider table, and with fifteen
// cards a wider table rewards knowing what to look for. But it also means
// more cheap players, so the money stops running out. Ten keeps both: a
// budget that still bites, and 45% of every season ever played on the table.
//
// One floor per position, because one floor for everybody was not fair.
//
// At a flat 10 the pools came out PG 1970, SG 2883, SF 2795, PF 3105, C 3225
// -- a centre was two thirds more likely to be dealt than a point guard. Not
// because centres were better players, but because the Score counts rebounds
// and blocks, which is what tall men collect, so more of them clear any given
// bar. The deck was quietly a big man's game.
//
// Raising the bar for the two positions that were over-represented evens them
// out: 2755 power forwards and 2742 centres against 2795 small forwards.
var MIN_SCORE = { PG: 10, SG: 10, SF: 10, PF: 11, C: 11.5 };
var MIN_GAMES = 40;

// The second pool, dealt from only when the money is gone.
//
// Overspending early used to end the run: the deck came back and every card
// cost more than what was left, so the game stopped with empty slots and no
// punishment for leaving them empty. Now the floor drops instead. You still
// get to fill the position -- with whoever is left at that price, which is
// the punishment. A bench player is worth about 4, so three empty slots
// filled this way is around 12 points, not the 60 a real starter pays.
// The floor has to be genuinely low, not just lower. At forty games the
// cheapest man in the league still costs 3, so two empty slots reserve 6 and
// a 33 budget will not let you take a 28 point guard -- blocked over one
// million. Ten games lets a bench player through at 1, so the reserve almost
// never stands between you and a star. You can overspend now; you just pay
// for it with whoever is left.
var SCRAP_MIN_SCORE = 2;
var SCRAP_MIN_GAMES = 10;

// What you pay is not what you get. Price comes from points per game, because
// that is what a player is famous for -- highlight reels are made of scoring,
// not of boxing out. Value comes from the Score, which counts everything.
//
// So a quiet player who rebounds and defends is cheap and pays well, and a
// volume scorer on a bad night of shooting costs a fortune and pays little.
// Finding the difference is the game. If price equalled value, every pick
// would be worth exactly what it cost and there would be nothing to decide.
//
// Games played costs money too. A man who turned up 82 times did more than
// one who managed 45, and the Score barely notices because it is per game.
//
// The split is four fifths from scoring, one fifth from turning up. The two
// multipliers were first set so the average player cost exactly 20, which put
// five of them at the 100 budget: the pool averages 17.3 points and 73.2
// games, so 16 / 17.3 and 4 / 73.2.
//
// Then everything came down a tenth. Exactly five average players for exactly
// the budget was tidy but airless -- there was no room to take one man you
// really wanted and still fill the rest. At nine tenths the average five cost
// about 78 and the rest is yours to gamble with.
//
// A second tenth came off and went straight back on. It only moved one kind
// of player: somebody buying the best card every round gained twelve points,
// because two stars in a row became affordable. That is the whole game, so
// making it free ruined it. Half of that tenth went back on afterwards, which
// buys about four million across a lineup -- enough to reach one card you
// could not quite afford, not enough to reach two.
//
// Prices are whole numbers, rounded down rather than to the nearest. Nothing
// here is precise enough to earn a decimal place, and round numbers are
// easier to add up in your head while working out whether you can still
// afford a centre. Down rather than nearest takes about half a million off
// every man, which is two and a half across a lineup -- small, and always in
// your favour.
var PRICE_PER_POINT = 0.790;
var PRICE_PER_GAME = 0.0466;

// Who counts as famous.
//
// The Hall of Fame, mostly -- 177 players, and not my opinion. But you have
// to be retired for years before you are eligible, so every star playing
// today is missing from it. Without the second list, 1948 Buddy Jeannette
// would draw a premium and LeBron would not.
var ACTIVE_LEGENDS = [
  "LeBron James", "Stephen Curry", "Kevin Durant", "Giannis Antetokounmpo",
  "Nikola Jokić", "Luka Dončić", "Joel Embiid", "James Harden",
  "Russell Westbrook", "Kawhi Leonard", "Chris Paul", "Damian Lillard",
  "Anthony Davis",
];

var isLegend = {};

// What a famous name is worth on top of the season. Small: a legend already
// costs more, because price is built from scoring and scorers are who get
// famous. This is a thumb on the scale, not the scale.
//
// It only applies here. The comparison page reports what a season was worth,
// and no reputation is added to it.
var LEGEND_BONUS = 3;

function fame(row) {
  return isLegend[row.player] ? LEGEND_BONUS : 0;
}

// The career file is the first one with commas inside a field -- a player who
// went to two colleges has them quoted, like "College of Idaho, Seattle
// University". Splitting on every comma would shift every column after it.
function splitCsvLine(line) {
  var out = [];
  var current = "";
  var quoted = false;

  for (var i = 0; i < line.length; i++) {
    var ch = line[i];
    if (ch === '"') quoted = !quoted;
    else if (ch === "," && !quoted) {
      out.push(current);
      current = "";
    } else current += ch;
  }

  out.push(current);
  return out;
}

// Two things come out of the career file in one pass: who is famous, and what
// positions a man played across his whole career.
function buildCareerIndex(csv) {
  ACTIVE_LEGENDS.forEach(function (name) {
    isLegend[name] = true;
  });

  var lines = csv.trim().split("\n");
  var columns = splitCsvLine(lines[0]);

  for (var i = 1; i < lines.length; i++) {
    var row = rowToObject(splitCsvLine(lines[i]), columns);
    if (row.hof === "TRUE") isLegend[row.player] = true;
    careerPos[row.player_id] = row.pos;
  }
}

// Some men played two positions, and a card that only ever says one is lying
// about a third of the league.
//
// The season file cannot tell us: it carries exactly one of PG SG SF PF C per
// row. The career file can -- 1346 players are labelled with a pair, G-F or
// F-C and so on -- but only as guard, forward, centre, with no PG/SG split.
//
// So the season gives the exact position and the career gives the second
// group, and the second position is whichever slot in that group sits nearest
// on the PG-SG-SF-PF-C line. A G-F shooting guard comes out SG/SF; an F-C
// power forward comes out PF/C. The coarse label does produce the odd stretch
// -- 292 seasons come out SF/C -- which is the price of using the only column
// that knows anything about this at all.
var GROUP = { PG: "G", SG: "G", SF: "F", PF: "F", C: "C" };
var careerPos = {}; // player_id -> "G-F" and the like

// Playing where you belong is worth something.
//
// Out of position is not a punishment -- a SG/SF at small forward is worth
// exactly what the season was worth, no more and no less. The bonus goes the
// other way: a man standing in his own box earns a little extra. Five of them
// in the right places is ten points, which is a win or two.
var NATURAL_BONUS = 2;

// What a card is actually worth in the box it is sitting in. Roster entries
// know their own slot; a card still on the board has to be asked about the
// slot it would go to, which is not always the one it was dealt at.
function worth(entry, slot) {
  var where = slot || entry.pos;
  var bonus = where === entry.row.pos ? NATURAL_BONUS : 0;
  return Math.round((entry.score + bonus) * 10) / 10;
}

// The two boxes a card can fill: his own, and the borrowed one.
function otherSlot(card) {
  return card.pos === card.row.pos ? card.alt : card.pos;
}

function positionsFor(row) {
  var label = careerPos[row.player_id];
  if (!label || label === "NA" || label.indexOf("-") < 0) return [row.pos];

  var mine = GROUP[row.pos];
  var others = label.split("-").filter(function (group) {
    return group !== mine;
  });

  // Careers and seasons disagree sometimes -- a man filed as F-C who spent one
  // year at shooting guard. Taking the nearest of everything the career label
  // names, rather than one of them, keeps that from coming out as SG/C.
  if (!others.length) return [row.pos];

  var home = POSITIONS.indexOf(row.pos);
  var second = null;
  var nearest = POSITIONS.length;

  POSITIONS.forEach(function (position, index) {
    if (others.indexOf(GROUP[position]) < 0) return;
    var distance = Math.abs(index - home);
    if (distance < nearest) {
      nearest = distance;
      second = position;
    }
  });

  return second ? [row.pos, second] : [row.pos];
}

// Rebounds are not worth the same in every era.
//
// In 1960 a rotation player took 7.67 boards a game; today he takes 5.05.
// Nobody got worse at rebounding -- teams shot more and missed more, so there
// was simply more to collect. The Score counts rebounds, so it hands the old
// centres a fortune: Wilt 1967 pays 60.7 and costs $27M, and once you notice
// that the game becomes "always take the old centre" and stops being a game.
//
// So a rebound is measured against what a rebound was worth that season. The
// multiplier is the modern average divided by that season's average: 0.66 in
// 1960, 0.87 in 1975, 0.98 in 2020. No line drawn at a decade -- rebounds
// faded slowly, so the correction fades slowly too. And the numbers come out
// of the data, so a new season adjusts itself.
//
// The game only. The comparison page reports what a season was, not what it
// would have been somewhere else.
var REFERENCE_SEASONS = 10;
var ERA_MIN_MINUTES = 20; // a rotation player, not the man who played twice
var eraRebound = {}; // season -> multiplier

function buildEraIndex() {
  var totals = {}; // season -> { sum, count }

  Object.keys(playersByName).forEach(function (name) {
    playersByName[name].forEach(function (row) {
      var trb = number(row, "trb_per_game");
      if (trb === null) return;
      if ((number(row, "g") || 0) < MIN_GAMES) return;
      if ((number(row, "mp_per_game") || 0) < ERA_MIN_MINUTES) return;

      var bucket = totals[row.season] || (totals[row.season] = { sum: 0, count: 0 });
      bucket.sum += trb;
      bucket.count++;
    });
  });

  var seasons = Object.keys(totals).sort();
  var average = {};
  seasons.forEach(function (season) {
    average[season] = totals[season].sum / totals[season].count;
  });

  // Today is the ruler, so a modern season comes out at roughly 1 and the
  // scores you already know barely move.
  var recent = seasons.slice(-REFERENCE_SEASONS);
  var reference =
    recent.reduce(function (sum, season) {
      return sum + average[season];
    }, 0) / recent.length;

  seasons.forEach(function (season) {
    eraRebound[season] = reference / average[season];
  });
}

// What the era costs this player, in points of Score. Only his rebounding is
// touched; scoring, passing and defence are left alone.
function eraAdjust(row) {
  var factor = eraRebound[row.season];
  if (!factor) return 0;

  var orb = number(row, "orb_per_game");
  var drb = number(row, "drb_per_game");
  var boards;

  if (orb === null || drb === null) {
    // Before 1974 rebounds were not split, and the Score uses the blend.
    var trb = number(row, "trb_per_game");
    if (trb === null) return 0;
    boards = trb * TRB_WEIGHT;
  } else {
    boards = orb * WEIGHTS.orb_per_game + drb * WEIGHTS.drb_per_game;
  }

  return boards * (factor - 1);
}

var pool = {}; // { PG: [ {row, score, price}, ... ], ... }
var scrapPool = {}; // the same shape, built to a much lower floor
var cardFor = {}; // "player_id|season|position" -> the card, for reading a shared link
var seasonsByPlayer = {}; // player_id -> every card he has, any season, any slot
var floorPrice = {}; // the cheapest anybody can be had for, per position

var state = null;

// Hidden by default. Shown, every pick becomes "take the biggest number" and
// the guessing -- which is the game -- disappears. Left as a switch anyway,
// because it is a good way to learn what a season is actually worth.
//
// Flipping it reloads the page, so the choice has to outlive the reload. It
// is the only thing this game remembers between visits.
var showScores = localStorage.getItem("showScores") === "yes";

// The best run so far. Without it a good score is forgotten the moment you
// press play again, and there is nothing to aim at -- which was the whole
// reason for building this.
//
// Two records, not one. With the scores shown every pick is "take the biggest
// number", so a run in that mode is not the same game and cannot be compared
// to one played blind.
var bestKey = showScores ? "bestShown" : "bestHidden";
var best = parseFloat(localStorage.getItem(bestKey)) || 0;

// --- Setting up ------------------------------------------------------------

Promise.all([
  loadData(),
  fetch("data/player-career-info.csv").then(function (response) {
    return response.text();
  }),
])
  .then(function (files) {
    buildCareerIndex(files[1]);
    buildEraIndex();
    buildPool();
    document.getElementById("status").hidden = true;
    document.getElementById("game").hidden = false;

    // A link with a team in it opens that team instead of dealing a new one.
    // A broken or empty one just starts a game, which is the friendlier way
    // to fail.
    var shared = /^#team=(.+)$/.exec(location.hash);
    if (!shared || !showShared(shared[1])) startRun();
  })
  .catch(function (error) {
    document.getElementById("status").textContent = "Could not load data: " + error.message;
  });

function buildPool() {
  POSITIONS.forEach(function (position) {
    pool[position] = [];
    scrapPool[position] = [];
  });

  Object.keys(playersByName).forEach(function (name) {
    playersByName[name].forEach(function (row) {
      if (!pool[row.pos]) return; // no position recorded, or a combined team row

      var games = number(row, "g") || 0;
      if (games < SCRAP_MIN_GAMES) return;

      var base = Math.round((fullScore(row) + eraAdjust(row)) * 10) / 10;
      if (base < SCRAP_MIN_SCORE) return;

      // The game pays a little extra for a famous name. The comparison page
      // does not -- fullScore() is left exactly as it is.
      var score = Math.round((base + fame(row)) * 10) / 10;

      // Nobody is free. A one million floor keeps the reserve arithmetic
      // honest and stops a rounding-to-zero player from being a free slot.
      var price = Math.max(
        1,
        Math.floor(
          (number(row, "pts_per_game") || 0) * PRICE_PER_POINT +
            games * PRICE_PER_GAME
        )
      );
      // One card per position he can fill. They share a season but not a
      // slot, so each carries the position it is being offered at, and a
      // label that names that slot first: the same man reads SG/SF in a
      // shooting guard deck and SF/SG in a small forward one.
      var slots = positionsFor(row);

      slots.forEach(function (position, index) {
        var other = slots[index === 0 ? 1 : 0];
        var card = {
          row: row,
          score: score,
          price: price,
          pos: position,
          alt: other || null,
        };

        scrapPool[position].push(card);
        cardFor[row.player_id + "|" + row.season + "|" + position] = card;
        if (base >= MIN_SCORE[position] && games >= MIN_GAMES) pool[position].push(card);

        // Every card a man has, so the "other years" lifeline can find him
        // again in a season you have not been offered.
        var id = row.player_id;
        (seasonsByPlayer[id] || (seasonsByPlayer[id] = [])).push(card);
      });
    });
  });

  POSITIONS.forEach(function (position) {
    floorPrice[position] = scrapPool[position].reduce(function (low, card) {
      return Math.min(low, card.price);
    }, Infinity);
  });
}

// One use each, per run.
//
//   shuffle  a new board of fifteen, when nothing on this one tempts you
//   reveal   the scores on this board only -- the answer, once
//   double   two picks from the same board, at the cost of seeing one board
//            fewer for the rest of the run
//   years    the same fifteen men, each at a different season. For when you
//            know the names but do not like the years they turned up in
//   sell     give a drafted man back, take the money, open the slot again.
//            Two clicks, unlike the rest: it has to be told which man, and
//            selling by accident would be the worst misclick in the game
//
// They are a way out of a bad board, not a way to win: spend them all early
// and the last rounds are played with nothing left.
var LIFELINES = ["shuffle", "reveal", "double", "years", "sell"];

// Peeks are the sixth, and the only one you get more than once.
//
// The others change the board. This one changes what you know about it: five
// times a run you can turn over a single card and see what it is really
// worth. Five across five rounds is one a round if you spread them, or the
// whole round revealed if you spend them at once -- which is the choice.
var PEEKS = 5;

function startRun() {
  state = {
    budget: BUDGET,
    roster: {}, // position -> { row, score }
    round: 1,
    deck: [],
    over: false,
    gone: {}, // player_ids sold back, never dealt again this run
    used: {}, // which lifelines are spent
    revealed: false, // the reveal lifeline, and only for the board it was used on
    doubleDip: null, // null | "armed" | "spending"
    selling: false, // sell is armed and waiting to be pointed at a man
    peeks: PEEKS, // single cards left to turn over
    peeked: {}, // and the ones already turned
  };

  document.getElementById("finish").hidden = true;
  document.getElementById("deck-title").hidden = false;
  deal();
  paint();
}

// --- Playing ---------------------------------------------------------------

// Filled boxes next door to an open one.
//
// The deck used to hold nothing but men who could be picked right now, which
// meant that the moment you filled point guard you would never be shown
// another one -- Luka simply stopped existing for the rest of the run. Now a
// few of them come anyway, marked "filled" and unpickable, and the way to
// take one is to move the man already standing there into his other position.
//
// Neighbours only, along the PG-SG-SF-PF-C line, because that is the shuffle
// that tends to be possible: a shooting guard slides to small forward far
// more often than to centre.
var NEIGHBOUR_CARDS = 5;

function neighbourPositions() {
  var open = openPositions();
  var wanted = {};

  open.forEach(function (position) {
    var i = POSITIONS.indexOf(position);
    [POSITIONS[i - 1], POSITIONS[i + 1]].forEach(function (side) {
      if (side && state.roster[side]) wanted[side] = true;
    });
  });

  return Object.keys(wanted);
}

function openPositions() {
  return POSITIONS.filter(function (position) {
    return !state.roster[position];
  });
}

// You are never allowed to spend yourself out of a lineup.
//
// Buying a man is not just his salary: it is his salary plus enough left over
// to put somebody in every slot you have not filled yet. Without this you
// could take three stars, run dry, and finish with an empty position -- which
// cost you nothing, so the rule that you must field five was never real.
//
// The reserve is the cheapest player available at each still-open position,
// so it is as small as it can honestly be. Everything above it is yours.
function reserveAfter(position) {
  return openPositions().reduce(function (sum, open) {
    return open === position ? sum : sum + floorPrice[open];
  }, 0);
}

// Which box this card would actually go in.
//
// A card is dealt at one of the man's positions, but that is where he was
// offered, not the only place he can play. Take a shooting guard and slide
// him to small forward and the guard slot is open again -- a SG/SF still on
// the board has to be takeable, even though he was dealt as a forward.
//
// His own position first, always. He only borrows the other box when his own
// is already taken -- which also makes the card readable without any markings
// on it: the position printed first is his own, unless it is spoken for.
function slotFor(card) {
  var other = otherSlot(card);

  if (!state.roster[card.row.pos]) return card.row.pos;
  if (other && !state.roster[other]) return other;
  return null;
}

// The box a card would land in if you took it right now. Falls back to his own
// position when both of his are spoken for: the card is unpickable then, but it
// still has to say what it is worth.
function landingSlot(card) {
  return slotFor(card) || card.row.pos;
}

function canAfford(card) {
  var slot = slotFor(card);
  if (!slot) return false;
  return card.price + reserveAfter(slot) <= state.budget;
}

// A card left on the board for a man with nowhere left to play is there to be
// looked at, not taken.
function slotOpen(card) {
  return slotFor(card) !== null;
}

function canPick(card) {
  return slotOpen(card) && canAfford(card);
}

// The deck only ever holds players who can still be used. Dealing from the
// whole league would eventually offer five centres for a slot already filled.
function deal() {
  var open = openPositions();

  var taken = {};
  function fresh(card) {
    return !taken[card.row.player_id];
  }
  function keep(cards) {
    cards.forEach(function (card) {
      taken[card.row.player_id] = true;
    });
    state.deck = state.deck.concat(cards);
  }

  // Most of the board is men you can take right now.
  state.deck = [];
  keep(draw(pool, open, null, DECK_SIZE - NEIGHBOUR_CARDS));

  // Then the neighbours, barred by the man already in their box rather than
  // by the money, so they arrive greyed until you move him.
  //
  // From the ordinary pool, not the bargain bin. Drawn from the bin they only
  // had to clear the score floor, which let through men the ordinary deck
  // would never offer: a rookie with twenty games, or a legend whose fame
  // bonus lifted him over a line his season did not reach. A card you cannot
  // take yet should still be a card you could have been dealt.
  keep(draw(pool, neighbourPositions(), fresh, DECK_SIZE - state.deck.length));

  // On the first round nothing is filled, so there are no neighbours and the
  // rest of the fifteen comes from the open positions after all.
  keep(draw(pool, open, fresh, DECK_SIZE - state.deck.length));

  state.revealed = false; // a new board, so the reveal you paid for is over
  state.scrap = false;

  // Nothing on the table is affordable, so the table changes rather than the
  // game ending. Same positions, lower floor, and only cards the remaining
  // money can actually reach.
  if (!state.deck.some(canPick)) {
    var cheap = draw(scrapPool, open, canPick, DECK_SIZE);
    if (cheap.length) {
      state.deck = cheap;
      state.scrap = true;
    }
  }

}

// The order the fifteen are read in. It is not decided here but at the moment
// they are drawn, because a board is not a thing that happens once: a double
// dip takes a man off it, the years lifeline swaps every season on it, and
// moving a drafted man hands the natural bonus to somebody else. Sorting on
// the event that dealt the board leaves the numbers moving underneath a
// frozen order -- which is exactly what it looked like, scores out of order
// on a board that said it was sorted by them.
//
// Salary while you are still guessing, because salary is all you are shown.
// Once the scores are up salary is no longer what you are choosing on, and
// fifteen scores scattered in salary order is a puzzle you have already paid
// to stop solving.
function sortDeck() {
  if (boardRevealed()) {
    state.deck.sort(function (a, b) {
      return worth(b, landingSlot(b)) - worth(a, landingSlot(a));
    });
  } else {
    state.deck.sort(function (a, b) {
      return b.price - a.price;
    });
  }
}

function draw(source, open, allow, howMany) {
  var candidates = [];

  open.forEach(function (position) {
    candidates = candidates.concat(source[position]);
  });

  // A man cannot play two positions in the same lineup, and being offered
  // 2020 LeBron next to 2014 LeBron is not a choice between two players. So
  // the whole person is barred once he is drafted, and again inside a deck.
  var seen = {};
  POSITIONS.forEach(function (position) {
    var pick = state.roster[position];
    if (pick) seen[pick.row.player_id] = true;
  });
  Object.keys(state.gone).forEach(function (id) {
    seen[id] = true;
  });

  candidates = candidates.filter(function (card) {
    if (seen[card.row.player_id]) return false;
    return !allow || allow(card);
  });

  // A two-position season sits in two of the pools, so while both its slots
  // are open it would be dealt twice as often as anybody else. Keep one entry
  // per season -- picked evenly between its positions -- and that is the slot
  // it is offered at on this board.
  //
  // Per season, not per player. Keying this on the man instead collapses all
  // twenty of his years into one randomly chosen year, which quietly costs
  // twenty points a run: his best season is usually not the one that survives.
  var held = {};
  candidates.forEach(function (card) {
    var key = card.row.player_id + "|" + card.row.season;
    if (!held[key]) {
      held[key] = { card: card, count: 1 };
      return;
    }
    held[key].count++;
    if (Math.random() < 1 / held[key].count) held[key].card = card;
  });

  candidates = Object.keys(held).map(function (key) {
    return held[key].card;
  });

  var deck = [];
  var tries = 0;
  var wanted = howMany === undefined ? DECK_SIZE : howMany;

  while (deck.length < wanted && tries < candidates.length * 4) {
    tries++;
    var pick = candidates[Math.floor(Math.random() * candidates.length)];
    if (!pick || seen[pick.row.player_id]) continue;

    seen[pick.row.player_id] = true;
    deck.push(pick);
  }

  return deck;
}

function choose(index) {
  var pick = state.deck[index];
  if (!pick || !canPick(pick)) return;

  // A copy, and at whichever of his positions is actually free. The card in
  // the pool is shared with every future run, so nothing is ever written on
  // it -- the roster carries its own record of where he ended up.
  var slot = slotFor(pick);
  state.roster[slot] = {
    row: pick.row,
    score: pick.score,
    price: pick.price,
    pos: slot,
    alt: slot === pick.row.pos ? otherSlot(pick) : pick.row.pos,
  };

  state.budget = Math.round((state.budget - pick.price) * 10) / 10;
  state.round++;

  if (state.round > POSITIONS.length) return finish();

  // Double dip: the board stays, minus the man just taken and anyone who
  // plays the position he just filled.
  if (state.doubleDip === "armed") {
    state.doubleDip = "spending";

    // The man himself goes, because he is on your team now. Everyone who
    // plays the position he just filled stays on the board greyed out: they
    // cannot be picked either, but a card vanishing looks like a bug when you
    // still have the money for it.
    state.deck = state.deck.filter(function (card) {
      return card.row.player_id !== pick.row.player_id;
    });

    if (state.deck.some(canPick)) return paint();

    // Nothing left on this board you can pay for, so the second dip is spent
    // on an ordinary board instead. Better than a dead end.
    state.doubleDip = null;
  } else if (state.doubleDip === "spending") {
    state.doubleDip = null;
  }

  deal();

  // Even the bargain bin has nothing at this price. Only then does the run
  // stop short of a full five.
  if (!state.deck.some(canPick)) return finish();

  paint();
}

// Can this man go to his other position? Either it is empty, or whoever is
// standing there can play the box being vacated.
function canMove(from) {
  var pick = state.roster[from];
  if (!pick || !pick.alt) return false;

  var other = state.roster[pick.alt];
  return !other || other.alt === from;
}

// Move a man you have already drafted to his other position.
//
// He is dealt at one of his two slots and lands there, but a lineup is not
// finished until the last round -- taking a shooting guard early and sliding
// him across to small forward when a better guard turns up is exactly the
// kind of thinking a two-position player is for. It costs nothing: same man,
// same salary, same score, different box.
function movePick(from) {
  if (state.over || !canMove(from)) return;

  var pick = state.roster[from];
  var to = pick.alt;
  var other = state.roster[to];

  // Copies, because the cards themselves belong to the pool and will be dealt
  // again in some later run. Writing the new slot onto one would follow the
  // player around forever.
  if (other) {
    // Both men play both positions, so they change places. Two SG/SF cards
    // sitting in each other's boxes is a swap, not a dead end.
    state.roster[from] = {
      row: other.row,
      score: other.score,
      price: other.price,
      pos: from,
      alt: to,
    };
  } else {
    delete state.roster[from];
  }

  state.roster[to] = {
    row: pick.row,
    score: pick.score,
    price: pick.price,
    pos: to,
    alt: from,
  };

  // The board was dealt for the positions that were open a moment ago. If the
  // move leaves nothing on it you can take, deal a fresh one rather than
  // stranding the run.
  if (!state.deck.some(canPick)) deal();

  paint();
}

function total() {
  var sum = 0;
  POSITIONS.forEach(function (position) {
    if (state.roster[position]) sum += worth(state.roster[position]);
  });
  return Math.round(sum * 10) / 10;
}

// The end screen, written once and used twice: for the run you just played,
// and for a lineup that arrived in a link.
//
// The score read as a season. A team that really finished there says more
// than the number does -- and above the record there is no team to name,
// which says more still.
function showVerdict(tail) {
  var season = seasonFor(total());

  document.getElementById("verdict").innerHTML =
    "<strong>" + season.wins + "&ndash;" + season.losses + "</strong>" +
    "<span class='verdict-team" + (season.team ? "" : " is-unheard") + "'>" +
      (season.team
        ? "like the " + season.team
        : season.wins === GAMES
          ? "a perfect season. Nobody has ever come close."
          : "better than any team in NBA history") +
    "</span>" +
    teamLine() +
    "<span class='verdict-tail'>" + tail + "</span>";

  document.getElementById("finish").hidden = false;
}

function finish() {
  state.over = true;

  var final = total();
  var record = final > best;
  if (record) {
    best = final;
    localStorage.setItem(bestKey, best);
  }

  paint();
  document.getElementById("deck-title").hidden = true;
  document.getElementById("deck").innerHTML = "";

  var filled = POSITIONS.filter(function (position) {
    return state.roster[position];
  }).length;

  var tail = "You scored " + final;
  if (filled < POSITIONS.length) {
    tail +=
      " with " + (POSITIONS.length - filled) +
      " of the five empty — you ran out of money before you ran out of rounds.";
  } else {
    tail += ", with " + money(state.budget) + " left under the cap.";
  }

  tail += record ? " A new best." : " Your best is " + best + ".";
  showVerdict(tail);
}

function useLifeline(name) {
  if (state.over || state.used[name]) return;

  // Sell is the odd one: arming it only asks the question. It is not spent
  // until a man is actually pointed at, and pressing it again backs out.
  if (name === "sell") {
    state.selling = !state.selling;
    return paint();
  }

  if (name === "shuffle") {
    // Same round, same open positions, fifteen different men. The double dip
    // does not survive it -- that would be two boards, not one.
    state.doubleDip = null;
    deal();
  } else if (name === "reveal") {
    // sortDeck() reads this on the way to the screen, so turning it on is all
    // there is to do -- the board re-sorts itself by worth from here on.
    state.revealed = true;
  } else if (name === "double") {
    if (openPositions().length < 2) return;
    state.doubleDip = "armed";
  } else if (name === "years") {
    swapYears();
  }

  state.used[name] = true;
  paint();
}

// The same fifteen men, each dealt at a different season.
//
// A shuffle throws the names away too. This keeps them: you looked at the
// board, you know who you want, you just do not want the year he turned up
// in. A man with only one season in the pool stays where he is.
function swapYears() {
  var open = {};
  openPositions().forEach(function (position) {
    open[position] = true;
  });

  state.deck = state.deck.map(function (card) {
    var others = (seasonsByPlayer[card.row.player_id] || []).filter(function (other) {
      return other.row.season !== card.row.season && open[other.pos];
    });

    // One entry per season -- a two-position man is in the list twice.
    var bySeason = {};
    others.forEach(function (other) {
      var held = bySeason[other.row.season];
      if (!held || Math.random() < 0.5) bySeason[other.row.season] = other;
    });

    var seasons = Object.keys(bySeason).map(function (season) {
      return bySeason[season];
    });

    // Something you can actually pay for, if there is one. Otherwise anything
    // -- an unaffordable card is still worth seeing.
    var affordable = seasons.filter(canAfford);
    var choices = affordable.length ? affordable : seasons;
    if (!choices.length) return card;

    return choices[Math.floor(Math.random() * choices.length)];
  });

  // The board re-sorts afterwards, so the names do move. Keeping them still
  // was meant to save you a second search, but it was saving the wrong thing:
  // every card now holds a different season at a different salary, so the row
  // you memorised was gone anyway. An order you can trust is worth more than
  // a position you can no longer read.

  if (!state.deck.some(canPick)) deal();
}

// Give a man back and take his salary with him.
//
// It is the only way to undo a pick, so it is worth a lifeline on its own: a
// round early you can now spend, having seen four more boards than you had
// when you spent it. He does not come back -- selling and rebuying the same
// man would be a shuffle with extra steps.
function sellPick(position) {
  if (state.over || state.used.sell || !state.selling) return;

  var pick = state.roster[position];
  if (!pick) return;

  delete state.roster[position];
  state.budget = Math.round((state.budget + pick.price) * 10) / 10;
  state.round--;
  state.gone[pick.row.player_id] = true;
  state.used.sell = true;
  state.selling = false;

  // The board stays exactly as it is. You sold to afford something you can
  // see, and dealing a fresh fifteen would take it away -- which would make
  // the lifeline useless for the one thing it is for. Nothing on the board
  // can become unpickable either: the money went up and a slot opened, so
  // cards greyed out as "filled" come back to life.
  paint();
}

// Are the scores on this board visible? Either you flipped the switch and are
// playing with the answers up, or you spent the reveal on this board.
function boardRevealed() {
  return showScores || state.revealed;
}

// A card is a season at a position, so all three go in the key: the same man
// turned over as a centre is not the one you turned over as a forward.
function cardKey(card) {
  return card.row.player_id + "|" + card.row.season + "|" + card.pos;
}

function peeked(card) {
  return boardRevealed() || !!state.peeked[cardKey(card)];
}

function peek(card) {
  if (state.over || state.peeks <= 0 || peeked(card) || !canPick(card)) return;

  state.peeked[cardKey(card)] = true;
  state.peeks--;
  paint();
}

// --- Sharing a lineup ------------------------------------------------------

// There is no server here, so the team has to travel inside the link itself.
//
// Each man is his id, his season and the box he stood in -- "curryst01.2016.0"
// -- and the five are joined by tildes. About eighty characters, which fits
// anywhere you would paste a link. Nothing else is stored: the salary and the
// score are worked out again from the data at the other end, so a link cannot
// carry a number the game would not have given you.
function shareCode() {
  return POSITIONS.map(function (position) {
    var pick = state.roster[position];
    if (!pick) return "";
    return pick.row.player_id + "." + pick.row.season + "." + POSITIONS.indexOf(position);
  })
    .filter(Boolean)
    .join("~");
}

function shareLink() {
  return location.origin + location.pathname + "#team=" + shareCode();
}

function rosterFromCode(code) {
  var roster = {};

  code.split("~").forEach(function (part) {
    var bits = part.split(".");
    var position = POSITIONS[Number(bits[2])];
    if (!position) return;

    // The card has to exist at that position, which quietly throws out a link
    // somebody has edited into a lineup the game would never deal.
    var card = cardFor[bits[0] + "|" + bits[1] + "|" + position];
    if (!card) return;

    roster[position] = {
      row: card.row,
      score: card.score,
      price: card.price,
      pos: position,
      alt: card.alt,
    };
  });

  return roster;
}

function showShared(code) {
  var roster = rosterFromCode(code);
  var men = POSITIONS.filter(function (position) {
    return roster[position];
  });
  if (!men.length) return false;

  var spent = men.reduce(function (total, position) {
    return total + roster[position].price;
  }, 0);

  state = {
    budget: Math.round((BUDGET - spent) * 10) / 10,
    roster: roster,
    round: POSITIONS.length + 1,
    deck: [],
    over: true,
    gone: {},
    used: {},
    revealed: false,
    doubleDip: null,
    selling: false,
    peeks: 0,
    peeked: {},
  };

  document.getElementById("deck").innerHTML = "";
  document.getElementById("again").textContent = "Build your own";

  // Everything a visitor cannot use goes: the table, the lifelines, the money
  // meters, the switch that hides scores. None of them do anything once the
  // run is over, and a screen full of dead controls is a screen nobody reads.
  //
  // Hidden by class rather than by the hidden attribute, because the deck head
  // and the switch are both display:flex and a stylesheet rule beats it.
  document.getElementById("top").classList.add("is-shared");

  // A visitor did not play this run, so the screen is read in the other
  // order: the record first, because that is the claim being made, and the
  // five men underneath as the evidence. During a game the lineup comes first
  // because you are still filling it in.
  var game = document.getElementById("game");
  game.classList.add("is-shared");
  game.insertBefore(document.getElementById("finish"), document.getElementById("roster"));

  paint();
  showVerdict(
    "Somebody built this with " + money(BUDGET - state.budget) +
    " of the " + money(BUDGET) + " cap."
  );
  return true;
}

// --- Drawing ---------------------------------------------------------------

function paint() {
  document.getElementById("budget").textContent = money(state.budget);
  document.getElementById("round").textContent =
    Math.min(state.round, POSITIONS.length) + " / " + POSITIONS.length;
  // The Score stays hidden while you are still picking. Seeing it would turn
  // every choice into a subtraction instead of a judgement.
  document.getElementById("total").textContent = state.over || showScores ? total() : "?";
  document.getElementById("best").textContent = best ? best : "—";

  var title = document.getElementById("deck-title");
  if (state.selling) title.textContent = "Sell which one?";
  else if (state.doubleDip === "armed") title.textContent = "Pick one, then one more";
  else if (state.doubleDip === "spending") title.textContent = "Now your second";
  else if (state.scrap) title.textContent = "Bargain bin — this is all you can still afford";
  else title.textContent = "Pick one";
  title.classList.toggle("is-scrap", !!state.scrap);

  paintLifelines();
  paintRoster();
  paintDeck();
}

function paintLifelines() {
  Array.prototype.forEach.call(
    document.getElementById("lifelines").children,
    function (button) {
      var name = button.getAttribute("data-use");
      if (!name) return; // the label sitting at the head of the row

      // Revealing what the switch already shows is not worth a lifeline.
      var pointless = name === "reveal" && showScores;
      // Two picks from one board needs two boxes to put them in. On the last
      // round there is only one, so the lifeline would burn for nothing.
      if (name === "double" && openPositions().length < 2) pointless = true;
      // Nothing to sell before you have drafted anybody.
      var nobody = name === "sell" && openPositions().length === POSITIONS.length;
      var spent = !!state.used[name];

      button.disabled = state.over || spent || pointless || nobody;
      button.classList.toggle("is-spent", spent);
      button.classList.toggle("is-armed", name === "sell" && state.selling);
    }
  );
}

function paintRoster() {
  var box = document.getElementById("roster");
  box.innerHTML = "";

  POSITIONS.forEach(function (position) {
    var slot = document.createElement("div");
    var pick = state.roster[position];
    slot.className = "slot" + (pick ? " is-filled" : "");

    if (pick) {
      slot.innerHTML =
        "<span class='slot-pos'>" + position + "</span>" +
        // Smaller than the card's, because the lineup is five across and the
        // deck underneath still has to fit on the screen.
        photoTag(pick.row, "slot-photo") +
        "<span class='slot-name'>" + pick.row.player + "</span>" +
        "<span class='slot-season'>" + pick.row.season + " " + pick.row.team + "</span>" +
        // Both his positions, his own one first, exactly as the card had it.
        // Once he is in a box you can no longer see what else he covers, and
        // whether the box he is in is the one worth two more.
        (pick.alt
          ? "<span class='slot-plays'>" +
              pick.row.pos + "<span class='slot-plays-alt'>/" + otherSlot(pick) + "</span>" +
            "</span>"
          : "") +
        // The same line the card carried. Once a man is in the lineup his
        // numbers are still worth checking -- that is how you work out why
        // the score came out the way it did.
        "<span class='slot-stats'>" +
          statLine(pick.row) +
        "</span>" +
        "<span class='slot-numbers'>" +
          "<span class='slot-cost'>" + money(pick.price) + "<span class='tag'>salary</span></span>" +
          (state.over || showScores
            ? "<span class='slot-score'>" + worth(pick) + "<span class='tag'>score</span></span>"
            : "<span class='slot-score is-hidden'>?<span class='tag'>score</span></span>") +
        "</span>";

      // He can play somewhere else and that box is free, or its occupant can
      // take this one.
      if (canMove(position) && !state.over) {
        var move = document.createElement("button");
        move.type = "button";
        move.className = "slot-move";
        move.innerHTML =
          (state.roster[pick.alt] ? "swap with " : "move to ") + pick.alt;
        move.addEventListener("click", function () {
          movePick(position);
        });
        slot.appendChild(move);
      }

      // Only once the sell lifeline has been armed upstairs. Nobody sells a
      // man they meant to move.
      if (state.selling && !state.used.sell && !state.over) {
        var sell = document.createElement("button");
        sell.type = "button";
        sell.className = "slot-move is-sell";
        sell.innerHTML = "sell " + money(pick.price);
        sell.addEventListener("click", function () {
          sellPick(position);
        });
        slot.appendChild(sell);
      }
    } else {
      slot.innerHTML =
        "<span class='slot-pos'>" + position + "</span>" +
        "<span class='slot-empty'>—</span>";
    }

    box.appendChild(slot);
  });
}

function paintDeck() {
  var box = document.getElementById("deck");
  box.innerHTML = "";

  sortDeck();

  state.deck.forEach(function (card, index) {
    var pickable = canPick(card);
    var el = document.createElement("button");
    el.type = "button";
    el.className = "card" + (pickable ? "" : " is-broke");
    el.disabled = !pickable;

    var first = landingSlot(card);

    el.innerHTML =
      // His own position first, always, whatever the lineup looks like. The
      // card said different things at different moments before -- "PF/C" for
      // a power forward one round and for a displaced centre the next -- and
      // the two are worth two points apart. A label that never moves cannot
      // mislead: first name is where he belongs, and if that box is taken you
      // can see so in the lineup above.
      "<span class='card-pos'>" + card.row.pos +
        (card.alt ? "<span class='card-alt'>/" + otherSlot(card) + "</span>" : "") +
        (slotOpen(card) ? "" : " <span class='card-why'>filled</span>") +
      "</span>" +
      // Fifteen names on a board is a spreadsheet. Fifteen faces is a draft.
      photoTag(card.row, "card-photo") +
      "<span class='card-name'>" + card.row.player + "</span>" +
      "<span class='card-season'>" + card.row.season + " " + card.row.team + "</span>" +
      statLine(card.row) +
      "<span class='card-price'>" + money(card.price) +
        "<span class='tag'>salary</span></span>" +
      (peeked(card)
        ? "<span class='card-worth'>" + worth(card, first) + "<span class='tag'>score</span></span>"
        : "");

    el.addEventListener("click", function () {
      choose(index);
    });

    // The card is a button, and a button cannot hold another one, so the two
    // sit side by side inside a wrapper and the glass is placed over the
    // corner of the card.
    var wrap = document.createElement("div");
    wrap.className = "card-wrap";
    wrap.appendChild(el);

    // Only on cards you could actually take. A look you cannot act on is a
    // look wasted, and there are five of them.
    if (pickable && !peeked(card) && state.peeks > 0 && !state.over) {
      var glass = document.createElement("button");
      glass.type = "button";
      glass.className = "peek";
      glass.innerHTML = "&#128269;";
      glass.title = "Look at this one's score (" + state.peeks + " left)";
      glass.addEventListener("click", function () {
        peek(card);
      });
      wrap.appendChild(glass);
    }

    box.appendChild(wrap);
  });
}

// Prices read as salaries, because that is what they are: what the league
// pays a man for scoring. The numbers are unchanged, only dressed.
function money(amount) {
  return "$" + amount + "M";
}

// Everything the price does not already tell you. Price is built from points,
// so points alone would say nothing new -- the rest is where a bargain hides.
// What the five of them do in a night, added up.
//
// Counting stats simply add: five men who each grab nine boards grab
// forty-five. Shooting does not -- a team that misses everything from one
// corner and makes everything from the other did not shoot 50%. So the
// percentage is rebuilt from the shots themselves: every make the five took,
// counting a three as one and a half, over every attempt.
function teamLine() {
  var men = POSITIONS.map(function (position) {
    return state.roster[position];
  }).filter(Boolean);

  function sum(key) {
    return men.reduce(function (total, pick) {
      return total + (number(pick.row, key) || 0);
    }, 0);
  }

  var attempts = sum("fga_per_game");
  var makes = sum("fg_per_game") + 0.5 * sum("x3p_per_game");
  var efg = attempts ? Math.round((makes / attempts) * 100) + "%" : "—";

  function round(value) {
    return Math.round(value * 10) / 10;
  }

  return (
    "<span class='verdict-team-line'>" +
      "<span class='card-line'>" +
        cell(round(sum("pts_per_game")), "pts") +
        cell(round(sum("trb_per_game")), "reb") +
        cell(round(sum("ast_per_game")), "ast") +
      "</span>" +
      "<span class='card-line'>" +
        cell(round(sum("stl_per_game")), "stl") +
        cell(round(sum("blk_per_game")), "blk") +
        cell(efg, "eFG") +
      "</span>" +
    "</span>"
  );
}

// Three to a row, each in its own column.
//
// They used to be one run of text separated by dots, which wrapped onto a
// second line as soon as the numbers ran long -- so one card in a row grew
// taller and dragged the whole row with it. Columns cannot wrap, and they
// line the numbers up across every card on the board as a bonus.
function statLine(row) {
  return (
    "<span class='card-line'>" +
      cell(stat(row, "pts_per_game"), "pts") +
      cell(stat(row, "trb_per_game"), "reb") +
      cell(stat(row, "ast_per_game"), "ast") +
    "</span>" +
    "<span class='card-line'>" +
      cell(stat(row, "stl_per_game"), "stl") +
      cell(stat(row, "blk_per_game"), "blk") +
      cell(percent(row, "e_fg_percent"), "eFG") +
    "</span>"
  );
}

function cell(value, label) {
  return (
    "<span class='stat'>" + value +
      "<span class='stat-label'>" + label + "</span>" +
    "</span>"
  );
}

function stat(row, key) {
  var value = number(row, key);
  return value === null ? "—" : value;
}

function percent(row, key) {
  // Before 1980 there is no eFG% column, but with no three point line it is
  // the same number as FG%.
  var value = number(row, key);
  if (value === null) value = number(row, "fg_percent");
  return value === null ? "—" : Math.round(value * 100) + "%";
}

document.getElementById("again").addEventListener("click", function () {
  // Clear the shared team out of the address bar, or a refresh would drop you
  // back into somebody else's lineup.
  if (location.hash) location.hash = "";

  var game = document.getElementById("game");
  game.classList.remove("is-shared");
  document.getElementById("top").classList.remove("is-shared");
  game.appendChild(document.getElementById("finish"));
  document.getElementById("again").textContent = "Play again";
  startRun();
});

document.getElementById("share").addEventListener("click", function () {
  var button = document.getElementById("share");
  var link = shareLink();

  function done(message) {
    button.textContent = message;
    setTimeout(function () {
      button.textContent = "Copy link to this team";
    }, 2000);
  }

  if (navigator.clipboard) {
    navigator.clipboard.writeText(link).then(
      function () {
        done("Copied");
      },
      function () {
        // Clipboard refused -- put the link in the address bar instead, where
        // it can at least be copied by hand.
        location.hash = "team=" + shareCode();
        done("In the address bar");
      }
    );
  } else {
    location.hash = "team=" + shareCode();
    done("In the address bar");
  }
});

Array.prototype.forEach.call(
  document.getElementById("lifelines").children,
  function (button) {
    button.addEventListener("click", function () {
      useLifeline(button.getAttribute("data-use"));
    });
  }
);

// Mark whichever option is currently in force, then let a click switch it.
// Changing it starts a new run -- revealing the answers halfway through a
// game you were guessing at is not really the same game.
Array.prototype.forEach.call(
  document.getElementById("reveal").children,
  function (button) {
    var wantsScores = button.getAttribute("data-show") === "yes";
    button.classList.toggle("is-on", wantsScores === showScores);

    button.addEventListener("click", function () {
      if (wantsScores === showScores) return;
      localStorage.setItem("showScores", wantsScores ? "yes" : "no");
      location.reload();
    });
  }
);
