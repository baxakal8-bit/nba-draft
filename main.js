// NBA Player Comparison
// Data: Basketball Reference per-game stats, 1947-2026.
// One row per player per season. Loaded once, kept in memory.

// The stats shown in the table, in order.
// key = column name in the CSV, label = what the user reads.
var STATS = [
  { key: "g", label: "Games" },
  { key: "mp_per_game", label: "Minutes" },
  { key: "pts_per_game", label: "Points" },
  { key: "trb_per_game", label: "Rebounds" },
  { key: "ast_per_game", label: "Assists" },
  { key: "stl_per_game", label: "Steals" },
  { key: "blk_per_game", label: "Blocks" },
  { key: "tov_per_game", label: "Turnovers", lowerIsBetter: true },
  { key: "fg_percent", label: "FG%", percent: true },
  { key: "x3p_percent", label: "3P%", percent: true },
  { key: "ft_percent", label: "FT%", percent: true },
];

// --- The rating ------------------------------------------------------------
//
// Everything is measured in points of scoring margin. The anchor is that an
// average NBA possession is worth about 1.15 points, so a possession changing
// hands is worth 1.15 to one side and 1.15 to the other: 2.30 in total.
//
//   points         not a flat weight. A point counts for what it cost, so
//                  30 points on 20 shots beats 30 points on 30 shots. See
//                  effectiveFg() below.
//   assist   1.20  an assisted basket averages ~2.35, but that possession was
//                  already worth 1.15 -- the passer added the difference
//   oreb     1.68  0.73 x 2.30. The defence collects 73% of misses, so an
//                  offensive board is the outcome that was NOT expected
//   dreb     0.62  0.27 x 2.30. Mostly it just confirms what was already likely
//   steal    2.30  a full, certain change of possession
//   block    0.60  the shakiest of the six. The arithmetic says ~0.4, but real
//                  models say ~0.6 because the shots never attempted against a
//                  rim protector never show up in a box score
//   turnover -2.30 a steal seen from the other side of the floor
var WEIGHTS = {
  ast_per_game: 1.2,
  orb_per_game: 1.68,
  drb_per_game: 0.62,
  stl_per_game: 2.3,
  blk_per_game: 0.6,
  tov_per_game: -2.3,
};

// Before 1974 the box score did not split rebounds, and steals and blocks were
// not recorded at all. For those seasons total rebounds are all we have, so
// they get the blend of the two weights above at a typical 28/72 split.
var TRB_WEIGHT = 0.92;

function number(row, key) {
  var raw = row[key];
  if (raw === undefined || raw === "" || raw === "NA") return null;
  var value = parseFloat(raw);
  return isNaN(value) ? null : value;
}

// Effective field goal percentage: like FG%, except a made three counts as
// one and a half makes, because it is worth one and a half times as much.
// Plain FG% would call Curry's three and a layup the same thing and rate him
// below players who never shoot from range.
//
// The file only carries this column from 1980 on. Before that there was no
// three-point line, so eFG% and FG% are the same number -- FG% is not an
// approximation for those seasons, it is the exact value. Using one measure
// for every era matters: two different rulers would hand older players a
// free advantage, since they read about 8% apart on the same shooting.
function effectiveFg(row) {
  var efg = number(row, "e_fg_percent");
  if (efg !== null) return efg;
  return number(row, "fg_percent");
}

function rating(row) {
  var total = 0;
  var missing = [];

  // Scoring is weighted by how efficiently the points were produced.
  var pts = number(row, "pts_per_game");
  var efg = effectiveFg(row);
  if (pts === null || efg === null) {
    missing.push("pts_per_game");
  } else {
    total += pts * efg;
  }

  for (var key in WEIGHTS) {
    var value = number(row, key);

    if (value === null) {
      // Rebounds have a fallback; steals and blocks do not.
      if (key === "orb_per_game" || key === "drb_per_game") continue;
      missing.push(key);
      continue;
    }

    total += value * WEIGHTS[key];
  }

  // No split rebounds -- fall back to the total.
  if (number(row, "orb_per_game") === null && number(row, "trb_per_game") !== null) {
    total += number(row, "trb_per_game") * TRB_WEIGHT;
  }

  return { score: Math.round(total * 10) / 10, missing: missing };
}

// What a unanimous winner is worth on top of his box score. Small on purpose:
// these should nudge the order, not decide it.
//
// DPOY is worth less than MVP because it only judges one half of the game,
// and because the box score already sees part of defence through steals and
// blocks. MVP is the award for everything the box score misses.
var AWARDS = [
  { key: "nba mvp", label: "MVP votes", bonus: 5 },
  { key: "nba dpoy", label: "DPOY votes", bonus: 3 },
];

// This is deliberately NOT part of rating(). The box score number has to stay
// free of award data, because the only honest way to ask "how well does this
// formula match the voting" is to ask it of a formula that has never seen the
// voting. Anything tuned against award results must be tuned against rating().
function awardShare(row, award) {
  if (!votedSeasons[award] || !votedSeasons[award][row.season]) return null;
  var share = awardShares[award][row.player_id + "|" + row.season];
  return share === undefined ? 0 : share;
}

