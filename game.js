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

// How many times each player was picked for an All-Star game, over his whole
// career. Fame, and only fame -- the fans vote, so it measures who people
// wanted to watch rather than who was good.
//
// This lives here and not in data.js on purpose. The comparison page must
// keep reporting what a season was worth; only the game pays a premium for a
// famous name.
var allStars = {};

// Fame is worth the square root of those selections, so the first one counts
// for a lot and the twentieth for almost nothing: 1 pick is +1, 4 is +2,
// 9 is +3, Kareem's 19 is +4.4. Deliberately small. Famous players already
// cost more, because price is built from scoring and scorers are who gets
// famous. Paying them twice would turn the game into "pick the name you know".
var FAME_BONUS = 1;

function fame(row) {
  var picks = allStars[row.player_id] || 0;
  return picks ? FAME_BONUS * Math.sqrt(picks) : 0;
}

var pool = {}; // { PG: [ {row, score, price}, ... ], ... }

var state = null;

// --- Setting up ------------------------------------------------------------

Promise.all([
  loadData(),
  fetch("data/all-star-selections.csv").then(function (response) {
    return response.text();
  }),
])
  .then(function (files) {
    buildAllStarIndex(files[1]);
    buildPool();
    document.getElementById("status").hidden = true;
    document.getElementById("game").hidden = false;
    startRun();
  })
  .catch(function (error) {
    document.getElementById("status").textContent = "Could not load data: " + error.message;
  });

function buildAllStarIndex(csv) {
  var lines = csv.trim().split("\n");
  var columns = lines[0].split(",");

  for (var i = 1; i < lines.length; i++) {
    var row = rowToObject(lines[i].split(","), columns);
    if (row.lg !== "NBA") continue;
    allStars[row.player_id] = (allStars[row.player_id] || 0) + 1;
  }
}

function buildPool() {
  POSITIONS.forEach(function (position) {
    pool[position] = [];
  });

  Object.keys(playersByName).forEach(function (name) {
    playersByName[name].forEach(function (row) {
      if (!pool[row.pos]) return; // no position recorded, or a combined team row
      if ((number(row, "g") || 0) < MIN_GAMES) return;

      var score = fullScore(row);
      if (score < MIN_SCORE) return;

      // The game pays a little extra for a famous name. The comparison page
      // does not -- fullScore() is left exactly as it is.
      score = Math.round((score + fame(row)) * 10) / 10;

      var price = Math.round(
        (number(row, "pts_per_game") || 0) * PRICE_PER_POINT +
          (number(row, "g") || 0) * PRICE_PER_GAME
      );
      pool[row.pos].push({ row: row, score: score, price: price });
    });
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

// The deck only ever holds players who can still be used. Dealing from the
// whole league would eventually offer five centres for a slot already filled.
function deal() {
  var open = openPositions();
  var candidates = [];

  open.forEach(function (position) {
    candidates = candidates.concat(pool[position]);
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
    return !seen[card.row.player_id];
  });

  state.deck = [];
  var tries = 0;

  while (state.deck.length < DECK_SIZE && tries < candidates.length * 4) {
    tries++;
    var pick = candidates[Math.floor(Math.random() * candidates.length)];
    if (!pick || seen[pick.row.player_id]) continue;

    seen[pick.row.player_id] = true;
    state.deck.push(pick);
  }

  // Sorted by price, because price is all you are shown while choosing.
  state.deck.sort(function (a, b) {
    return b.price - a.price;
  });
}

function choose(index) {
  var pick = state.deck[index];
  if (!pick || pick.price > state.budget) return;

  state.roster[pick.row.pos] = pick;
  state.budget = Math.round((state.budget - pick.price) * 10) / 10;
  state.round++;

  if (state.round > POSITIONS.length) return finish();

  deal();

  // Nothing left you can pay for -- the run stops here, short of a full five.
  var affordable = state.deck.filter(function (card) {
    return card.price <= state.budget;
  });
  if (!affordable.length) return finish();

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
    text += ", with " + state.budget + " left unspent.";
  }

  document.getElementById("verdict").innerHTML = text;
  document.getElementById("finish").hidden = false;
}

// --- Drawing ---------------------------------------------------------------

function paint() {
  document.getElementById("budget").textContent = state.budget;
  document.getElementById("round").textContent =
    Math.min(state.round, POSITIONS.length) + " / " + POSITIONS.length;
  // The Score stays hidden while you are still picking. Seeing it would turn
  // every choice into a subtraction instead of a judgement.
  document.getElementById("total").textContent = state.over ? total() : "?";

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
        "<span class='slot-numbers'>" +
          "<span class='slot-cost'>" + pick.price + "<span class='tag'>cost</span></span>" +
          (state.over
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
    var afford = card.price <= state.budget;
    var el = document.createElement("button");
    el.type = "button";
    el.className = "card" + (afford ? "" : " is-broke");
    el.disabled = !afford;

    el.innerHTML =
      "<span class='card-pos'>" + card.row.pos + "</span>" +
      "<span class='card-name'>" + card.row.player + "</span>" +
      "<span class='card-season'>" + card.row.season + " " + card.row.team + "</span>" +
      // Everything the price does not already tell you. Price is built from
      // points, so points alone would say nothing new -- the rest is where
      // a bargain hides.
      "<span class='card-line'>" +
        stat(card.row, "pts_per_game") + " pts &middot; " +
        stat(card.row, "trb_per_game") + " reb &middot; " +
        stat(card.row, "ast_per_game") + " ast" +
      "</span>" +
      "<span class='card-line'>" +
        stat(card.row, "stl_per_game") + " stl &middot; " +
        stat(card.row, "blk_per_game") + " blk &middot; " +
        percent(card.row, "e_fg_percent") + " eFG" +
      "</span>" +
      "<span class='card-price'>" + card.price +
        "<span class='tag'>cost</span></span>";

    el.addEventListener("click", function () {
      choose(index);
    });

    box.appendChild(el);
  });
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
