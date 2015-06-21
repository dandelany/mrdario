var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
    console.log('a user connected');
    var x = 1;

    socket.on('chat message', function(msg) {
        console.log('message ', msg);
    });

    socket.on('disconnect', function(){
        console.log('user disconnected');
    });

    socket.on('moves', function(moveInputQueue) {
        x++;
        console.log('move ', x, moveInputQueue);
    });

});

http.listen(3000, function(){
    console.log('listening on *:3000');
});
