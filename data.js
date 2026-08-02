// Everything the page and the game both need: the data files, the indexes
// built from them, and the full Score.
//
// score.js holds the box score half. This file adds what the voters and
// Basketball Reference thought, and hands out one number.

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

// End of season honours. MVP goes to one player a year; All-NBA goes to
// fifteen, so this reaches a lot of very good seasons the award votes miss.
//
// The gap between the 2nd and 3rd teams is deliberately small. Being left off
// the 2nd team is often one voter's opinion, not a real drop in quality.
var HONOURS = [
  {
    type: "All-NBA",
    label: "All-NBA",
    bonus: { "1st": 3, "2nd": 2.25, "3rd": 1.75 },
  },
  {
    type: "All-Defense",
    label: "All-Defensive",
    bonus: { "1st": 2, "2nd": 1.5 },
  },
];

// { "All-NBA": { "curryst01|2016": "1st" }, "All-Defense": { ... } }
var honours = {};

// Which seasons each honour was actually picked. All-Defense only starts in
// 1969, so a 1962 season has no team rather than a player left off it.
var honourSeasons = {};

function honour(row, type) {
  if (!honourSeasons[type] || !honourSeasons[type][row.season]) return null;
  return honours[type][row.player_id + "|" + row.season] || "";
}

function honourBonus(row) {
  var total = 0;
  HONOURS.forEach(function (h) {
    var place = honour(row, h.type);
    if (place) total += h.bonus[place] || 0;
  });
  return total;
}

// Win Shares, keyed by "player_id|season|team". Basketball Reference's own
// estimate of how many of his team's wins a player was responsible for.
var winShares = {};

// Win Shares is a season total on a scale of its own -- 20 is a huge year.
// A quarter of it puts a star's contribution at about five points, the same
// size as the MVP bonus: enough to matter, not enough to take over.
var WS_WEIGHT = 0.25;

// Loads the four files and builds every index. Both pages call this and wait.
function loadData() {
  return Promise.all(
    [
      "data/player-per-game.csv",
      "data/player-award-shares.csv",
      "data/player-advanced.csv",
      "data/end-of-season-teams.csv",
    ].map(function (path) {
      return fetch(path).then(function (response) {
        return response.text();
      });
    })
  ).then(function (files) {
    buildPlayerIndex(files[0]);
    buildAwardIndex(files[1]);
    buildWinShareIndex(files[2]);
    buildHonourIndex(files[3]);
  });
}

// The number both pages show. rating() is the box score; the rest is what the
// season was judged to be worth.
function fullScore(row) {
  var total = rating(row).score + awardBonus(row) + honourBonus(row);
  total += (winShare(row) || 0) * WS_WEIGHT;
  return Math.round(total * 10) / 10;
}

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

function buildHonourIndex(csv) {
  var lines = csv.trim().split("\n");
  var columns = lines[0].split(",");
  var wanted = {};

  HONOURS.forEach(function (h) {
    wanted[h.type] = true;
    honours[h.type] = {};
    honourSeasons[h.type] = {};
  });

  for (var i = 1; i < lines.length; i++) {
    var row = rowToObject(lines[i].split(","), columns);
    if (row.lg !== "NBA") continue;

    // All-Rookie is in this file too. It rewards being new, not being good.
    if (!wanted[row.type]) continue;

    honourSeasons[row.type][row.season] = true;
    honours[row.type][row.player_id + "|" + row.season] = row.number_tm;
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

