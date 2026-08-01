// Search for box score weights that agree with MVP voting more often.
//
//   node tools/tune.js
//
// The seasons are split in two. Weights are searched on one half and then
// scored on the other half, which the search never saw. The gap between those
// two numbers is the point of this tool: a formula bent to fit the seasons it
// was shown will look better on them than it really is.
//
// Only rating() is used here -- never the MVP bonus from main.js. Tuning a
// formula against MVP voting while MVP voting is an input would be measuring
// nothing.

var fs = require("fs");
var path = require("path");

var ROOT = path.join(__dirname, "..");
eval(fs.readFileSync(path.join(ROOT, "score.js"), "utf8"));

var MIN_GAMES = 50;
var KEYS = [
  "ast_per_game",
  "orb_per_game",
  "drb_per_game",
  "stl_per_game",
  "blk_per_game",
  "tov_per_game",
];

// --- Loading ---------------------------------------------------------------

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

// A player traded mid-season has one row per team plus a combined "2TM" row.
// Keep the combined one, same rule the page uses.
function oneRowPerPlayerSeason(rows) {
  var groups = {};
  rows.forEach(function (row) {
    var key = row.player_id + "|" + row.season;
    (groups[key] = groups[key] || []).push(row);
  });
  return Object.keys(groups).map(function (key) {
    var list = groups[key];
    return (
      list.filter(function (r) {
        return /^\dTM$/.test(r.team);
      })[0] || list[0]
    );
  });
}

// Turn each player-season into a fixed vector, so scoring a candidate set of
// weights is a dot product instead of re-parsing strings 30,000 times.
function toFeatures(row) {
  var pts = number(row, "pts_per_game");
  var efg = effectiveFg(row);
  var base = pts === null || efg === null ? 0 : pts * efg;

  var orb = number(row, "orb_per_game");
  var drb = number(row, "drb_per_game");

  // Pre-1974 seasons only have total rebounds. Splitting them 28/72 here is
  // exactly what rating() does with its blended fallback weight.
  if (orb === null || drb === null) {
    var trb = number(row, "trb_per_game") || 0;
    orb = 0.28 * trb;
    drb = 0.72 * trb;
  }

  return {
    player: row.player,
    base: base,
    v: [
      number(row, "ast_per_game") || 0,
      orb,
      drb,
      number(row, "stl_per_game") || 0,
      number(row, "blk_per_game") || 0,
      number(row, "tov_per_game") || 0,
    ],
  };
}

var perGame = oneRowPerPlayerSeason(
  readCsv("data/player-per-game.csv").filter(function (r) {
    return r.lg === "NBA";
  })
);

var mvpVotes = readCsv("data/player-award-shares.csv").filter(function (r) {
  return r.award === "nba mvp";
});

// One entry per season: the pool of eligible players, and who really won.
var winnerBySeason = {};
mvpVotes.forEach(function (r) {
  var best = winnerBySeason[r.season];
  if (!best || parseFloat(r.share) > best.share) {
    winnerBySeason[r.season] = { player: r.player, share: parseFloat(r.share) };
  }
});

var seasons = [];
Object.keys(winnerBySeason)
  .sort()
  .forEach(function (season) {
    var pool = perGame
      .filter(function (r) {
        return r.season === season && parseFloat(r.g) >= MIN_GAMES;
      })
      .map(toFeatures);

    if (pool.length < 10) return;
    seasons.push({ season: season, pool: pool, winner: winnerBySeason[season].player });
  });

// --- Scoring a candidate ---------------------------------------------------

// Returns how many seasons the weights put the real MVP first, and the mean
// rank it gave him. The rank is only a tie-breaker: two weight sets that both
// win 20 seasons are not equally good if one keeps the MVP 2nd and the other
// buries him 9th.
function evaluate(weights, set) {
  var w = KEYS.map(function (k) {
    return weights[k];
  });
  var hits = 0;
  var rankSum = 0;

  set.forEach(function (entry) {
    var bestScore = -Infinity;
    var bestPlayer = null;
    var winnerScore = -Infinity;

    entry.pool.forEach(function (p) {
      var s = p.base;
      for (var i = 0; i < 6; i++) s += p.v[i] * w[i];
      if (s > bestScore) {
        bestScore = s;
        bestPlayer = p.player;
      }
      if (p.player === entry.winner && s > winnerScore) winnerScore = s;
    });

    if (bestPlayer === entry.winner) hits++;

    var rank = 1;
    entry.pool.forEach(function (p) {
      var s = p.base;
      for (var i = 0; i < 6; i++) s += p.v[i] * w[i];
      if (s > winnerScore) rank++;
    });
    rankSum += rank;
  });

  return { hits: hits, of: set.length, meanRank: rankSum / set.length };
}

