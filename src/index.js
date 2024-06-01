const SpotifyWebApi = require("spotify-web-api-node");
const express = require("express");
require("dotenv").config();

var scopes = [
    "user-read-private",
    "user-read-email",
    "playlist-read-private",
    "playlist-modify-private",
    "playlist-modify-public",
    "playlist-read-collaborative",
    "user-library-read",
    "user-library-modify",
    "user-top-read",
    "user-read-recently-played",
    "user-follow-read",
    "user-follow-modify",
    "user-read-playback-state",
  ],
  state = "Authorized";

if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET || !process.env.REDIRECT_URI) {
  console.error("Please set the CLIENT_ID, CLIENT_SECRET, and REDIRECT_URI environment variables.");
  process.exit(1);
}

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  redirectUri: process.env.REDIRECT_URI,
});

// Create the authorization URL
var authorizeURL = spotifyApi.createAuthorizeURL(scopes, state, true);

if (!authorizeURL) {
  console.error("Something went wrong when retrieving the authorization URL!");
  process.exit(1);
}

require("child_process").exec(`start " " "${authorizeURL}"`);

const app = express();

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

let userData = {};

app.get("/authenticate", (req, response) => {
  spotifyApi
    .authorizationCodeGrant(req.query.code)
    .then((res, err) => {
      if (err) {
        console.log("Something went wrong when retrieving the access token!", err);
      }
      console.log("Spotify Authenticated!");

      // Set the access token on the API object to use it in later calls
      spotifyApi.setAccessToken(res.body["access_token"]);
      spotifyApi.setRefreshToken(res.body["refresh_token"]);
    })
    .then(() => {
      spotifyApi.getMe().then((data) => {
        userData.me = data.body;
        response.redirect("/");
      });
    });
});

app.get("/dashboard", (req, response) => {
  response.send(`
  <h1>Spotify API</h1>
  <p>Successfully authorized</p>
  </hr>
  <div id="userProfile">
      <h2 id="displayName"><strong>Display Name:</strong> ${userData.me.display_name}</h2>
      <a id="spotifyLink" href="${userData.me.external_urls.spotify}"><strong>Profile Link:</strong> Spotify Profile</a>
      </br>
      <img id="profileImage" src="${userData.me.images[1].url}" alt="Profile Image" height="64" width="64"/>
      <p id="userType"><strong>Type:</strong> ${userData.me.type}</p>
      <p id="followers"><strong>Follower Count:</strong> ${userData.me.followers.total}</p>
      <p id="country"><strong>Country Code:</strong> ${userData.me.country}</p>
      <p id="product"><strong>Account Subscription:</strong> ${userData.me.product}</p>
      <p id="email"><strong>Email: </strong> ${userData.me.email}</p>
      </hr>
      <button class="btn btn-primary" hx-get="/playlists" hx-trigger="click" hx-target="#panel" hx-swap="innerHTML">View My Playlists</button>
      </br>
      </br>
      <button class="btn btn-primary" hx-get="/top-artists" hx-trigger="click" hx-target="#panel" hx-swap="innerHTML">View My Top Artists</button>
    </div>
    <div id="panel">
    </div>
  `);
});

app.get("/playlists", (req, response) => {
  spotifyApi.getUserPlaylists(userData.me.id).then(
    function (data) {
      userData.playlists = data.body;
      let playlistResponse = `
      <div class="container mt-4">
        <div class="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-4">`;
      for (let i = 0; i < userData.playlists.items.length; i++) {
        let playlist = userData.playlists.items[i];
        playlistResponse += `
          <div class="col col-md-4">
            <div class="card h-100">
              <img src="${playlist.images[0]?.url}" class="card-img-top" alt="${playlist.name}">
              <div class="card-body">
                <h5 class="card-title">${playlist.name}</h5>
                <p class="card-text">${playlist.description}</p>
                <p class="card-text"><small class="text-muted">${playlist.tracks.total} tracks</small></p>
                <button class="btn btn-info" hx-get="/playlist/${playlist.id}" hx-trigger="click" hx-target="#playlistModal" data-bs-toggle="modal" data-bs-target="#playlistModal">View Playlist</button>
              </div>
            </div>
          </div>`;
      }
      playlistResponse += `
        </div>
      </div>
      <div id="playlistModal" class="modal modal-blur fade" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-centered" role="document">
          <div class="modal-content"></div>
        </div>
      </div>`;
      response.send(playlistResponse);
    },
    function (err) {
      console.log("Something went wrong!", err);
    }
  );
});

