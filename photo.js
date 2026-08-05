// Where a player's face comes from.
//
// player_id in the csv files is also the file name Basketball Reference gives
// his headshot, so every row already carries everything needed to find him --
// there is no lookup table here and none was needed.
//
// The photos are loaded straight from Basketball Reference rather than kept
// here. Copying five thousand of somebody else's images into a public repo is
// both bad git -- binaries never compress and never go away -- and not really
// ours to hand out. Pointing at the source costs nothing and copies nothing.
//
// If they ever stop answering, every face falls back to the silhouette below
// and the pages carry on. That is the whole cost of the decision.
var PHOTO_SOURCE =
  "https://www.basketball-reference.com/req/202106291/images/headshots/";

function photoUrl(row) {
  return PHOTO_SOURCE + row.player_id + ".jpg";
}

// One transparent pixel. A broken <img> is not empty -- the browser draws its
// own torn-page icon in the corner, and that icon lands on top of whatever css
// put behind it. Pointing the image at something that loads is what gets rid
// of it, and this is the smallest thing that loads.
var BLANK =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

// A quarter of the men in the pool have no photo at all -- mostly the ones
// nobody photographed in the first place. The element stays where it is and is
// only marked, so css can drop a silhouette into the hole and every card keeps
// the same height. A card that shrinks when a photo is missing breaks the row
// it sits in.
function photoTag(row, className) {
  return (
    "<img class='photo " + className + "'" +
    " src='" + photoUrl(row) + "'" +
    " alt=''" +
    " loading='lazy'" +
    " onerror='this.classList.add(\"is-blank\"); this.src=BLANK'>"
  );
}
