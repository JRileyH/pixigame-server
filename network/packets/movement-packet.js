class MovementPacket extends require('../packet') {
    constructor(socket, all_sockets) {
        super(socket, all_sockets);
        this._name='movement';
    }

    send(data){
        super.send(data);
        console.log('sent '+data.action+' move '+data.direction+' from '+data._sender+' at '+data._timestamp);
    }

    recieve(data){
        super.recieve(data);
        console.log('recieved '+data.action+' move '+data.direction+' from '+data._sender+' at '+data._timestamp);
    }
}

module.exports = (...args)=>{
    //do arguements control here
    return new MovementPacket(...args);
}