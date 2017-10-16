var SpotifyWebApi = require('spotify-web-api-node');

var config = require("./config.json");
var users = {};
var spotifyApis = {};
var playlists = {};
var settings = {}; //discoverability 

// credentials are optional

var globalSpotifyApi = new SpotifyWebApi({
    clientId: config.client_id,
    clientSecret: config.client_secret,
    redirectUri: config.redirect_uri
});
/*
var spotifyApi = new SpotifyWebApi({
    clientId: config.client_id,
    clientSecret: config.client_secret,
    redirectUri: config.redirect_uri
});
*/

/* 
//For debugging purposes

if (config.token) spotifyApi.setAccessToken(config.token);
if (config.refresh_token) {
    spotifyApi.setRefreshToken(config.refresh_token);
    refreshToken(function(){getOrCreatePlaylist(function(){});});
}
*/

function getUser(req) {
    var auth = req.get("auth");
    return users[auth];
}

function getSettings(req) {
    var auth = req.get("auth");
    var s = settings[auth]; 
    console.log("settings " , s);
    if (!s) settings[auth] = { discoverability: 5}; //default settings
    return settings[auth] ;    

}

function getApi(req) {
    var auth = req.get("auth");
    console.log("Auth ", auth); 
    var spotifyApi = spotifyApis[auth];
    console.log("Spotify api ",  spotifyApi); 
    return spotifyApi; 
}

function getPlaylist(req) {
    var auth = req.get("auth");
    return playlists[auth];
}

function getOrCreatePlaylist(spotifyApi, callback) {
    console.log("Get or create playlist "+ config.playlist_name)
    spotifyApi.getUserPlaylists(undefined, {}, function (err, response) {
        if (err) {
            console.error(err);
            callback(err, response);
            return;
        }
        // Try to find playlist
        for (var i = 0; i < response.body.items.length; i++) {
            var playlist = response.body.items[i];
            if (playlist.name == config.playlist_name) {
                console.log("Found playlist with id ", playlist.id);
                callback(undefined, playlist.id);
                return;
            }
        }
        // If not found, create
        spotifyApi.getMe(function (err, response) {
            if (err) {
                console.error("Unable to get my details", err);
                callback(err, response);
                return;
            }
            var userId = response.body.id;
            spotifyApi.createPlaylist(userId, config.playlist_name, { public: false }, function (err, response) {
                if (err) {
                    console.error("Unable to create playlist", err);
                    callback(err, response);
                    return;
                }
                console.log("Created playlist with id ", response.body.id);
                callback(undefined, response.body.id);
                return;
            });
        });
    });
}
function refreshToken(spotifyApi, callback) {
    spotifyApi.refreshAccessToken()
        .then(function (data) {
            console.log('The access token has been refreshed!');

            // Save the access token so that it's used in future calls
            spotifyApi.setAccessToken(data.body['access_token']);
            if (callback) callback();
        }, function (err) {
            console.log('Could not refresh access token', err);
        });
}
function removeFirstItemPlaylist(user, playlist,  spotifyApi) {
    console.log(" Removing first track");

    spotifyApi.getPlaylist(user, playlist, {}, function (err, response) {
        if (err) console.error("Unable to get Playlist to clear ", err);
        else {
            var snapshotId = response.body.snapshot_id;
            spotifyApi.removeTracksFromPlaylistByPosition(user, playlist,
                [0], snapshotId, function (err, response) { }
            );
        }
    });
}

/*
function getPositionLastPlayed(user, playlist,  spotifyApi, callback) {
    var position = -1;
    spotifyApi.getCurrentlyPlaying({ limit: 1 }, function (err, response) {
        var lastTrack = response.body.item; //response.body.items[0].track;
        //callback(err, lastTrack);

        spotifyApi.getPlaylist(user, playlist, {}, function (err, response) {
            if (err) console.error("Unable to get Playlist to clear ", err);

            var playlist = response.body.tracks.items;
            //callback(err, response.body.tracks.items);
            console.log("Got " + playlist.length + " in playlist ");
            for (var i = 0; i < playlist.length; i++) {
                var playlistTrack = playlist[i].track;

                //console.log(" track  ", playlistTrack);

                console.log("Comparing track " + lastTrack.name + " / " + playlistTrack.name + ": " +
                    lastTrack.id + "/ " + playlistTrack.id);

                if (lastTrack.id === playlistTrack.id) {
                    console.log("Found track " + lastTrack.name + " in position " + i);
                    callback(undefined, { position: i, playlistSize: playlist.length });
                    return;
                }
            }
        });

        callback("Can't find track " + track.name + " on playlist");
    });
}*/

