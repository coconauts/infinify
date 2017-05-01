var updateInterval;

var webTitle = "Infinify";
var songInterval = 2 * 60 * 1000;  // 2 mins

$(document).ready(function () {


    $.ajax({
        url: '/me',
        success: function (json) {
            if (json.error) {
                $("#logged").hide();
                $("#login").show();
                
            } else {
                $("#logged").show();
                $("#login").hide();
                $("#user-name").html(json.response.body.id);
            }
        }
    })

    $("#discoverability").on("change",function(){
        console.log("discover " , this.value); 
        $.ajax({
            url: "discoverability",
            data:  { 'value': this.value}
            //type GET
        });

    });
    $('#stop-radio').click(stopInterval);

    $('#login').click(login);

    $('#add').click(addSong);

    $('#start-radio').click(function () {
        console.log("starting radio");
        document.title = " ▶ " + webTitle;
        $.ajax({
            url: '/start',
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
        success: function (json) {
            window.open(json.url);
        }
    });
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