class Packet001 extends require('../packet') {
    constructor(recipient, data) {
        super(recipient, data);
        this._name='poody';
    }
}

module.exports = (...args)=>{
    //do arguements control here
    return new Packet001(...args);
}