app.get("/playlist/:id", (req, response) => {
  spotifyApi.getPlaylist(req.params.id).then(
    function (data) {
      let playlist = data.body;

      let playlistResponse = `
      <div class="modal-dialog modal-xl modal-dialog-centered" style="min-width: 100%;">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">${playlist.name}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body" style="max-height: calc(100vh - 210px); overflow-y: auto;">
            <div class="container">
              <div class="row mb-4">
                <div class="col-md-4">
                  <img src="${playlist.images[0]?.url}" class="img-fluid rounded-start" alt="${playlist.name}">
                </div>
                <div class="col-md-8">
                  <h5>${playlist.name}</h5>
                  <p>${playlist.description}</p>
                  <p><strong>Created by:</strong> ${playlist.owner.display_name}</p>
                  <p><strong>Total Tracks:</strong> ${playlist.tracks.total}</p>
                </div>
              </div>
            </div>
            <div class="container-fluid">
              <div class="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-5 g-4">`;

      playlist.tracks.items.forEach((track, index) => {
        playlistResponse += `
                <div class="col">
                  <div class="card h-100">
                    <img src="${track.track.album.images[0]?.url}" class="card-img-top" alt="${track.track.album.name}">
                    <div class="card-body">
                      <h5 class="card-title">${index + 1}. ${track.track.name}</h5>
                      <p class="card-text"><strong>Artist:</strong> ${track.track.artists[0].name}</p>
                      <p class="card-text"><strong>Album:</strong> ${track.track.album.name}</p>
                      <p class="card-text"><strong>Release Date:</strong> ${track.track.album.release_date}</p>
                      <p class="card-text"><strong>Duration:</strong> ${formatMilliseconds(track.track.duration_ms)}</p>
                      <audio src="${track.track.preview_url}" controls crossorigin="anonymous" class="w-100 mt-2"></audio>
                    </div>
                  </div>
                </div>`;
      });

      playlistResponse += `
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
          </div>
        </div>
      </div>`;

      response.send(playlistResponse);
    },
    function (err) {
      console.log("Something went wrong!", err);
    }
  );
});

app.get("/top-artists", (req, response) => {
  spotifyApi.getMyTopArtists().then(
    function (data) {
      // console.log("Retrieved top artists", data.body);
      userData.topArtists = data.body;
      let topArtistsResponse = `
      <div class="container mt-4">
        <div class="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-4">`;

      userData.topArtists.items.forEach((artist) => {
        topArtistsResponse += `
          <div class="col">
            <div class="card h-100">
              <img src="${artist.images[0]?.url}" class="card-img-top" alt="${artist.name}">
              <div class="card-body">
                <h5 class="card-title">${artist.name}</h5>
                <p class="card-text"><strong>Genres:</strong> ${artist.genres.join(", ")}</p>
                <p class="card-text"><strong>Popularity:</strong> ${artist.popularity}</p>
                <button class="btn btn-info w-100" hx-get="/artist/${artist.id}" hx-trigger="click" hx-target="#artistModal" data-bs-toggle="modal" data-bs-target="#artistModal">View Artist</button>
              </div>
            </div>
          </div>`;
      });

      topArtistsResponse += `
        </div>
      </div>
      <div id="artistModal" class="modal modal-blur fade" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-centered" role="document">
          <div class="modal-content"></div>
        </div>
      </div>`;

      response.send(topArtistsResponse);
    },
    function (err) {
      console.log("Something went wrong!", err);
    }
  );
});

app.get("/artist/:id", (req, response) => {
  spotifyApi.getArtist(req.params.id).then(
    function (data) {
      let artist = data.body;
      let artistResponse = ` <div class="modal-dialog modal-lg modal-dialog-centered" style="min-width: 60%;">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">${artist.name}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body" style="max-height: calc(100vh - 210px); overflow-y: auto;">
            <div class="card">
              <img src="${artist.images[0]?.url}" class="card-img-top" alt="${artist.name}" />
              <div class="card-body">
                <h5 class="card-title">Genres:</h5>
                <p class="card-text">${artist.genres.join(", ")}</p>
                <h5 class="card-title">Popularity:</h5>
                <p class="card-text">${artist.popularity}</p>
                <h5 class="card-title">Followers:</h5>
                <p class="card-text">${artist.followers.total.toLocaleString()}</p>
                <a href="${artist.external_urls.spotify}" class="btn btn-primary" target="_blank">View on Spotify</a>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
          </div>
        </div>
      </div>`;
      response.send(artistResponse);
    },
    function (err) {
      console.log("Something went wrong!", err);
    }
  );
});

