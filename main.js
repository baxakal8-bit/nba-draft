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

// score.js holds the box score weights and rating().
// data.js loads the files and adds the awards, honours and Win Shares on top.
// This file is only the comparison page.

loadData()
  .then(function () {
    fillPlayerList();
    document.getElementById("status").hidden = true;
    document.getElementById("pickers").hidden = false;
    document.getElementById("compare").hidden = false;
  })
  .catch(function (error) {
    document.getElementById("status").textContent = "Could not load data: " + error.message;
  });

// --- The two pickers -------------------------------------------------------

// Suggestions stay hidden until this many characters are typed. With ~4900
// names, anything shorter matches half the league and helps nobody.
var MIN_CHARS = 3;
var MAX_SUGGESTIONS = 20;

// { a: { name: dropdown, season: dropdown }, b: {...} }
var pickers = {};

function fillPlayerList() {
  // Sorted by how long a career the player had. There is no fame column in
  // the data, but games played is a fair stand-in: the Jordan you are typing
  // is the one who played 1072 games, not the one who played 30.
  var names = Object.keys(playersByName)
    .map(function (name) {
      var games = 0;
      playersByName[name].forEach(function (row) {
        games += number(row, "g") || 0;
      });
      return { value: name, label: name, games: games };
    })
    .sort(function (a, b) {
      if (b.games !== a.games) return b.games - a.games;
      return a.label < b.label ? -1 : 1;
    });

  ["a", "b"].forEach(function (side) {
    var name = createDropdown(document.getElementById("name-" + side), {
      editable: true,
      placeholder: "Type a player",
      minChars: MIN_CHARS,
      maxVisible: MAX_SUGGESTIONS,
      onSelect: function () {
        fillSeasons(side);
        render();
      },
    });

    var season = createDropdown(document.getElementById("season-" + side), {
      editable: false,
      placeholder: "Season",
      onSelect: render,
    });

    season.disable(true);
    name.setItems(names);
    pickers[side] = { name: name, season: season };
  });
}

function fillSeasons(side) {
  var seasons = playersByName[pickers[side].name.getValue()];
  var box = pickers[side].season;

  if (!seasons) {
    box.setItems([]);
    box.disable(true);
    return;
  }

  box.setItems(
    seasons
      .slice()
      .sort(function (a, b) {
        return b.season - a.season; // newest first
      })
      .map(function (row) {
        return { value: row.season, label: row.season + " " + row.team };
      })
  );
  box.disable(false);
}

// --- Showing the comparison ------------------------------------------------

function findSeason(side) {
  var seasons = playersByName[pickers[side].name.getValue()];
  if (!seasons) return null;

  var season = pickers[side].season.getValue();
  return seasons.filter(function (row) {
    return row.season === season;
  })[0];
}

function playerHeading(row) {
  if (!row) return "—";
  // The face first. Two names side by side is a table; two faces side by side
  // is a match-up, which is what this page is actually for.
  return (
    photoTag(row, "compare-photo") +
    row.player +
    "<span class='season'>" + row.season + " " + row.team + "</span>"
  );
}

function formatPlace(place) {
  // Two kinds of nothing -- the honour did not exist that season (null), or
  // it did and he was not picked ("") -- and one dash for both, because the
  // page already uses a dash wherever there is nothing to report. The word
  // "no" sat in the row looking like an answer to a question nobody asked.
  if (place === null || place === "") return "—";
  return place + " team";
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

  document.getElementById("head-a").innerHTML = playerHeading(a);
  document.getElementById("head-b").innerHTML = playerHeading(b);

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

  HONOURS.forEach(function (h) {
    var placeA = a ? honour(a, h.type) : null;
    var placeB = b ? honour(b, h.type) : null;

    // Nothing to say when neither player made the team.
    if (!placeA && !placeB) return;

    var row = document.createElement("tr");
    row.innerHTML =
      "<td>" + formatPlace(placeA) + "</td>" +
      "<td class='stat-name'>" + h.label + "</td>" +
      "<td>" + formatPlace(placeB) + "</td>";

    var valueA = placeA ? h.bonus[placeA] || 0 : 0;
    var valueB = placeB ? h.bonus[placeB] || 0 : 0;
    if (valueA > valueB) row.children[0].className = "better";
    if (valueB > valueA) row.children[2].className = "better";

    body.appendChild(row);
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

  var totalA = scoreA
    ? Math.round((scoreA.score + awardBonus(a) + honourBonus(a) + (wsA || 0) * WS_WEIGHT) * 10) / 10
    : null;
  var totalB = scoreB
    ? Math.round((scoreB.score + awardBonus(b) + honourBonus(b) + (wsB || 0) * WS_WEIGHT) * 10) / 10
    : null;

  var tr = document.createElement("tr");
  tr.className = "rating-row";
  tr.innerHTML =
    "<td>" + (totalA === null ? "—" : totalA) + "</td>" +
    // What the Score is, kept out of the way until asked for. It was a
    // paragraph under the table, which meant everyone read it once and then
    // scrolled past it forever. On the word itself it is there the moment you
    // wonder what the number means.
    "<td class='stat-name'>" +
      "<span class='explained'>Score" +
        "<span class='explains'>" +
          "The points a player generates minus the points he gives away, " +
          "with scoring weighted by how efficiently he shot. He also gets " +
          "credit for how the season's awards went — MVP and Defensive " +
          "Player of the Year votes, All-NBA and All-Defensive teams — and " +
          "for his Win Shares, meaning how many of his team's wins were " +
          "his own." +
        "</span>" +
      "</span>" +
    "</td>" +
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

// The dropdowns carry their own wiring: fillPlayerList() builds them once the
// data has loaded, and each one calls back into render() when it changes.
