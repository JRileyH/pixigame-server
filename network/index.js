class Network {
    constructor(socket, io) {
        this._socket = socket;
        this._io = io;
        this._packets = {};
    }

    packet(id){
        if(!this._packets[id]){
            try{
                let p = require('./packets/'+id+'-packet');
                this._packets[id] = p(this._socket, this._io.sockets);
                this._packets[id].init();
                return p;
            }catch(e){
                console.error(e);
                return null;
            }
        }
        return this._packets[id];
    }

    tick(){

    }
}

module.exports = (...args)=>{
    //do arguements control here
    return new Network(...args);
}