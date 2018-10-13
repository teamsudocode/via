var app = require('express')();
var http = require('http').Server(app)
var io = require('socket.io')(http)

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html')
})

app.get('/mobile', function(req, res) {
  res.sendFile(__dirname + '/mobileview.html')
})

io.on('connection', function(socket){
  console.log('a user connected')
  socket.on('data', function(data) {
    // console.log(data)
    io.emit('data', data)
  })
});

http.listen(3000, function(){
  console.log('listening on *:3000')
});