function clearPlaylist(user,playlist,  spotifyApi) {

    console.log("Clearing playlist ");
    spotifyApi.getPlaylist(user, playlist, {}, function (err, response) {
        if (err) console.error("Unable to get Playlist to clear ", err);

        //console.log("Playlist ", response);
        var snapshotId = response.body.snapshot_id;

        var positions = [];
        var i = 0;
        while (i < response.body.tracks.total) {
            positions.push(i);
            i++;
        }
        console.log("Removing ", positions.length, " songs from playlist ", snapshotId);
        if (positions.length > 0) {
            spotifyApi.removeTracksFromPlaylistByPosition(user, playlist,
                positions, snapshotId, function (err, response) {
                    if (err) console.error("Unable to get Playlist to clear ", err);
                    else console.log(" Removed " + positions.length + " tracks from playlist ");
                }
            );
        }
    });

}

function getRecommendations(discoverability, artistIds, sourceTrack, spotifyApi, callback){
    spotifyApi.getRecommendations(
        { seed_artists: artistIds, limit: discoverability, market: "from_token" },
        function (err, response) {

            if (err) {
                console.error("Unable to get recommendations ", err);
                if (callback) callback(err);
            } else {
                var uris = [];
                for (var i = 0 ; i < response.body.tracks.length ; i++){
                    var recommended = response.body.tracks[i];
                    /*
                    console.log("Got recommendation: \n" +
                        "- track name: ", recommended.name, " in album: ", recommended.album.name, " artist: " + recommended.artists[0].name + "\n" +
                        "- from track name: ", sourceTrack.name, " in album: ", sourceTrack.album.name, " artist: ", sourceTrack.artists[0].name
                    );*/

                    uris.push(recommended.uri); //spotify:track:6O2urHAlufyVOPlpxpsWJu
                }
                callback(uris, response.body.tracks);
                
            }
        });
}

function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

function addRecommendation(user, settings,  playlist, spotifyApi, callback) {
    console.log("Playing recommendation ");

    getRandomTrack(spotifyApi, function (err, track) {
        if (err) {
            console.error("Unable to get getRandomTrack ", err);
            if (callback) callback(err);
        } else {
            //console.log("track " , track);
            var artistIds = [];
            track.artists.forEach(function (artist) {
                artistIds.push(artist.id);
            });
            //console.log("Getting recommendation from track ", track.name, " in album: ", track.album.name);
            
            getRecommendations(settings.discoverability, artistIds, track, spotifyApi, function(uris, recommended){
                // Select one random from the result
                var idx = randomIntFromInterval(0, uris.length - 1);
                var uriToAdd = uris[idx];
                console.log("Adding ", uriToAdd, " to playlist");
                spotifyApi.addTracksToPlaylist(user, playlist,
                    [uriToAdd], {},
                    function (err, response) {
                        if (err) console.error("Unable to addTracksToPlaylist ", err);
                        if (callback) callback(err, recommended[idx]);
                });
            });
        }
    });
}

function randomIntFromInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function getRandomTrack(spotifyApi, callback) {
    spotifyApi.getMySavedTracks({ limit: 1 }, function (err, response) {
        if (err) {
            console.error("Unable to get saved tracks ", err);
            callback(err);
            if (err.statusCode == 401) refreshToken();

        } else {
            // console.log("Total tracks ", response.body.total);
            var random = randomIntFromInterval(0, response.body.total - 1);
            spotifyApi.getMySavedTracks({ limit: 1, offset: random }, function (err, response) {
                var track = response.body.items[0].track;
                callback(err, track);
            });
        }

    });
}

