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

// The box score half of the score lives in score.js, loaded before this file.
// It gives us WEIGHTS, number(), effectiveFg() and rating().

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

// Who actually took each award home, keyed the same way. Vote share alone
// does not say it -- 48% can be a win one year and a runner-up the next.
var awardWinners = {};

// Which seasons each award has actually been voted on. 2026 is still being
// played and DPOY only starts in 1983 -- neither is the same as everyone
// being snubbed, and the page has to show the difference.
var votedSeasons = {};

// Win Shares, keyed by "player_id|season|team". Basketball Reference's own
// estimate of how many of his team's wins a player was responsible for.
var winShares = {};

// Win Shares is a season total on a scale of its own -- 20 is a huge year.
// A quarter of it puts a star's contribution at about five points, the same
// size as the MVP bonus: enough to matter, not enough to take over.
var WS_WEIGHT = 0.25;

Promise.all([
  fetch("data/player-per-game.csv").then(function (r) {
    return r.text();
  }),
  fetch("data/player-award-shares.csv").then(function (r) {
    return r.text();
  }),
  fetch("data/player-advanced.csv").then(function (r) {
    return r.text();
  }),
])
  .then(function (files) {
    buildPlayerIndex(files[0]);
    buildAwardIndex(files[1]);
    buildWinShareIndex(files[2]);
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
    awardWinners[award.key] = {};
    votedSeasons[award.key] = {};
  });

  for (var i = 1; i < lines.length; i++) {
    var row = rowToObject(lines[i].split(","), columns);

    // The file carries every award -- rookie of the year, most improved,
    // sixth man. Only the two used by the score are indexed.
    if (!wanted[row.award]) continue;

    votedSeasons[row.award][row.season] = true;
    awardShares[row.award][row.player_id + "|" + row.season] = parseFloat(row.share);
    if (row.winner === "TRUE") awardWinners[row.award][row.player_id + "|" + row.season] = true;
  }
}

function buildWinShareIndex(csv) {
  var lines = csv.trim().split("\n");
  var columns = lines[0].split(",");

  for (var i = 1; i < lines.length; i++) {
    var row = rowToObject(lines[i].split(","), columns);
    if (row.lg !== "NBA") continue;

    var ws = number(row, "ws");
    if (ws === null) continue;

    // Team is part of the key because a traded player has one row per team
    // plus a combined one, exactly like the per-game file.
    winShares[row.player_id + "|" + row.season + "|" + row.team] = ws;
  }
}

function winShare(row) {
  var ws = winShares[row.player_id + "|" + row.season + "|" + row.team];
  return ws === undefined ? null : ws;
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

function formatShare(share, row, award) {
  // null means the season has not been voted on yet, which is not zero votes.
  if (share === null) return "—";

  // A single vote out of hundreds rounds to 0%, which reads as "got nothing"
  // when the player did get something. Say so instead.
  var text = share > 0 && share < 0.005 ? "&lt;1%" : Math.round(share * 100) + "%";
  if (row && awardWinners[award] && awardWinners[award][row.player_id + "|" + row.season]) {
    text += " <span class='won'>won</span>";
  }
  return text;
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

    // A row of two zeroes says nothing. Only show an award when at least one
    // of the two players was actually in the running for it.
    if (!shareA && !shareB) return;

    var voteRow = document.createElement("tr");
    voteRow.innerHTML =
      "<td>" + formatShare(shareA, a, award.key) + "</td>" +
      "<td class='stat-name'>" + award.label + "</td>" +
      "<td>" + formatShare(shareB, b, award.key) + "</td>";
    if (shareA !== null && shareB !== null) {
      if (shareA > shareB) voteRow.children[0].className = "better";
      if (shareB > shareA) voteRow.children[2].className = "better";
    }
    body.appendChild(voteRow);
  });

  var wsA = a ? winShare(a) : null;
  var wsB = b ? winShare(b) : null;

  if (wsA !== null || wsB !== null) {
    var wsRow = document.createElement("tr");
    wsRow.innerHTML =
      "<td>" + (wsA === null ? "—" : wsA) + "</td>" +
      "<td class='stat-name'>Win Shares</td>" +
      "<td>" + (wsB === null ? "—" : wsB) + "</td>";
    if (wsA !== null && wsB !== null) {
      if (wsA > wsB) wsRow.children[0].className = "better";
      if (wsB > wsA) wsRow.children[2].className = "better";
    }
    body.appendChild(wsRow);
  }

  var totalA = scoreA ? Math.round((scoreA.score + awardBonus(a) + (wsA || 0) * WS_WEIGHT) * 10) / 10 : null;
  var totalB = scoreB ? Math.round((scoreB.score + awardBonus(b) + (wsB || 0) * WS_WEIGHT) * 10) / 10 : null;

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