app.get("/recommendations", (req, response) => {
  spotifyApi.getMyTopArtists({ limit: 50 }).then((res, err) => {
    if (err) {
      console.log("Something went wrong when retrieving the access token!", err);
    }
    let artists = res.body.items;
    let recResponse = `
  <h1>Spotify API</h1>
  <p style="color: green;">Successfully authorized</p>
  <hr>
  <h3>Recommendation Engine</h3>
  <h4>Pick 5 artist and/or genres:</h4>
  <form hx-post="/get-recommendations" hx-target="#result">
  <h4>Your Top Artists:</h4>
  <div class="mb-3" style="max-height: 300px; padding: 15px; border: 3px gray solid; border-radius: 15px 15px 15px 15px; overflow-y: auto;">
`;

    // Iterate through artists and add them as options
    artists.forEach((artist) => {
      recResponse += `
      <label class="form-check-label" for="${artist.id}" style="font-size: 18px">
      <span class="badge bg-secondary">
      <input class="form-check-input" type="checkbox" value="${artist.id}" id="${artist.id}" name="artists">
      ${artist.name}
      </span>
      </label>
      `;
    });

    spotifyApi.getAvailableGenreSeeds().then((res, err) => {
      if (err) {
        console.log("Something went wrong when retrieving the access token!", err);
      }
      let genres = res.body.genres;
      recResponse += `
      </div>
      <hr>
      <h4>Available Genres:</h4>
      <div class="mb-3" style="max-height: 300px; padding: 15px; border: 3px gray solid; border-radius: 15px 15px 15px 15px; overflow-y: auto;">
      `;

      // Iterate through genres and add them as options
      genres.forEach((genre) => {
        recResponse += `
      <label class="form-check-label" for="${genre}" style="font-size: 18px">
      <span class="badge bg-secondary">
      <input class="form-check-input" type="checkbox" value="${genre}" id="${genre}" name="genres">
      ${genre.charAt(0).toUpperCase() + genre.slice(1)}
      </span>
      </label>
      `;
      });

      recResponse += `
      </div>
      <hr>
      <label for="limit" class="form-label">
      Track limit:
      <input type="number" class="form-control" id="limit" name="limit" min="1" max="100" value="20">
      </label>
      </br>
      </br>
      <button type="submit" class="btn btn-primary">Generate Tracks</button>
      </form>
      </br>
      </br>
      <div id="result">
      </div>
      `;

      response.send(recResponse);
    });
  });
});

app.post("/get-recommendations", (req, response) => {
  let artistsLength = 0;
  let genresLength = 0;

  if (req.body.artists == undefined && req.body.genres == undefined) {
    response.send(`<h3 style="color: red">Please select at least 1 artist and/or genre.</h3>`);
    return;
  }

  if (artistsLength + genresLength > 5) {
    response.send(`<h3 style="color: red">Please select 5 or less artists and/or genres.</h3>`);
    return;
  }

  // Check if artists and genres are defined and have a length property
  if (Array.isArray(req.body.artists)) {
    artistsLength = req.body.artists.length;
  }
  if (Array.isArray(req.body.genres)) {
    genresLength = req.body.genres.length;
  }

  // Sum the lengths and check if the total is greater than 5
  let artists = req.body.artists;
  let genres = req.body.genres;
  let limit = req.body.limit;
  let seed = {
    seed_artists: artists,
    seed_genres: genres,
    limit: limit,
  };
  spotifyApi.getRecommendations(seed).then((res, err) => {
    if (err) {
      console.log("Something went wrong when retrieving the access token!", err);
    }
    let recommendations = res.body;
    let tracks = recommendations.tracks;
    let trackURIS = [];
    let recResponse = `
    <h3>Recommended Playlist:</h3>
    <div class="container">
      <div class="list-group">`;

    tracks.forEach((track, index) => {
      trackURIS.push(track.uri);
      let artists = track.artists.map((artist) => artist.name).join(", ");
      recResponse += `
      <div class="list-group-item list-group-item-action d-flex gap-3 py-3" aria-current="true">
        <img src="${track.album.images[0]?.url}" alt="${track.album.name}" class="rounded" style="width: 100px; height: 100px; object-fit: cover;">
        <div class="d-flex gap-2 w-100 justify-content-between">
          <div>
            <h5 class="mb-0">${index + 1}. ${track.name}</h5>
            <p class="mb-1"><strong>Artist:</strong> ${artists}</p>
            <p class="mb-1"><strong>Album:</strong> ${track.album.name}</p>
            <p class="mb-1"><strong>Release Date:</strong> ${track.album.release_date}</p>
            <p class="mb-1"><strong>Duration:</strong> ${formatMilliseconds(track.duration_ms)}</p>
          </div>
          <audio src="${track.preview_url}" controls class="align-self-center"></audio>
        </div>
      </div>`;
    });

    recResponse += `
      </div>
    </div>
    <hr>
    <h4>Save Playlist:</h4>
    <form hx-post="/create-playlist" hx-target="#recModal">
    <div class="mb-3" style="max-height: 300px; padding: 15px; border: 3px gray solid; border-radius: 15px; overflow-y: auto;">
      <label for="playlistName" class="form-label">
      Playlist Name:
      <input type="text" class="form-control" id="playlistName" name="playlistName">
      </label>
      </br>
      <label for="playlistDescription" class="form-label">
      Playlist Description(?):
      <input type="text" class="form-control" id="playlistDescription" name="playlistDescription">
      </label>
      </br>
      <label for="playlistPublic" class="form-label">
      Public Playlist(?):
      <input type="checkbox" class="form-check-input" id="playlistPublic" name="playlistPublic">
      </label>
      </br>
      <label for="playlistCollaborative" class="form-label">
      Collaborative Playlist(?):
      <input type="checkbox" class="form-check-input" id="playlistCollaborative" name="playlistCollaborative">
      </label>
      </br>
      <input type="hidden" name="tracks" value="${encodeURIComponent(JSON.stringify(trackURIS))}">
      <input type="hidden" name="userId" value="${userData.me.id}">
      <button type="submit" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#recModal">Save Playlist</button>
    </div>
    </form>
    <div id="recModal" class="modal modal-blur fade" style="display: none;" aria-hidden="false" tabindex="-1">
        <div class="modal-dialog modal-lg modal-dialog-centered" style="min-width: 60%;" role="dialog">
            <div class="modal-content"></div>
        </div>
    </div>
    `;
    response.send(recResponse);
  });
});

