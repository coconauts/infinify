var SpotifyWebApi = require('spotify-web-api-node');

var config = require("./config.json");
// credentials are optional

var spotifyApi = new SpotifyWebApi({
    clientId: config.client_id,
    clientSecret: config.client_secret,
    redirectUri: config.redirect_uri
});


//var token = config.token;

if (config.token) spotifyApi.setAccessToken(config.token);
if (config.refresh_token) {
    spotifyApi.setRefreshToken(config.refresh_token);
    refreshToken();
}

function refreshToken() {
    spotifyApi.refreshAccessToken()
        .then(function (data) {
            console.log('The access token has been refreshed!');

            // Save the access token so that it's used in future calls
            spotifyApi.setAccessToken(data.body['access_token']);
        }, function (err) {
            console.log('Could not refresh access token', err);
        });
}
function removeFirstItemPlaylist() {
    console.log(" Removing first track");

    spotifyApi.getPlaylist(config.user, config.playlist, {}, function (err, response) {
        if (err) console.error("Unable to get Playlist to clear ", err);
        else {
            var snapshotId = response.body.snapshot_id;
            spotifyApi.removeTracksFromPlaylistByPosition(config.user, config.playlist,
                [0], snapshotId, function (err, response) { }
            );
        }
    });
}

function getPositionLastPlayed(callback) {
    var position = -1;
    spotifyApi.getCurrentlyPlaying({ limit: 1 }, function (err, response) {
        var lastTrack = response.body.item; //response.body.items[0].track;
        //callback(err, lastTrack);

        spotifyApi.getPlaylist(config.user, config.playlist, {}, function (err, response) {
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
}

function clearPlaylist() {

    console.log("Clearing playlist ");
    spotifyApi.getPlaylist(config.user, config.playlist, {}, function (err, response) {
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
            spotifyApi.removeTracksFromPlaylistByPosition(config.user, config.playlist,
                positions, snapshotId, function (err, response) {
                    if (err) console.error("Unable to get Playlist to clear ", err);
                    else console.log(" Removed " + positions.length + " tracks from playlist ");
                }
            );
        }
    });

}

function addRecommendation(callback) {
    console.log("Playing recommendation ");

    getRandomTrack(function (err, track) {
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
            spotifyApi.getRecommendations({ seed_artists: artistIds, limit: 1 },
                function (err, response) {

                    if (err) {
                        console.error("Unable to get recommendations ", err);
                        if (callback) callback(err);
                    } else {
                        var recommended = response.body.tracks[0];
                        if (recommended.is_playable !== false) {
                            console.log("Got recommendation: \n" +
                                "- track name: ", recommended.name, " in album: ", recommended.album.name, " artist: " + recommended.artists[0].name + "\n" +
                                "- from track name: ", track.name, " in album: ", track.album.name, " artist: ", track.artists[0].name
                            );

                            var uri = track.uri; //spotify:track:6O2urHAlufyVOPlpxpsWJu
                            spotifyApi.addTracksToPlaylist(config.user, config.playlist,
                                [recommended.uri], {},
                                function (err, response) {
                                    if (err) console.error("Unable to addTracksToPlaylist ", err);
                                    if (callback) callback(err, recommended);
                                });
                        } else {
                            var err = "Track  " + recommended.name + " is not playable: " + recommended.is_playable;
                            console.warn(err);
                            if (callback) callback(err);
                        }
                    }
                });
        }
    });
}
/*
function playRecommendations(seed) {
    clearPlaylist();

    spotifyApi.getRecommendations({ seed_artists: ['6mfK6Q2tzLMEchAr0e9Uzu'],
        min_popularity: config.min_popularity },
        function (err, response) {
           // console.log("RESPONSE ", response);
           if (err) console.error("Unable to get recommendations " , err);

           else if (response) {
                var track = "spotify:track:6uSIn5SVmUwile8TXoYMe6";
                var uris = [];

                response.body.tracks.forEach(function (track) {
                    uris.push(track.uri);
                });
                console.log("Playing tracks ", uris);
                var uri = track.uri; //spotify:track:6O2urHAlufyVOPlpxpsWJu
                spotifyApi.addTracksToPlaylist(config.user, config.playlist,
                    uris, {},
                    function (err, response) {
                        console.log("addTracksToPlaylist ", err, response );
                    });
            }
        });
}*/
function randomIntFromInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function getRandomTrack(callback) {
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
/*
function getRandomAlbum (callback) {
    spotifyApi.getMySavedAlbums({limit:50 }, function(err, response){
        //console.log("Total albums ", response.body);
  
        var random = randomIntFromInterval(0, response.body.total -1);
        spotifyApi.getMySavedAlbums({limit:1 , offset: random}, function(err, response){
            console.log("saved album ", response.body);
            var album = response.body.items[0].album; 
            callback(err, album);
        });
    });
}*/
module.exports = {

    routes: function (app) {

        /* app.get('/seed', function (req, res) {
        
             getRandomTrack(function(err, track){
                     res.json({ error: err, track: track });
             });
         });*/

        app.get('/callback', function (req, res) {
            //console.log("Callback response " , req);

            spotifyApi.authorizationCodeGrant(req.query.code).then(function (data) {
                console.log('The token expires in ' + data.body['expires_in']);
                console.log('The access token is ' + data.body['access_token']);
                console.log('The refresh token is ' + data.body['refresh_token']);

                // Set the access token on the API object to use it in later calls
                spotifyApi.setAccessToken(data.body['access_token']);
                spotifyApi.setRefreshToken(data.body['refresh_token']);

                //res.json(data);

                res.writeHead(302, {
                    'Location': 'index.html'
                });
                res.end();
            }, function (err) {
                console.log('Something went wrong!', err);
            });
        }),

            app.get('/me', function (req, res) {
                spotifyApi.getMe(function (err, response) {
                    res.json({ error: err, response: response });
                });

                refreshToken();
            });
        app.get('/login', function (req, res) {
            var state = "spotify-radio";
            var authorizeURL = spotifyApi.createAuthorizeURL(config.scopes, state);
            res.json({ "url": authorizeURL });
        });
        app.get('/clear', function (req, res) {
            clearPlaylist();
            res.json({});
        });
        /*app.get('/test', function (req, res) {
            playRecommendations('6mfK6Q2tzLMEchAr0e9Uzu');
            res.json({});
        });

        app.get('/recommendations', function (req, res) {
            getRandomTrack(function(err, track){
                var artistIds = [];
                track.artists.forEach(function(artist){
                    artistIds.push(artist.id);
                })
                console.log("Getting recommendation from track ", track.name, " in album: ", track.album.name);
                spotifyApi.getRecommendations({ seed_artists: artistIds, limit: 1},
                function (err, response) {
                    res.json({ error: err, response: response });
                });
                    
            });
        });*/
        /*
                app.get('/playlist', function (req, res) {
        
                    spotifyApi.getPlaylist(config.user, config.playlist, function (err, response) {
                        res.json({ error: err, response: response });
        
                    });
                });
        */
        app.get('/start', function (req, res) {
            clearPlaylist();

            for (var i = 0; i < config.recommendation_size; i++) {
                addRecommendation(function (err, response) { });
            }

            res.json({ url: "https://open.spotify.com/user/" + config.user + "/playlist/" + config.playlist });
        });

        app.get('/init_playlist', function (req, res) {

            spotifyApi.getUserPlaylists(undefined, {}, function (err, response) {
                if (err){
                    res.json({ error: err, response: response, method: 'getUserPlaylists' });
                    return;
                }
                // Try to find playlist
                for (var i = 0; i < response.body.items.length; i++) {
                    var playlist = response.body.items[i];
                    if (playlist.name == config.playlist_name){
                        console.log("Found playlist with id ", playlist.id);
                        res.json(playlist);
                        return;
                    }
                }
                // If not found, create
                spotifyApi.getMe(function (err, response) {
                    if (err){
                        res.json({ error: err, response: response ,method: 'getMe' });
                        return;
                    }
                    var userId = response.body.id;
                    spotifyApi.createPlaylist(userId, config.playlist_name, {public: false}, function(err, response){
                        if (err){
                            res.json({ error: err, response: response, method: 'createPlaylist' });
                            return;
                        }
                        console.log("Created playlist with id ", response.body.id);
                        res.json(response.body);
                        return;
                    });
                });
            });
        });

        app.get('/position', function (req, res) {
            getPositionLastPlayed(function (err, response) {
                res.json({ error: err, response: response });
            });
        });

        app.get('/update', function (req, res) {

            // Calculate the position of the current song, and remove it from the list if > 2
            // Too complicated, too many calls for so little advantage
            /*getPositionLastPlayed(function (err, response) {
                if (err) {
                    res.json({error: err});
                    if (err.statusCode == 401) refreshToken();

                } else {
                    var playlistSize = response.playlistSize;
                    if (response.position >= 2) {
                        removeFirstItemPlaylist();
                        playlistSize --;
                    }
                    if (playlistSize < recommendation_size) {
                        addRecommendation(function (err, response) {
                            res.json({ error: err, response: response });
                        });
                    } else {
                        res.json({ response: "No song added, playlist has max size" });
                    }
                }
            });*/

            addRecommendation(function (err, response) {
                res.json({ error: err, response: response });
            });

        });
        /*
                app.get('/play', function (req, res) {
                    var track = "spotify:track:6uSIn5SVmUwile8TXoYMe6";
                    spotifyApi.addTracksToPlaylist(config.user, config.playlist,
                        [track], {},
                        function (err, response) {
                            res.json({ error: err, response: response });
                        });
                });*/

    }
}