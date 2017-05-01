var express = require("express");
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.json());

app.use(express.static('public'))

/*
app.get('/', function(req, res){
    var params = req.query;
    logger.info("Received GET params " + JSON.stringify(params) );

    res.json(params);
});
app.post('/', function(req, res){
    var json = req.body;
    logger.info("Received POST body " + JSON.stringify(json) );
    res.json(json);
});*/

require('./spotify.js').routes(app);

app.listen(8988);

console.log("Rest API started on port 8988");