function objective(weights, set) {
  var r = evaluate(weights, set);
  return r.hits - r.meanRank / 1000;
}

// --- The search ------------------------------------------------------------

var BOUNDS = {
  ast_per_game: [0, 5],
  orb_per_game: [0, 5],
  drb_per_game: [0, 5],
  stl_per_game: [0, 6],
  blk_per_game: [0, 6],
  tov_per_game: [-6, 0],
};

function clamp(key, value) {
  var b = BOUNDS[key];
  return Math.max(b[0], Math.min(b[1], value));
}

// Walk one weight at a time, keep any change that helps, then take smaller
// steps and go round again. Simple, and easy to explain -- which matters more
// here than squeezing out the last tenth of a point.
function hillClimb(start, set) {
  var best = Object.assign({}, start);
  var bestScore = objective(best, set);

  [1.0, 0.5, 0.25, 0.1, 0.05].forEach(function (step) {
    var improved = true;
    while (improved) {
      improved = false;
      KEYS.forEach(function (key) {
        [step, -step].forEach(function (delta) {
          var candidate = Object.assign({}, best);
          candidate[key] = clamp(key, candidate[key] + delta);
          var score = objective(candidate, set);
          if (score > bestScore) {
            best = candidate;
            bestScore = score;
            improved = true;
          }
        });
      });
    }
  });

  return best;
}

// A fixed sequence, so two runs of this tool give the same answer.
var seed = 20260802;
function random() {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}

function randomStart() {
  var w = {};
  KEYS.forEach(function (key) {
    var b = BOUNDS[key];
    w[key] = b[0] + random() * (b[1] - b[0]);
  });
  return w;
}

// --- Run -------------------------------------------------------------------

// Alternate seasons rather than cutting the timeline in half, so both sets
// hold old and new basketball. Splitting 1956-1990 against 1991-2025 would
// tune on one sport and test on another.
var tuneSet = seasons.filter(function (_, i) {
  return i % 2 === 0;
});
var testSet = seasons.filter(function (_, i) {
  return i % 2 === 1;
});

function report(label, weights) {
  var a = evaluate(weights, tuneSet);
  var b = evaluate(weights, testSet);
  var all = evaluate(weights, seasons);
  console.log(
    label.padEnd(26) +
      "tune " + (a.hits + "/" + a.of).padEnd(8) +
      "test " + (b.hits + "/" + b.of).padEnd(8) +
      "hepsi " + (all.hits + "/" + all.of).padEnd(8) +
      "MVP ort. sira " + all.meanRank.toFixed(2)
  );
}

console.log("sezon:", seasons.length, "| tune:", tuneSet.length, "| test:", testSet.length);
console.log();

report("Bulut'un agirliklari", WEIGHTS);

var best = hillClimb(WEIGHTS, tuneSet);
var bestScore = objective(best, tuneSet);

for (var i = 0; i < 12; i++) {
  var candidate = hillClimb(randomStart(), tuneSet);
  var score = objective(candidate, tuneSet);
  if (score > bestScore) {
    best = candidate;
    bestScore = score;
  }
}

report("Aranan en iyi", best);

console.log();
console.log("Bulunan agirliklar:");
KEYS.forEach(function (key) {
  var was = WEIGHTS[key];
  var now = Math.round(best[key] * 100) / 100;
  console.log(
    "  " + key.replace("_per_game", "").padEnd(5) +
      String(was).padStart(7) + "  ->" + String(now).padStart(7) +
      (Math.abs(now - was) < 0.05 ? "   (ayni)" : "")
  );
});