app.post("/create-playlist", (req, response) => {
  if (req.body.playlistName == "") {
    response.send(`<h3 style="color: red">Please enter a playlist name.</h3>`);
    return;
  }
  if (req.body.playlistDescription == "") {
    response.send(`<h3 style="color: red">Please enter a playlist description.</h3>`);
    return;
  }
  if (req.body.playlistPublic == undefined) {
    req.body.playlistPublic = false;
  }
  if (req.body.playlistCollaborative == undefined) {
    req.body.playlistCollaborative = false;
  }
  spotifyApi.createPlaylist(req.body.playlistName, { description: req.body.playlistDescription, public: req.body.playlistPublic, collaborative: req.body.playlistCollaborative }).then((res, err) => {
    if (err) {
      console.log("Something went wrong when retrieving the access token!", err);
    }
    let playlist = res.body;
    let trackIds = JSON.parse(decodeURIComponent(req.body.tracks));
    spotifyApi.addTracksToPlaylist(playlist.id, trackIds).then((res, err) => {
      if (err) {
        console.log("Something went wrong when retrieving the access token!", err);
      }
      response.send(`
      <div class="modal-dialog modal-lg modal-dialog-centered style="min-width: 60%;">
      <div class="modal-content">
      <div class="modal-header">
      <h3 class="modal-title" style="color: green;">Playlist Created!</h3>
      <h5 class="modal-title">Name: ${playlist.name}</h5>
      </div>
      <div class="modal-body" style="max-height: calc(100vh - 210px);overflow-y: auto;">
      <div class="card">
      <div class="card-body">
      <h5 class="card-title">Description:</h5>
      <p class="card-text">${playlist.description}</p>
      <br>
      <h5 class="card-title">Public:</h5>
      <p class="card-text">${playlist.public}</p>
      <br>
      <h5 class="card-title">Collaborative:</h5>
      <p class="card-text">${playlist.collaborative}</p>
      </div>
      </div>
      <div class="modal-footer">
      <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
      </div>
      </div>
      </div>
      `);
    });
  });
});

app.listen(5500, () => {
  console.log("App started, listening on port 5500.");
});

function formatMilliseconds(milliseconds) {
  // Convert milliseconds to seconds
  const totalSeconds = Math.floor(milliseconds / 1000);

  // Extract minutes and seconds
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;

  // Format minutes and seconds to have two digits
  const formattedMins = mins.toString().padStart(2, "0");
  const formattedSecs = secs.toString().padStart(2, "0");

  // Return the formatted time
  return `${formattedMins}:${formattedSecs}`;
}
