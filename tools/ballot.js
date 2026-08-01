// Does a set of weights order the whole MVP ballot, or only get the winner?
//
//   node tools/ballot.js
//
// tools/tune.js searches for weights that put the real MVP first. That target
// says nothing about anybody else, so weights can score well on it while
// scrambling the order of everyone below. This checks the rest of the ballot:
// for every pair of players who got MVP votes in a season, did the formula put
// the one with more votes ahead of the one with fewer?

var fs = require("fs");
var path = require("path");

var ROOT = path.join(__dirname, "..");
eval(fs.readFileSync(path.join(ROOT, "score.js"), "utf8"));

var TUNED = {
  ast_per_game: 0.7,
  orb_per_game: 0.68,
  drb_per_game: 0.62,
  stl_per_game: 1.4,
  blk_per_game: 0,
  tov_per_game: -1.8,
};

function readCsv(file) {
  var lines = fs.readFileSync(path.join(ROOT, file), "utf8").trim().split("\n");
  var columns = lines[0].split(",");
  return lines.slice(1).map(function (line) {
    var values = line.split(",");
    var row = {};
    columns.forEach(function (c, i) {
      row[c] = values[i];
    });
    return row;
  });
}

var perGame = readCsv("data/player-per-game.csv").filter(function (r) {
  return r.lg === "NBA";
});

var groups = {};
perGame.forEach(function (row) {
  var key = row.player_id + "|" + row.season;
  (groups[key] = groups[key] || []).push(row);
});
var rowFor = {};
Object.keys(groups).forEach(function (key) {
  var list = groups[key];
  rowFor[key] =
    list.filter(function (r) {
      return /^\dTM$/.test(r.team);
    })[0] || list[0];
});

var awardRows = readCsv("data/player-award-shares.csv");

function ballotsFor(award) {
  var out = {};
  awardRows.forEach(function (r) {
    if (r.award !== award) return;
    (out[r.season] = out[r.season] || []).push(r);
  });
  return out;
}

var bySeason = ballotsFor("nba mvp");

// Kendall's tau, the plain version: out of every pair of players on the
// ballot, how often does the formula agree with the voters about which of the
// two was better? 100% is perfect agreement, 50% is a coin flip.
function agreement(weights, ballots) {
  var right = 0;
  var total = 0;

  Object.keys(ballots).forEach(function (season) {
    var ballot = ballots[season]
      .map(function (v) {
        var row = rowFor[v.player_id + "|" + season];
        if (!row) return null;
        return { share: parseFloat(v.share), score: rating(row, weights).score };
      })
      .filter(Boolean);

    for (var i = 0; i < ballot.length; i++) {
      for (var j = i + 1; j < ballot.length; j++) {
        if (ballot[i].share === ballot[j].share) continue;
        total++;
        var voterPrefersI = ballot[i].share > ballot[j].share;
        var formulaPrefersI = ballot[i].score > ballot[j].score;
        if (voterPrefersI === formulaPrefersI) right++;
      }
    }
  });

  return { right: right, total: total, pct: (100 * right) / total };
}

// The MVP ballot is all scorers -- a defensive specialist never appears on it.
// The DPOY ballot is the one that can tell whether zeroing the block weight
// broke anything, because that is where those players live.
[
  { label: "MVP pusulasi", ballots: bySeason },
  { label: "DPOY pusulasi", ballots: ballotsFor("nba dpoy") },
].forEach(function (test) {
  var mine = agreement(WEIGHTS, test.ballots);
  var tuned = agreement(TUNED, test.ballots);

  console.log(test.label + " -- " + mine.total + " cift");
  console.log("  Bulut'un agirliklari :", (mine.right + "/" + mine.total).padEnd(11), "%" + mine.pct.toFixed(1));
  console.log("  Aranan agirliklar    :", (tuned.right + "/" + tuned.total).padEnd(11), "%" + tuned.pct.toFixed(1));
  console.log();
});
