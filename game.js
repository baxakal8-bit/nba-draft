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
// cards a wider table actually rewards knowing what to look for -- the gap
// between hunting bargains and picking at random grows from 21 points at a
// floor of 15 to 30 at a floor of 5. But it also means more cheap players, so
// the money stops running out: average budget left over goes from 13 to 21.
// Ten keeps both -- a pool of 10,240 and a budget that still bites.
var MIN_SCORE = 10;
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
// multipliers are set so the average player still costs 20, which puts five
// of them at the 100 budget: the pool averages 17.3 points and 73.2 games, so
// 16 / 17.3 and 4 / 73.2.
//
// Prices are whole numbers. Nothing here is precise enough to earn a decimal
// place, and round numbers are easier to add up in your head while working
// out whether you can still afford a centre.
var PRICE_PER_POINT = 0.924;
var PRICE_PER_GAME = 0.0546;

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

function buildLegendIndex(csv) {
  ACTIVE_LEGENDS.forEach(function (name) {
    isLegend[name] = true;
  });

  var lines = csv.trim().split("\n");
  var columns = splitCsvLine(lines[0]);

  for (var i = 1; i < lines.length; i++) {
    var row = rowToObject(splitCsvLine(lines[i]), columns);
    if (row.hof === "TRUE") isLegend[row.player] = true;
  }
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
var floorPrice = {}; // the cheapest anybody can be had for, per position

var state = null;

// Hidden by default. Shown, every pick becomes "take the biggest number" and
// the guessing -- which is the game -- disappears. Left as a switch anyway,
// because it is a good way to learn what a season is actually worth.
//
// Flipping it reloads the page, so the choice has to outlive the reload. It
// is the only thing this game remembers between visits.
var showScores = localStorage.getItem("showScores") === "yes";

// --- Setting up ------------------------------------------------------------

Promise.all([
  loadData(),
  fetch("data/player-career-info.csv").then(function (response) {
    return response.text();
  }),
])
  .then(function (files) {
    buildLegendIndex(files[1]);
    buildEraIndex();
    buildPool();
    document.getElementById("status").hidden = true;
    document.getElementById("game").hidden = false;
    startRun();
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
        Math.round(
          (number(row, "pts_per_game") || 0) * PRICE_PER_POINT +
            games * PRICE_PER_GAME
        )
      );
      var card = { row: row, score: score, price: price };

      scrapPool[row.pos].push(card);
      if (base >= MIN_SCORE && games >= MIN_GAMES) pool[row.pos].push(card);
    });
  });

  POSITIONS.forEach(function (position) {
    floorPrice[position] = scrapPool[position].reduce(function (low, card) {
      return Math.min(low, card.price);
    }, Infinity);
  });
}

function startRun() {
  state = {
    budget: BUDGET,
    roster: {}, // position -> { row, score }
    round: 1,
    deck: [],
    over: false,
  };

  document.getElementById("finish").hidden = true;
  document.getElementById("deck-title").hidden = false;
  deal();
  paint();
}

// --- Playing ---------------------------------------------------------------

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

function canAfford(card) {
  return card.price + reserveAfter(card.row.pos) <= state.budget;
}

// The deck only ever holds players who can still be used. Dealing from the
// whole league would eventually offer five centres for a slot already filled.
function deal() {
  var open = openPositions();

  state.deck = draw(pool, open, null);

  state.scrap = false;

  // Nothing on the table is affordable, so the table changes rather than the
  // game ending. Same positions, lower floor, and only cards the remaining
  // money can actually reach.
  if (!state.deck.some(canAfford)) {
    var cheap = draw(scrapPool, open, canAfford);
    if (cheap.length) {
      state.deck = cheap;
      state.scrap = true;
    }
  }

  // Sorted by price, because price is all you are shown while choosing.
  state.deck.sort(function (a, b) {
    return b.price - a.price;
  });
}

