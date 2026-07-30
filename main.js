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
//   point    1.00  a point is a point
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
  pts_per_game: 1.0,
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

function rating(row) {
  var total = 0;
  var missing = [];

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

// Every season row, grouped by player name.
// { "Michael Jordan": [ {season: 1996, pts_per_game: 30.4, ...}, ... ] }
var playersByName = {};

fetch("data/player-per-game.csv")
  .then(function (response) {
    return response.text();
  })
  .then(function (csv) {
    buildPlayerIndex(csv);
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

  var tr = document.createElement("tr");
  tr.className = "rating-row";
  tr.innerHTML =
    "<td>" + (scoreA ? scoreA.score : "—") + "</td>" +
    "<td class='stat-name'>Impact Score</td>" +
    "<td>" + (scoreB ? scoreB.score : "—") + "</td>";

  if (scoreA && scoreB) {
    if (scoreA.score > scoreB.score) tr.children[0].className = "better";
    if (scoreB.score > scoreA.score) tr.children[2].className = "better";
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
