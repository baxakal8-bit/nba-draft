// Put several sets of weights through the same three tests.
//
//   node tools/compare.js
//
// The two published formulas score points differently from us -- they subtract
// shot attempts where we multiply points by eFG% -- so only their non-scoring
// weights are borrowed here. Their scale is close enough to ours for the
// comparison to mean something, but it is a borrowing, not a reproduction.

var fs = require("fs");
var path = require("path");

var ROOT = path.join(__dirname, "..");
eval(fs.readFileSync(path.join(ROOT, "score.js"), "utf8"));

var CANDIDATES = [
  {
    name: "Bulut (possession)",
    note: "derived from 1.15 points per possession",
    w: WEIGHTS,
  },
  {
    name: "MVP'ye gore ayarli",
    note: "found by tools/tune.js, aimed only at picking the MVP",
    w: { ast_per_game: 0.7, orb_per_game: 0.68, drb_per_game: 0.62, stl_per_game: 1.4, blk_per_game: 0, tov_per_game: -1.8 },
  },
  {
    name: "Game Score (Hollinger)",
    note: "ESPN, single-game productivity",
    w: { ast_per_game: 0.7, orb_per_game: 0.7, drb_per_game: 0.3, stl_per_game: 1.0, blk_per_game: 0.7, tov_per_game: -1.0 },
  },
  {
    name: "Win Score (Berri)",
    note: "regression against team wins",
    w: { ast_per_game: 0.5, orb_per_game: 1.0, drb_per_game: 1.0, stl_per_game: 1.0, blk_per_game: 0.5, tov_per_game: -1.0 },
  },
];

var MIN_GAMES = 50;

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

var groups = {};
readCsv("data/player-per-game.csv")
  .filter(function (r) {
    return r.lg === "NBA";
  })
  .forEach(function (row) {
    var key = row.player_id + "|" + row.season;
    (groups[key] = groups[key] || []).push(row);
  });

var rowFor = {};
var allRows = [];
Object.keys(groups).forEach(function (key) {
  var list = groups[key];
  var row =
    list.filter(function (r) {
      return /^\dTM$/.test(r.team);
    })[0] || list[0];
  rowFor[key] = row;
  allRows.push(row);
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

var mvpBallots = ballotsFor("nba mvp");
var dpoyBallots = ballotsFor("nba dpoy");

// Test 1: does it put the real MVP first, out of everyone who played enough?
function pickedTheWinner(weights) {
  var hits = 0;
  var total = 0;

  Object.keys(mvpBallots).forEach(function (season) {
    var winner = mvpBallots[season].slice().sort(function (a, b) {
      return b.share - a.share;
    })[0].player;

    var pool = allRows.filter(function (r) {
      return r.season === season && parseFloat(r.g) >= MIN_GAMES;
    });
    if (pool.length < 10) return;

    total++;
    var best = null;
    var bestScore = -Infinity;
    pool.forEach(function (r) {
      var s = rating(r, weights).score;
      if (s > bestScore) {
        bestScore = s;
        best = r.player;
      }
    });
    if (best === winner) hits++;
  });

  return hits + "/" + total;
}

// Tests 2 and 3: for every pair of players on a ballot, did the formula agree
// with the voters about which of the two was better?
function ballotAgreement(weights, ballots) {
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
        if (ballot[i].share > ballot[j].share === ballot[i].score > ballot[j].score) right++;
      }
    }
  });

  return (100 * right) / total;
}

console.log(
  "formul".padEnd(24) + "MVP 1.si".padEnd(11) + "MVP pusula".padEnd(13) + "DPOY pusula"
);
console.log("-".repeat(60));

CANDIDATES.forEach(function (c) {
  console.log(
    c.name.padEnd(24) +
      pickedTheWinner(c.w).padEnd(11) +
      ("%" + ballotAgreement(c.w, mvpBallots).toFixed(1)).padEnd(13) +
      "%" + ballotAgreement(c.w, dpoyBallots).toFixed(1)
  );
});
