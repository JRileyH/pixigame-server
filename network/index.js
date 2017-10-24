class Network {
    constructor() {

    }

    packet(id){
        try{
            return require('./packets/packet'+id);
        }catch(e){
            console.error(e);
            return null;
        }
    }

    tick(){

    }
}

module.exports = (...args)=>{
    //do arguements control here
    return new Network(...args);
}