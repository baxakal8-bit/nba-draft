// The Score, box score half.
//
// This file is shared: index.html loads it for the page, and tools/tune.js
// loads it in node when searching for better weights. Keeping one copy means
// the weights being tested are always the weights the page actually uses.
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

// weights is optional. The page never passes it, so the page always scores
// with WEIGHTS above. tools/tune.js passes candidates while it searches.
function rating(row, weights) {
  var w = weights || WEIGHTS;
  var trbWeight = weights ? blendedRebound(weights) : TRB_WEIGHT;
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

  for (var key in w) {
    var value = number(row, key);

    if (value === null) {
      // Rebounds have a fallback; steals and blocks do not.
      if (key === "orb_per_game" || key === "drb_per_game") continue;
      missing.push(key);
      continue;
    }

    total += value * w[key];
  }

  // No split rebounds -- fall back to the total.
  if (number(row, "orb_per_game") === null && number(row, "trb_per_game") !== null) {
    total += number(row, "trb_per_game") * trbWeight;
  }

  return { score: Math.round(total * 10) / 10, missing: missing };
}

// The pre-1974 total-rebound weight has to move when the two rebound weights
// move, or a tuned formula would quietly score old seasons on stale numbers.
// 28% of rebounds are offensive in a typical season.
function blendedRebound(weights) {
  return 0.28 * weights.orb_per_game + 0.72 * weights.drb_per_game;
}
