const server = require('http').createServer();
const redis = require('redis');
const db = redis.createClient();
const io = require('socket.io')(server);

//===Connect to REDIS DB===\\
db.on('connect', function(){
    db.flushdb();//tmp flush for cleanliness
});

createCID = function(length, cb){
    db.incr('total_cids', function(err, total){
        if(err) throw err;
        var len = Math.floor(total/10)+1;
        if(len>=length) throw Error('Overflow CID not long enough to handle number of connections!');
        var cid = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
        for (var i = 0; i < length-len; i++){cid += possible.charAt(Math.floor(Math.random() * possible.length));}
        cid+=total;
      
        console.log(cid);
    });
    //var len = Math.ceil(total/10)

    //console.log('total: '+total);
    //console.log('len: '+len)

}

//===Incoming Client Socket Connections===\\
io.on('connect', function(socket){
    var cid = socket.handshake.query['cid'];
        
    if(cid==='undefined'){
        createCID(24, function(new_cid){

        });
    } else {

    }

    //if the incoming id is null
        //create new one ->
            //increment total connection
            //generate hash ending with total connections
        //add id to set
        
    //else
        //if the id exists
            //connect that user
        //else
            //create new one ->
                //increment total connection
                //generate hash ending with total connections
            //add id to set
    //send id to client
    

    
    //db.sismember()//if the id exists
    //db.sadd('cids', )
    //db.incr('total_connection', function(err, reply) {
    //    console.log(reply);
    //});
});
server.listen(1337, () => console.log('server listening on port 1337'));