function awardBonus(row) {
  var total = 0;
  AWARDS.forEach(function (award) {
    var share = awardShare(row, award.key);
    if (share !== null) total += share * award.bonus;
  });
  return total;
}

// Every season row, grouped by player name.
// { "Michael Jordan": [ {season: 1996, pts_per_game: 30.4, ...}, ... ] }
var playersByName = {};

// Vote share per award, keyed by "player_id|season".
// { "nba mvp": { "jordami01|1991": 0.928, ... }, "nba dpoy": { ... } }
var awardShares = {};

// Which seasons each award has actually been voted on. 2026 is still being
// played and DPOY only starts in 1983 -- neither is the same as everyone
// being snubbed, and the page has to show the difference.
var votedSeasons = {};

Promise.all([
  fetch("data/player-per-game.csv").then(function (r) {
    return r.text();
  }),
  fetch("data/player-award-shares.csv").then(function (r) {
    return r.text();
  }),
])
  .then(function (files) {
    buildPlayerIndex(files[0]);
    buildAwardIndex(files[1]);
    fillPlayerList();
    document.getElementById("status").hidden = true;
    document.getElementById("pickers").hidden = false;
    document.getElementById("compare").hidden = false;
  })
  .catch(function (error) {
    document.getElementById("status").textContent = "Could not load data: " + error.message;
  });

// --- Reading the CSV -------------------------------------------------------

function buildPlayerIndex(csv) {
  var lines = csv.trim().split("\n");
  var columns = lines[0].split(",");

  for (var i = 1; i < lines.length; i++) {
    var row = rowToObject(lines[i].split(","), columns);

    // The file also holds ABA and BAA seasons. This is an NBA tool.
    if (row.lg !== "NBA") continue;

    if (!playersByName[row.player]) playersByName[row.player] = [];
    playersByName[row.player].push(row);
  }

  // A player traded mid-season gets several rows for that season: one per
  // team, plus a combined row where team is "2TM" / "3TM". Keep the combined
  // one, drop the partial ones -- otherwise a season shows up three times.
  for (var name in playersByName) {
    playersByName[name] = dropPartialSeasons(playersByName[name]);
  }
}

function buildAwardIndex(csv) {
  var lines = csv.trim().split("\n");
  var columns = lines[0].split(",");
  var wanted = {};

  AWARDS.forEach(function (award) {
    wanted[award.key] = true;
    awardShares[award.key] = {};
    votedSeasons[award.key] = {};
  });

  for (var i = 1; i < lines.length; i++) {
    var row = rowToObject(lines[i].split(","), columns);

    // The file carries every award -- rookie of the year, most improved,
    // sixth man. Only the two used by the score are indexed.
    if (!wanted[row.award]) continue;

    votedSeasons[row.award][row.season] = true;
    awardShares[row.award][row.player_id + "|" + row.season] = parseFloat(row.share);
  }
}

function rowToObject(values, columns) {
  var row = {};
  for (var i = 0; i < columns.length; i++) {
    row[columns[i]] = values[i];
  }
  return row;
}

function dropPartialSeasons(seasons) {
  // Which seasons have a combined row?
  var combined = {};
  seasons.forEach(function (row) {
    if (/^\dTM$/.test(row.team)) combined[row.season] = true;
  });

  return seasons.filter(function (row) {
    if (!combined[row.season]) return true;
    return /^\dTM$/.test(row.team);
  });
}

// --- Filling the inputs ----------------------------------------------------

// Every player name, sorted. Filled once, then filtered as the user types.
var allNames = [];

// Suggestions stay hidden until this many characters are typed. With ~4900
// names, anything shorter matches half the league and helps nobody.
var MIN_CHARS = 3;
var MAX_SUGGESTIONS = 20;

function fillPlayerList() {
  allNames = Object.keys(playersByName).sort();
}

function updateSuggestions(side) {
  var raw = document.getElementById("name-" + side).value;
  var list = document.getElementById("players-" + side);
  list.innerHTML = "";

  // Spaces count toward the threshold: "de " is three characters typed.
  if (raw.length < MIN_CHARS) return;

  var typed = raw.trim().toLowerCase();
  if (typed === "") return;

  var matches = allNames
    .filter(function (name) {
      return name.toLowerCase().indexOf(typed) !== -1;
    })
    .slice(0, MAX_SUGGESTIONS);

  matches.forEach(function (name) {
    var option = document.createElement("option");
    option.value = name;
    list.appendChild(option);
  });
}

