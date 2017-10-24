const server = require('http').createServer();
const io = require('socket.io')(server);
const port = process.env.PORT || 1337;

io.on('connect', onConnect);
server.listen(port, () => console.log('server listening on port ' + port));

var network = require('./network')();

 

function onConnect(socket){
    console.log('connect ' + socket.id);

    var hole = network.packet('001')();
    socket.on(hole.Name, data =>{hole.recieve(data);});
    
    socket.on('disconnect', () => console.log('disconnect ' + socket.id));
}