function draw(source, open, allow) {
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

  candidates = candidates.filter(function (card) {
    if (seen[card.row.player_id]) return false;
    return !allow || allow(card);
  });

  var deck = [];
  var tries = 0;

  while (deck.length < DECK_SIZE && tries < candidates.length * 4) {
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
  if (!pick || !canAfford(pick)) return;

  state.roster[pick.row.pos] = pick;
  state.budget = Math.round((state.budget - pick.price) * 10) / 10;
  state.round++;

  if (state.round > POSITIONS.length) return finish();

  deal();

  // Even the bargain bin has nothing at this price. Only then does the run
  // stop short of a full five.
  if (!state.deck.some(canAfford)) return finish();

  paint();
}

function total() {
  var sum = 0;
  POSITIONS.forEach(function (position) {
    if (state.roster[position]) sum += state.roster[position].score;
  });
  return Math.round(sum * 10) / 10;
}

function finish() {
  state.over = true;
  paint();
  document.getElementById("deck-title").hidden = true;
  document.getElementById("deck").innerHTML = "";

  var filled = POSITIONS.filter(function (position) {
    return state.roster[position];
  }).length;

  var text = "You finished on <strong>" + total() + "</strong>";
  if (filled < POSITIONS.length) {
    text +=
      ", with " + (POSITIONS.length - filled) +
      " of the five empty. You ran out of money before you ran out of rounds.";
  } else {
    text += ", with " + money(state.budget) + " left under the cap.";
  }

  document.getElementById("verdict").innerHTML = text;
  document.getElementById("finish").hidden = false;
}

// --- Drawing ---------------------------------------------------------------

function paint() {
  document.getElementById("budget").textContent = money(state.budget);
  document.getElementById("round").textContent =
    Math.min(state.round, POSITIONS.length) + " / " + POSITIONS.length;
  // The Score stays hidden while you are still picking. Seeing it would turn
  // every choice into a subtraction instead of a judgement.
  document.getElementById("total").textContent = state.over || showScores ? total() : "?";

  var title = document.getElementById("deck-title");
  title.textContent = state.scrap
    ? "Bargain bin — this is all you can still afford"
    : "Pick one";
  title.classList.toggle("is-scrap", !!state.scrap);

  paintRoster();
  paintDeck();
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
        "<span class='slot-name'>" + pick.row.player + "</span>" +
        "<span class='slot-season'>" + pick.row.season + " " + pick.row.team + "</span>" +
        // The same line the card carried. Once a man is in the lineup his
        // numbers are still worth checking -- that is how you work out why
        // the score came out the way it did.
        "<span class='slot-stats'>" +
          statLine(pick.row) +
        "</span>" +
        "<span class='slot-numbers'>" +
          "<span class='slot-cost'>" + money(pick.price) + "<span class='tag'>salary</span></span>" +
          (state.over || showScores
            ? "<span class='slot-score'>" + pick.score + "<span class='tag'>score</span></span>"
            : "<span class='slot-score is-hidden'>?<span class='tag'>score</span></span>") +
        "</span>";
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

  state.deck.forEach(function (card, index) {
    var afford = canAfford(card);
    var el = document.createElement("button");
    el.type = "button";
    el.className = "card" + (afford ? "" : " is-broke");
    el.disabled = !afford;

    el.innerHTML =
      "<span class='card-pos'>" + card.row.pos + "</span>" +
      "<span class='card-name'>" + card.row.player + "</span>" +
      "<span class='card-season'>" + card.row.season + " " + card.row.team + "</span>" +
      statLine(card.row) +
      "<span class='card-price'>" + money(card.price) +
        "<span class='tag'>salary</span></span>" +
      (showScores
        ? "<span class='card-worth'>" + card.score + "<span class='tag'>score</span></span>"
        : "");

    el.addEventListener("click", function () {
      choose(index);
    });

    box.appendChild(el);
  });
}

// Prices read as salaries, because that is what they are: what the league
// pays a man for scoring. The numbers are unchanged, only dressed.
function money(amount) {
  return "$" + amount + "M";
}

// Everything the price does not already tell you. Price is built from points,
// so points alone would say nothing new -- the rest is where a bargain hides.
function statLine(row) {
  return (
    "<span class='card-line'>" +
      stat(row, "pts_per_game") + " pts &middot; " +
      stat(row, "trb_per_game") + " reb &middot; " +
      stat(row, "ast_per_game") + " ast" +
    "</span>" +
    "<span class='card-line'>" +
      stat(row, "stl_per_game") + " stl &middot; " +
      stat(row, "blk_per_game") + " blk &middot; " +
      percent(row, "e_fg_percent") + " eFG" +
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

document.getElementById("again").addEventListener("click", startRun);

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
