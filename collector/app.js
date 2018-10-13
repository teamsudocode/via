var app = require('express')();
var http = require('http').Server(app)
var io = require('socket.io')(http)

app.get('/', function(req, res){
  res.sendFile(__dirname + '/public/index.html')
})

app.get('/index.js', function(req, res) {
  res.sendFile(__dirname + '/public/index.js')
})

app.get('/style.css', function(req, res) {
  res.sendFile(__dirname + '/public/style.css')
})

app.get('/empty.svg', function(req, res) {
  res.sendFile(__dirname + '/public/empty.svg')
})

app.get('/mobile', function(req, res) {
  res.sendFile(__dirname + '/public/mobileview.html')
})

io.on('connection', function(socket){
  console.log('a user connected')
  socket.on('data', function(data) {
    // console.log(data)
    io.emit('data', data)
  })
  socket.on('status_change', function(data) {
    io.emit('status_change', data)
  })
});

http.listen(3000, function(){
  console.log('listening on *:3000')
});
