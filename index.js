const server = require('http').createServer();
const redis = require('redis');
const db = redis.createClient();
const io = require('socket.io')(server);
const expiration = 30;

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
        cb(cid)
    });
}
newCID = function(sid){
    createCID(24, function(cid){
        db.sadd('all_cids', cid);
        io.sockets.connected[sid].emit('create_cid', {cid: cid, expiration: expiration);
        connectUser({cid:cid, sid:sid});
    });
}
connectUser = function(user){
    if(user.hasOwnProperty('cid')){
        for(var key in user){
            if(user.hasOwnProperty(key)){
                db.hset('user:'+user.cid, key, user[key]);
            }
        }
        db.expire('user:'+user.cid, expiration);
        db.smembers('all_cids', function(err, cids){
            console.log('----------')
            for(var cid of cids){
                db.hgetall('user:'+cid, function(err, all){
                    if(err) throw err;
                    console.log(all);
                });
            }
        });
    }
}

//===Incoming Client Socket Connections===\\
io.on('connect', function(socket){
    var cid = socket.handshake.query['cid'];
    var sid = socket.id;
    if(cid==='undefined'){
        newCID(sid);
    } else {
        db.sismember('all_cids', cid, function(err, exists){
            if(err) throw err;
            if(!exists){
                newCID(sid);
            } else {
                connectUser({cid:cid, sid:sid});
            }
        });
    }   
});
server.listen(1337, () => console.log('server listening on port 1337'));