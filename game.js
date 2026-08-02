// The draft game.
//
// Five rounds, five picks, one budget. A player costs what he is worth, so
// every pick is the same question: is this one worth what it leaves me with?

var POSITIONS = ["PG", "SG", "SF", "PF", "C"];
var BUDGET = 100;
var DECK_SIZE = 5;

// The pool the decks are dealt from.
//
// Dealt from everybody, the median player-season scores 8.8 and five picks
// would cost about 45 -- the budget would never bind and there would be no
// game. Above a floor of 15 the median is 19.1, so five average players cost
// 96 of the 100. That is the whole tension, and it only exists because of
// this line.
var MIN_SCORE = 15;
var MIN_GAMES = 40;

var pool = {}; // { PG: [ {row, score}, ... ], ... }

var state = null;

// --- Setting up ------------------------------------------------------------

loadData()
  .then(function () {
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
  });

  Object.keys(playersByName).forEach(function (name) {
    playersByName[name].forEach(function (row) {
      if (!pool[row.pos]) return; // no position recorded, or a combined team row
      if ((number(row, "g") || 0) < MIN_GAMES) return;

      var score = fullScore(row);
      if (score < MIN_SCORE) return;

      pool[row.pos].push({ row: row, score: score });
    });
  });
}

function startRun() {
  state = {
    budget: BUDGET,
    roster: {}, // position -> { row, score }
    round: 1,
    deck: [],
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

  state.deck = [];
  var taken = {};

  while (state.deck.length < DECK_SIZE && state.deck.length < candidates.length) {
    var pick = candidates[Math.floor(Math.random() * candidates.length)];
    var key = pick.row.player_id + "|" + pick.row.season;

    // The same player twice in one deck is not a choice.
    if (taken[key]) continue;
    taken[key] = true;
    state.deck.push(pick);
  }

  state.deck.sort(function (a, b) {
    return b.score - a.score;
  });
}

function choose(index) {
  var pick = state.deck[index];
  if (!pick || pick.score > state.budget) return;

  state.roster[pick.row.pos] = pick;
  state.budget = Math.round((state.budget - pick.score) * 10) / 10;
  state.round++;

  if (state.round > POSITIONS.length) return finish();

  deal();

  // Nothing left you can pay for -- the run stops here, short of a full five.
  var affordable = state.deck.filter(function (card) {
    return card.score <= state.budget;
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
  document.getElementById("total").textContent = total();

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
        "<span class='slot-score'>" + pick.score + "</span>";
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
    var afford = card.score <= state.budget;
    var el = document.createElement("button");
    el.type = "button";
    el.className = "card" + (afford ? "" : " is-broke");
    el.disabled = !afford;

    el.innerHTML =
      "<span class='card-pos'>" + card.row.pos + "</span>" +
      "<span class='card-name'>" + card.row.player + "</span>" +
      "<span class='card-season'>" + card.row.season + " " + card.row.team + "</span>" +
      "<span class='card-line'>" +
        stat(card.row, "pts_per_game") + " pts &middot; " +
        stat(card.row, "trb_per_game") + " reb &middot; " +
        stat(card.row, "ast_per_game") + " ast" +
      "</span>" +
      "<span class='card-price'>" + card.score + "</span>";

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

document.getElementById("again").addEventListener("click", startRun);
