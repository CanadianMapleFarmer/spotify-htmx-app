const SpotifyWebApi = require("spotify-web-api-node");
const express = require("express");
const process = require("process");

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
  redirectUri = "http://localhost:5500/authenticate",
  clientId = process.env.CLIENT_ID,
  clientSecret = process.env.CLIENT_SECRET,
  state = "Authorized";

// Setting credentials can be done in the wrapper's constructor, or using the API object's setters.
var spotifyApi = new SpotifyWebApi({
  redirectUri: redirectUri,
  clientId: clientId,
  clientSecret: clientSecret,
});

// Create the authorization URL
var authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);

console.log("Auth URL: " + authorizeURL);

require("child_process").exec(`start " " "${authorizeURL}"`);

const app = express();
// express.urlencoded()

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
  //<p>Access token: ${spotifyApi.getAccessToken()}</p>
  //<p>Refresh token: ${spotifyApi.getRefreshToken()}</p>
  //<p id="userId"><strong>ID:</strong> ${userData.me.id}</p>
});

app.get("/playlists", (req, response) => {
  spotifyApi.getUserPlaylists(userData.me.id).then(
    function (data) {
      // console.log("Retrieved playlists", data.body);
      userData.playlists = data.body;
      let playlistResponse = "";
      playlistResponse += `
      <table class="table table-bordered">
        <thead>
          <tr>
            <th><h4>Name:</h4></th>
            <th><h4>Description:</h4></th>
            <th><h4>Track Count:</h4></th>
            <th><h4>View Playlist:</h4></th>
          </tr>
        </thead>
        <tbody>`;
      for (let i = 0; i < userData.playlists.items.length; i++) {
        playlistResponse += `
            <tr>
              <td><h4>${userData.playlists.items[i].name}</h4></td>
              <td><p>${userData.playlists.items[i].description}</p></td>
              <td><p>${userData.playlists.items[i].tracks.total} tracks</p></td>
              <td><button class="btn btn-info" hx-get="/playlist/${userData.playlists.items[i].id}" hx-trigger="click" hx-target="#playlistModal" data-bs-toggle="modal" data-bs-target="#playlistModal">View Playlist</button></td>
            </tr>
        `;
      }
      playlistResponse += `</tbody>
      </table>
          <div id="playlistModal" class="modal modal-blur fade" style="display: none;" aria-hidden="false" tabindex="-1">
        <div class="modal-dialog modal-lg modal-dialog-centered" style="min-width: 60%;" role="dialog">
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
      // console.log("Retrieved playlist", data.body);
      let playlist = data.body;
      let playlistResponse = "";
      playlistResponse += `
      <div class="modal-dialog modal-lg modal-dialog-centered style="min-width: 60%;">
      <div class="modal-content">
      <div class="modal-header">
      <h5 class="modal-title">${playlist.name}</h5>
      </div>
      <div class="modal-body" style="max-height: calc(100vh - 210px);overflow-y: auto;">
      <div class="table-responsive">
      <table class="table table-borderless">
        <thead>
          <tr>
            <th><h4>Name:</h4></th>
            <th><h4>Artist:</h4></th>
            <th><h4>Album:</h4></th>
            <th><h4>Release Date:</h4></th>
            <th><h4>Duration:</h4></th>
          </tr>
        </thead>
        <tbody>`;
      for (let i = 0; i < playlist.tracks.total; i++) {
        playlistResponse += `
        <tr>
          <td><p>${playlist.tracks.items[i].track.name}</p></td>
          <td><p>${playlist.tracks.items[i].track.artists[0].name}</p></td>
          <td><p>${playlist.tracks.items[i].track.album.name}</p></td>
          <td><p>${playlist.tracks.items[i].track.album.release_date}</p></td>
          <td><p>${formatMilliseconds(playlist.tracks.items[i].track.duration_ms)}</p></td>
        <tr>
        `;
      }
      playlistResponse += `</tbody>
      </table>
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
      let topArtistsResponse = "";
      topArtistsResponse += `
      <table class="table table-bordered">
        <thead>
          <tr>
            <th><h4>Name:</h4></th>
            <th><h4>Genres:</h4></th>
            <th><h4>View Artist:</h4></th>
          </tr>
        </thead>
        <tbody>`;
      for (let i = 0; i < userData.topArtists.items.length; i++) {
        topArtistsResponse += `
            <tr>
              <td><h4>${userData.topArtists.items[i].name}</h4></td>
              <td><p>${userData.topArtists.items[i].genres}</p></td>
              <td><button class="btn btn-info" hx-get="/artist/${userData.topArtists.items[i].id}" hx-trigger="click" hx-target="#artistModal">View Artist</button></td>
            </tr>
        `;
      }
      topArtistsResponse += `</tbody>
      </table>
          <div id="artistModal" class="modal modal-blur fade" style="display: none;" aria-hidden="false" tabindex="-1">
        <div class="modal-dialog modal-lg modal-dialog-centered" style="min-width: 60%;" role="dialog">
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
      console.log("Retrieved artist", data.body);
      let artist = data.body;
      let artistResponse = `
      <div class="modal-dialog modal-lg modal-dialog-centered style="min-width: 60%;">
      <div class="modal-content">
      <div class="modal-header">
      <h5 class="modal-title">${artist.name}</h5>
      </div>
      <div class="modal-body" style="max-height: calc(100vh - 210px);overflow-y: auto;">
      <div class="card">
      <img id="artistImage" src="${artist.images[1].url}" class="card-img-top" alt="Artist Image"/>
      <div class="card-body">
      <h5 class="card-title">Genres:</h5>
      <p class="card-text">${artist.genres}</p>
      <br>
      <h5 class="card-title">Popularity:</h5>
      <p class="card-text">${artist.popularity}</p>
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
  spotifyApi.getMyTopArtists({ limit: 150 }).then((res, err) => {
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
      <label class="form-check-label" for="${artist.id}">
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
      <label class="form-check-label" for="${genre}">
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
    <table class="table table-borderless">
        <thead>
          <tr>
            <th><h4>No:</h4></th>
            <th><h4>Name:</h4></th>
            <th><h4>Artist:</h4></th>
            <th><h4>Album:</h4></th>
            <th><h4>Release Date:</h4></th>
            <th><h4>Duration:</h4></th>
            <th><h4>Preview Playback:</h4></th>
          </tr>
        </thead>
        <tbody>
    `;

    tracks.forEach((track, index) => {
      trackURIS.push(track.uri);
      let artists = "";
      if (track.artists.length > 1) {
        track.artists.forEach((artist) => {
          artists += artist.name + ", ";
        });
      } else {
        artists = track.artists[0].name;
      }
      recResponse += `
      <tr>
        <td><p>${index + 1}.</p></td>
        <td><p>${track.name}</p></td>
        <td><p>${artists}</p></td>
        <td><p>${track.album.name}</p></td>
        <td><p>${track.album.release_date}</p></td>
        <td><p>${formatMilliseconds(track.duration_ms)}</p></td>
        <td><audio src="${track.preview_url}" controls crossorigin=”anonymous”></audio></td>
      <tr>
      `;
    });

    recResponse += `
    </tbody>
    </table>
    <hr>
    <h4>Save Playlist:</h4>
    <form hx-post="/create-playlist" hx-target="#recModal">
    <div class="mb-3" style="max-height: 300px; padding: 15px; border: 3px gray solid; border-radius: 15px 15px 15px 15px; overflow-y: auto;">
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
      Public Playlist:
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
  console.log("Listening on port 5500");
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