function fillSeasons(side) {
  var name = document.getElementById("name-" + side).value;
  var seasonBox = document.getElementById("season-" + side);
  seasonBox.innerHTML = "";

  var seasons = playersByName[name];
  if (!seasons) return;

  // Newest season first.
  seasons
    .slice()
    .sort(function (a, b) {
      return b.season - a.season;
    })
    .forEach(function (row) {
      var option = document.createElement("option");
      option.value = row.season;
      option.textContent = row.season + " " + row.team;
      seasonBox.appendChild(option);
    });
}

// --- Showing the comparison ------------------------------------------------

function findSeason(side) {
  var name = document.getElementById("name-" + side).value;
  var season = document.getElementById("season-" + side).value;
  var seasons = playersByName[name];
  if (!seasons) return null;

  return seasons.filter(function (row) {
    return row.season === season;
  })[0];
}

function formatShare(share) {
  // null means the season has not been voted on yet, which is not zero votes.
  if (share === null) return "—";
  return Math.round(share * 100) + "%";
}

function format(row, stat) {
  var raw = row[stat.key];
  // Steals and blocks were not recorded before 1974. The file writes "NA"
  // for those, and for 3P% before the line existed.
  if (raw === undefined || raw === "" || raw === "NA") return "—";
  if (stat.percent) return Math.round(parseFloat(raw) * 1000) / 10 + "%";
  return raw;
}

function render() {
  var a = findSeason("a");
  var b = findSeason("b");

  document.getElementById("head-a").textContent = a ? a.player + " " + a.season : "—";
  document.getElementById("head-b").textContent = b ? b.player + " " + b.season : "—";

  var body = document.getElementById("rows");
  body.innerHTML = "";

  STATS.forEach(function (stat) {
    var tr = document.createElement("tr");
    tr.innerHTML =
      "<td>" + (a ? format(a, stat) : "—") + "</td>" +
      "<td class='stat-name'>" + stat.label + "</td>" +
      "<td>" + (b ? format(b, stat) : "—") + "</td>";

    // Mark the better number so the eye finds it without reading.
    if (a && b) {
      var left = parseFloat(a[stat.key]);
      var right = parseFloat(b[stat.key]);
      // Turnovers are the one row where the smaller number wins.
      var leftWins = stat.lowerIsBetter ? left < right : left > right;
      var rightWins = stat.lowerIsBetter ? right < left : right > left;
      if (leftWins) tr.children[0].className = "better";
      if (rightWins) tr.children[2].className = "better";
    }

    body.appendChild(tr);
  });

  addRatingRow(body, a, b);
}

function addRatingRow(body, a, b) {
  var scoreA = a ? rating(a) : null;
  var scoreB = b ? rating(b) : null;
  // Each vote gets its own row, so the bonus is never a hidden thumb on the
  // scale -- you can see exactly where it came from.
  AWARDS.forEach(function (award) {
    var shareA = a ? awardShare(a, award.key) : null;
    var shareB = b ? awardShare(b, award.key) : null;

    var voteRow = document.createElement("tr");
    voteRow.innerHTML =
      "<td>" + formatShare(shareA) + "</td>" +
      "<td class='stat-name'>" + award.label + "</td>" +
      "<td>" + formatShare(shareB) + "</td>";
    if (shareA !== null && shareB !== null) {
      if (shareA > shareB) voteRow.children[0].className = "better";
      if (shareB > shareA) voteRow.children[2].className = "better";
    }
    body.appendChild(voteRow);
  });

  var totalA = scoreA ? Math.round((scoreA.score + awardBonus(a)) * 10) / 10 : null;
  var totalB = scoreB ? Math.round((scoreB.score + awardBonus(b)) * 10) / 10 : null;

  var tr = document.createElement("tr");
  tr.className = "rating-row";
  tr.innerHTML =
    "<td>" + (totalA === null ? "—" : totalA) + "</td>" +
    "<td class='stat-name'>Impact Score</td>" +
    "<td>" + (totalB === null ? "—" : totalB) + "</td>";

  if (totalA !== null && totalB !== null) {
    if (totalA > totalB) tr.children[0].className = "better";
    if (totalB > totalA) tr.children[2].className = "better";
  }

  body.appendChild(tr);

  // Be honest when a rating is built on less than the full six stats.
  var incomplete = [scoreA, scoreB].filter(function (s) {
    return s && s.missing.length > 0;
  });

  var note = document.getElementById("note");
  if (incomplete.length === 0) {
    note.hidden = true;
  } else {
    note.hidden = false;
    note.textContent =
      "Steals and blocks were only recorded from 1974, turnovers from 1978. " +
      "A rating from before then is missing part of the formula. It loses the " +
      "credit for steals and blocks, but it also escapes the turnover penalty.";
  }
}

// --- Wiring ----------------------------------------------------------------

["a", "b"].forEach(function (side) {
  var nameBox = document.getElementById("name-" + side);

  nameBox.addEventListener("input", function () {
    updateSuggestions(side);
  });
  nameBox.addEventListener("change", function () {
    fillSeasons(side);
    render();
  });
  document.getElementById("season-" + side).addEventListener("change", render);
});
