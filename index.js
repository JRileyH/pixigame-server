const server = require('http').createServer();
const io = require('socket.io')(server);
const port = process.env.PORT || 1337;

io.on('connect', onConnect);
server.listen(port, () => console.log('server listening on port ' + port));

function onConnect(socket){
    console.log('connect ' + socket.id);
    var network = require('./network')(socket, io);

    network.packet('creation');
    network.packet('movement');
    
    socket.on('disconnect', () => console.log('disconnect ' + socket.id));
}