module.exports = {

    routes: function (app) {
        app.get('/callback', function (req, res) {

            // Create new client for this user
            var spotifyApi = new SpotifyWebApi({
                clientId: config.client_id,
                clientSecret: config.client_secret,
                redirectUri: config.redirect_uri
            });

            var auth = guid(); 

            spotifyApis[auth] = spotifyApi;

            // Debug print keys
            //console.log("spotifyApis ", spotifyApis); 

            spotifyApi.authorizationCodeGrant(req.query.code).then(function (data) {
                /*console.log('The token expires in ' + data.body['expires_in']);
                console.log('The access token is ' + data.body['access_token']);
                console.log('The refresh token is ' + data.body['refresh_token']);
                */
                // Set the access token on the API object to use it in later calls
                spotifyApi.setAccessToken(data.body['access_token']);
                spotifyApi.setRefreshToken(data.body['refresh_token']);

                //res.json(data);

                getOrCreatePlaylist(spotifyApi, function (err, playlist) {
                    if (err) {
                        console.error("Unable to get or create playlist ", err, playlist);
                        return;
                    }
                    console.log("Got playlist id " , playlist);
                    playlists[auth] = playlist; 
                });

                res.writeHead(302, {
                    'Location': 'index.html?auth='+auth
                });
                res.end();
            }, function (err) {
                console.log('Something went wrong!', err);
            });
        }),

        /**
         * This endpoint is requested when app starts, to know if you are identified, 
         * Perfect timing for refreshing the token
         */
        app.get('/me', function (req, res) {
           // console.log("req", req);
            var spotifyApi = getApi(req); 
            if (!spotifyApi) {
                res.json({error: "Not logged in"});
                return ; 
            }

            spotifyApi.getMe(function (err, response) {
                //TODO return response.body 
                res.json({ error: err, response: response });
                var auth = req.get("auth");

                users[auth] =  response.body.id; 
            });

            refreshToken(spotifyApi);
        });

        app.get('/login', function (req, res) {
            var state = "spotify-radio";

            var authorizeURL = globalSpotifyApi.createAuthorizeURL(config.scopes, state);
            res.json({ "url": authorizeURL });
        });
        
        app.get('/start', function (req, res) {
            var user = getUser(req);
            var spotifyApi = getApi(req); 
            var playlist = getPlaylist(req); 
            var settings = getSettings(req); 

            clearPlaylist(user,  playlist, spotifyApi);

            for (var i = 0; i < config.playlist_size; i++) {
                addRecommendation(user, settings, playlist, spotifyApi, function (err, response) { });
            }

            res.json({ url: "https://open.spotify.com/user/" + user + "/playlist/" + playlist });
        });

        
        app.get('/update', function (req, res) {
            var user = getUser(req);
            var spotifyApi = getApi(req); 
            var playlist = getPlaylist(req); 
            var settings = getSettings(req); 

            addRecommendation(user, settings, playlist,  spotifyApi, function (err, response) {
                res.json({ error: err, response: response });
            });
        });
        app.get('/discoverability', function (req, res) {
            
            var settings = getSettings(req);
            
            settings.discoverability = parseInt(req.query.value);
            console.log("Updated discoverability " + settings.discoverability);
            res.json({});
        });

        /*
        // For debugging the recommendation arguments

        app.get('/recommend', function (req, res) {
            var artistId = "4tw2Lmn9tTPUv7Gy7mVPI4";
            fakeTrack =  {
                name: 'foo',
                album: {name: 'foo'},
                artists: [{name: 'foo'}]
            }
            response = [];
            getRecommendations(artistId, fakeTrack, function(uris, recomended){
                for (var i = 0; i < recomended.length; i++) {
                    var song = recomended[i];
                    response.push({
                        artist: song.artists[0].name,
                        album: song.album.name,
                        title: song.name
                    });
                }
                res.json(response);
            });
        });*/
       
    }
}