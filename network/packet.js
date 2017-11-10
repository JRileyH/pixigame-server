module.exports = class Packet{
    constructor(socket, all_sockets){
        this._name = null;
        this._socket = socket;
        this._all_sockets = all_sockets;
    }

    get Name(){
        return this._name;
    }

    get Socket(){
        return this._socket;
    }

    init(){
        this._socket.on(this._name, this.recieve.bind(this));
    }

    send(data){
        if(data===undefined)data = {};
        data._sender = 'server';
        data._timestamp = new Date().getTime();
        switch(data._recipient){
            case 'self':
                this._socket.emit(this._name, data)
            break;
            case 'others':
                this._socket.broadcast.emit(this._name, data)
            break;
            case 'all':
            default:
                this._all_sockets.emit(this._name, data)
        }
    }

    recieve(data){
        this.send(data);
    }
}

//Abstract Class
