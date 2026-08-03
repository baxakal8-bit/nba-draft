// A final score, read as a season.
//
// A number on its own says nothing. 134 is meaningless until you are told it
// is a 55 win team, and 55 wins is meaningless until you are told that was
// the 2018 Warriors. So every score is turned into a record, and every record
// into the team that actually went that far.
//
// One team per win total, taken from data/team-summaries.csv: of everybody
// who finished on that many wins, the most recent, because a team you have
// watched means more than one you have to look up.
//
// It started as a hand written list and 29 of the 63 lines were wrong -- the
// 2015 Jazz down as 28-54 when they went 38-44, the 2023 Celtics as 52-30
// when they went 57-25. Checking it against the real table is the only reason
// the game does not now confidently name the wrong team. The one thing the
// list got right was that nobody has ever won 70 or 71 games, so the ladder
// jumps from 69 to 72.
var RECORDS = [
  [9, "1972-73 Philadelphia 76ers"],
  [10, "2015-16 Philadelphia 76ers"],
  [11, "1997-98 Denver Nuggets"],
  [12, "2009-10 New Jersey Nets"],
  [13, "2004-05 Atlanta Hawks"],
  [14, "2023-24 Detroit Pistons"],
  [15, "2023-24 Washington Wizards"],
  [16, "2014-15 Minnesota Timberwolves"],
  [17, "2025-26 Washington Wizards"],
  [18, "2024-25 Washington Wizards"],
  [19, "2025-26 Indiana Pacers"],
  [20, "2025-26 Brooklyn Nets"],
  [21, "2024-25 New Orleans Pelicans"],
  [22, "2025-26 Sacramento Kings"],
  [23, "2021-22 Detroit Pistons"],
  [24, "2024-25 Philadelphia 76ers"],
  [25, "2025-26 Memphis Grizzlies"],
  [26, "2025-26 Dallas Mavericks"],
  [27, "2023-24 Memphis Grizzlies"],
  [28, "2017-18 Brooklyn Nets"],
  [29, "2018-19 Atlanta Hawks"],
  [30, "2024-25 Toronto Raptors"],
  [31, "2025-26 Chicago Bulls"],
  [32, "2025-26 Milwaukee Bucks"],
  [33, "2022-23 Portland Trail Blazers"],
  [34, "2024-25 San Antonio Spurs"],
  [35, "2022-23 Indiana Pacers"],
  [36, "2024-25 Phoenix Suns"],
  [37, "2025-26 Golden State Warriors"],
  [38, "2022-23 Dallas Mavericks"],
  [39, "2024-25 Chicago Bulls"],
  [40, "2024-25 Atlanta Hawks"],
  [41, "2024-25 Orlando Magic"],
  [42, "2025-26 Los Angeles Clippers"],
  [43, "2025-26 Miami Heat"],
  [44, "2025-26 Charlotte Hornets"],
  [45, "2025-26 Orlando Magic"],
  [46, "2025-26 Atlanta Hawks"],
  [47, "2023-24 Indiana Pacers"],
  [48, "2024-25 Golden State Warriors"],
  [49, "2025-26 Minnesota Timberwolves"],
  [50, "2024-25 Denver Nuggets"],
  [51, "2024-25 New York Knicks"],
  [52, "2025-26 Cleveland Cavaliers"],
  [53, "2025-26 Los Angeles Lakers"],
  [54, "2025-26 Denver Nuggets"],
  [55, "2017-18 Boston Celtics"],
  [56, "2025-26 Boston Celtics"],
  [57, "2023-24 Denver Nuggets"],
  [58, "2022-23 Milwaukee Bucks"],
  [59, "2017-18 Toronto Raptors"],
  [60, "2025-26 Detroit Pistons"],
  [61, "2024-25 Boston Celtics"],
  [62, "2025-26 San Antonio Spurs"],
  [63, "2005-06 San Antonio Spurs"],
  [64, "2025-26 Oklahoma City Thunder"],
  [65, "2017-18 Houston Rockets"],
  [66, "2012-13 Miami Heat"],
  [67, "2016-17 Golden State Warriors"],
  [68, "2024-25 Oklahoma City Thunder"],
  [69, "1996-97 Chicago Bulls"],
  [72, "1995-96 Chicago Bulls"],
  [73, "2015-16 Golden State Warriors"],
];

var GAMES = 82;

// Three anchors, and straight lines between them.
//
//   55 -> 9 wins    the worst season anybody has had
//   96 -> 41 wins   dead average, and what random picking scores
//  175 -> 73 wins   hard, but a run that can actually happen
//
// The two halves have different slopes on purpose. Below average a point is
// worth 0.78 wins and above it only 0.41, because the top is meant to be a
// climb: 50 wins is the bargain hunter's ordinary day, 73 is not.
//
// The top anchor was 185 first, which was the best score ever measured. That
// turned out to be the wrong place for it: the perfect lineup the whole league
// could make is 203.9, but you only ever see fifteen cards a round, and three
// thousand robot runs topped out at 169.7. A target nobody reaches is not a
// target. 175 is above every run so far and below what a lucky one could do.
var ANCHORS = [
  { score: 55, wins: 9 },
  { score: 96, wins: 41 },
  { score: 175, wins: 73 },
];

function winsFor(score) {
  var low = ANCHORS[0];
  var high = ANCHORS[ANCHORS.length - 1];

  if (score <= low.score) return low.wins;
  if (score >= high.score) return high.wins;

  for (var i = 1; i < ANCHORS.length; i++) {
    var b = ANCHORS[i];
    var a = ANCHORS[i - 1];
    if (score > b.score) continue;

    var share = (score - a.score) / (b.score - a.score);
    return Math.round(a.wins + share * (b.wins - a.wins));
  }

  return high.wins;
}

// The nearest record anybody actually finished with -- which is how 70 and 71
// are skipped without a special case.
function seasonFor(score) {
  var wins = winsFor(score);
  var best = RECORDS[0];

  RECORDS.forEach(function (entry) {
    if (Math.abs(entry[0] - wins) < Math.abs(best[0] - wins)) best = entry;
  });

  return { wins: best[0], losses: GAMES - best[0], team: best[1] };
}
