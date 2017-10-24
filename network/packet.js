module.exports = class Packet{
    constructor(recipient, data){
        this._recipient = recipient;
        this._data = data;
        this._name = null;
    }

    get Name(){
        return this._name;
    }

    send(recipient, data){
        let to = recipient===undefined?this._recipient:recipient;
        let payload = data===undefined?this._data:data;
        Game.Network.socket.emit(this._name, payload);
    }

    recieve(packet){
        console.log('recieving');
        console.log(packet);
    }
}

//Abstract Class
