var updateInterval;

var webTitle = "Infinify";
var songInterval = 2 * 60 * 1000;  // 2 mins

var auth; 

function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

$(document).ready(function () {


    // get from getparams (after login) 
    if (!auth) {
        auth = getParameterByName("auth", location.search);
        // If in getparams, save in localstorage
        if (auth) {
            console.log("auth ", auth) ; 
            localStorage.setItem("auth", auth);  

        // Get auth from local storage
        } else {
             auth = localStorage.getItem("auth");
             console.log("local storage auth ", auth) ;

             // If not in local storage either, you nee dto login

        }
    }

    $('#login').click(login);
    $('#logout').click(logout);

    if (!auth) {
        console.warn("No auth found, you need to login"); 
        $(".logged").hide();
        $(".not-logged").show();
        return;  
    }

    $.ajax({
        url: '/me',
        headers: { "auth": auth },
        success: function (json) {
            if (json.error) {
                $(".logged").hide();
                $(".not-logged").show();
                console.log("Auth token expired, try logging again");
                localStorage.clear();

            } else {

                $(".logged").show();
                $(".not-logged").hide();

                $("#user-name").html(json.response.body.id);
            }
        }
    })

    $("#discoverability").on("change",function(){
        console.log("discover " , this.value); 
        $.ajax({
            url: "discoverability",
            headers: { "auth": auth },
            data:  { 'value': this.value}
            //type GET
        });

    });
    $('#stop-radio').click(stopInterval);

    $('#add').click(addSong);

    $('#start-radio').click(function () {
        console.log("starting radio");
        document.title = " ▶ " + webTitle;
        $.ajax({
            url: '/start',
            headers: { "auth": auth },
            success: function (json) {
                console.log("Successful start response ", json);

                $("#spotify-url").prop('href', json.url).show();
                updateInterval = setInterval(addSong, songInterval);
                $('#start-radio').hide();
                $('#stop-radio').show();
            },
            error: function (error, json) {
                document.title = " ⚠ " + webTitle;
                console.error("Error on starting radio ", error, json);
            }
        })
    });

    document.title = webTitle;

    //Materialize stuff
    $(".button-collapse").sideNav();

});

function login() {
    $.ajax({
        url: '/login',
        async: false, 
        success: function (json) {
            console.log("Loggin into spotify: "+ json.url);
            var result = window.open(json.url, "_self");

        }
    });
}
function logout() {
    localStorage.clear();
    window.open("/", "_self");
}

function stopInterval() {
    document.title = " ⏸ " + webTitle;

    clearInterval(updateInterval);
    $('#start-radio').show();
    $('#stop-radio').hide();

}
function addSong() {
    $.ajax({
        url: '/update',
        headers: { "auth": auth },
        success: function (json) {
            if (json.error) {
                console.error("Unable to update playlist ", json.error);
                return;
            }
            var trackName = json.response.name;
            var artist = json.response.artists[0].name;
            var album = json.response.album.name;

            var $log = $('<p> Adding song <b>' + trackName + '</b> from album  <b>' + album + '</b> by  <b>' + artist + '</b></p>');
            $log.hide();
            $("#log").prepend($log);
            $log.show('slow');
            setTimeout(function () {
                $log.hide('slow', function () {
                    $(this).remove();
                });
            }, 5000);

        },
        error: function (error, json) {
            document.title = " ⚠ " + webTitle;
            console.error("Error on updating radio ", error, json);
        }
    });
}