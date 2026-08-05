// A tiny web server for this project.
//
//   node tools/serve.js
//
// Replaces `python3 -m http.server`. The pages fetch their CSV files, which a
// browser refuses to do from a file:// address, so a server was always
// needed. This one is written by hand for the second job: photos.
//
// A browser cannot write a downloaded file to disk. This can. The first time
// anybody asks for a headshot it is fetched from Basketball Reference and
// kept in data/headshots/; every time after that it is read off the disk and
// nothing leaves the machine. The folder fills up as the game is played,
// instead of being downloaded all at once up front.

var http = require("http");
var https = require("https");
var fs = require("fs");
var path = require("path");

var ROOT = path.join(__dirname, "..");
var PORT = 8000;

var PHOTOS = path.join(ROOT, "data", "headshots");

// player_id in the csv files is also the file name Basketball Reference gives
// a man's headshot, so there is no lookup table to build: jamesle01 is both.
var SOURCE =
  "https://www.basketball-reference.com/req/202106291/images/headshots/";

// Not decoration. A browser refuses to run a script served under the wrong
// type, and the pages are nothing but scripts.
var TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".jpg": "image/jpeg",
};

fs.mkdirSync(PHOTOS, { recursive: true });

http
  .createServer(function (req, res) {
    // Anything after a "?" is for the page to read, never part of a file name.
    var url = decodeURIComponent(req.url.split("?")[0]);
    if (url === "/") url = "/index.html";

    if (url.indexOf("/headshots/") === 0) {
      servePhoto(url.slice("/headshots/".length), res);
      return;
    }

    serveFile(url, res);
  })
  .listen(PORT);

function serveFile(url, res) {
  var file = path.join(ROOT, url);

  // The browser asks for a path and we turn it into a real one, so the
  // browser gets to choose which file is opened. "/../../.ssh/id_rsa" is a
  // request to leave the project, and join() will happily follow it. Check
  // that the answer still lives under ROOT, and refuse it if it does not.
  if (file.indexOf(ROOT + path.sep) !== 0) {
    res.writeHead(403);
    res.end("outside the project");
    return;
  }

  fs.readFile(file, function (error, body) {
    if (error) {
      res.writeHead(404);
      res.end("not found: " + url);
      return;
    }

    var type = TYPES[path.extname(file)] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    res.end(body);
  });
}

// --- headshots -------------------------------------------------------------

function servePhoto(name, res) {
  var id = name.replace(/\.jpg$/, "");

  // The id is about to become a file name, so it has to be an id and nothing
  // else. Same hole as above, and it does not get a second guard for free.
  if (!/^[a-z0-9]+$/.test(id)) {
    res.writeHead(400);
    res.end("not a player id");
    return;
  }

  var file = path.join(PHOTOS, id + ".jpg");
  var missing = path.join(PHOTOS, id + ".404");

  if (fs.existsSync(file)) {
    sendPhoto(file, res);
    return;
  }

  // A quarter of the men in the pool have no photo at all. Asking about them
  // again on every deal would be slow and rude, so a miss is remembered too.
  if (fs.existsSync(missing)) {
    res.writeHead(404);
    res.end("no photo");
    return;
  }

  fetchPhoto(id, file, missing, res);
}

function fetchPhoto(id, file, missing, res) {
  console.log("fetching " + id);

  var request = https.get(
    SOURCE + id + ".jpg",
    { headers: { "User-Agent": "Mozilla/5.0" } },
    function (upstream) {
      // Only a 404 means the photo does not exist. A 500 or a timeout means
      // the source is having a bad minute, and writing a marker for that
      // would turn one bad minute into a man who never has a face again.
      if (upstream.statusCode === 404) {
        upstream.resume();
        fs.writeFileSync(missing, "");
        res.writeHead(404);
        res.end("no photo");
        return;
      }

      if (upstream.statusCode !== 200) {
        upstream.resume();
        res.writeHead(502);
        res.end("source said " + upstream.statusCode);
        return;
      }

      // Written under a temporary name and renamed once it is whole. Killing
      // the server mid-download would otherwise leave half a jpeg on disk,
      // and half a jpeg looks exactly like a real one to the check above.
      var temp = file + ".tmp";
      var out = fs.createWriteStream(temp);

      upstream.pipe(out);

      out.on("finish", function () {
        fs.renameSync(temp, file);
        sendPhoto(file, res);
      });
    }
  );

  request.on("error", function (error) {
    res.writeHead(502);
    res.end("could not reach the source: " + error.message);
  });
}

function sendPhoto(file, res) {
  res.writeHead(200, {
    "Content-Type": "image/jpeg",
    "Cache-Control": "max-age=31536000",
  });
  fs.createReadStream(file).pipe(res);
}

console.log("serving " + ROOT + " on http://localhost:" + PORT);
