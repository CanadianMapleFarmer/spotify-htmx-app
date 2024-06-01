# 🎶 Spotify HTMX App 🎶

Welcome to **Spotify HTMX App**! Dive into a dynamic experience with this Node Express and HTMX app, enhanced with Bootstrap for sleek styling. Utilizing the Spotify API, this app provides a fun and interactive way to explore your personal Spotify profile, playlists, and top artists. 🌟

## 🚀 Features

- **Profile Insights**: Get detailed views of your Spotify profile.
- **Playlists at a Glance**: Browse through your playlists to rediscover your favorite tunes.
- **Top Artists Discovery**: Discover and revisit tracks from your top artists.
- **Custom Playlist Creation**: Harness the power of the Spotify recommendation engine to craft the perfect playlist based on up to 5 artists or genres, tailored by playlist length.

## 🛠 Installation

To get started with this app, follow these simple steps:

- **Clone the repository**:
```bash
  git clone https://github.com/CanadianMapleFarmer/spotify-htmx-app.git
  cd spotify-htmx-app
```
- **Install dependencies**:
```bash
  npm install
```
- **Run the project**:
```bash
  node .
```

### Set Up Environment Variables

- **environment variables**:
  Create a `.env` file in the root directory and add your Spotify API credentials:

  ```plaintext
  SPOTIFY_CLIENT_ID=your_spotify_client_id
  SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
  SPOTIFY_REDIRECT_URI=http://localhost:5500/authenticate
  ```
