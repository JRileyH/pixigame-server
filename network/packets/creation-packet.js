class CreationPacket extends require('../packet') {
    constructor(socket, all_sockets) {
        super(socket, all_sockets);
        this._name='creation';
    }

    send(data){
        super.send(data);
        console.log('sent create at ('+data.x+','+data.y+') from '+data._sender+' at '+data._timestamp);
    }

    recieve(data){
        super.recieve(data);
        console.log('recieved create at ('+data.x+','+data.y+') from '+data._sender+' at '+data._timestamp);
    }
}

module.exports = (...args)=>{
    //do arguements control here
    return new CreationPacket(...args);
}