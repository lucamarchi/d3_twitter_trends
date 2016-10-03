var app = require('express')();
var server = require('http').createServer(handler);
var io = require('socket.io')(server);
var fs = require('fs');
var Twit = require('twit');
var config = require('./config/config.json');

server.listen(8080);

var client = new Twit({
  consumer_key: config.TWITTER_CONSUMER_KEY,
  consumer_secret: config.TWITTER_CONSUMER_SECRET,
  access_token: config.TWITTER_ACCESS_TOKEN,
  access_token_secret: config.TWITTER_ACCESS_TOKEN_SECRET
});

function handler (req, res) {
  fs.readFile(__dirname + '/../index.html',
  function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading index.html');
    }
    res.writeHead(200);
    res.end(data);
  });
}

io.on('connection', function(socket) {
    var params = {id: 1};
    client.get('trends/place', params, function (error, data, response) {
        if (!error) {
            var trends = data[0].trends;
            console.log(trends);
            var trendNames = trends.map(function (trend) {
                return normalize(trend.name);
            });
            var trendMap = {};
            trendNames.forEach(function (trend) {
                trendMap[trend] = 0;
            });

            console.log(trendMap);

            var tweetStream = client.stream('statuses/filter', {track: trendNames.join(',')});

            tweetStream.on('tweet', function (tweet) {

                tweet.entities.hashtags.forEach(function (hashtag) {
                    var hashStr = normalize(hashtag.text);
                    if (trendNames.indexOf(hashStr) > -1) {
                        trendMap[hashStr]++;
                        socket.emit('message', {name: hashStr});
                    }
                });

            });

        } else {
            console.log(error);
        }

    });
});


var normalize = function(trend) {
  var trendNrmlz = trend.toLowerCase();
  if (trendNrmlz.indexOf('#') == -1) {
    trendNrmlz = '#' + trendNrmlz;
  }
  if (trendNrmlz.indexOf(' ') > -1) {
    trendNrmlz = trendNrmlz.replace(/ /g, '');
  }
  return trendNrmlz;
};

function arrayUnique(array) {
    var a = array.concat();
    for(var i=0; i<a.length; ++i) {
        for(var j=i+1; j<a.length; ++j) {
            if(a[i] === a[j])
                a.splice(j--, 1);
        }
    }

    return a;
}