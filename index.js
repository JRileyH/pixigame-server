const server = require('http').createServer();
const redis = require('redis');
const db = redis.createClient();
const db_events = redis.createClient();
db_events.subscribe('__keyevent@0__:expired')
db.config("SET","notify-keyspace-events", "Ex");
const io = require('socket.io')(server);
const expiration = 10;

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
newCID = function(cb){
    createCID(24, function(cid){
        db.sadd('all_cids', cid);
        cb(cid);
    });
}

connectUser = function(user){
    if(user.hasOwnProperty('cid') && user.hasOwnProperty('sid')){
        for(var key in user){
            if(user.hasOwnProperty(key)){
                db.hset('user:'+user.cid, key, user[key]);
            }
        }
        db.expire('user:'+user.cid, expiration);
        io.sockets.connected[user.sid].emit('create_cid', {cid: user.cid, expiration: expiration});

        //Do what ever connection means
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

db_events.on('message', function(event, entry){
    var _event = event.split(':');
    var _entry = entry.split(':');
    switch(_event[1]){
        case 'expired':
            if(_entry[0]==='user'){
                db.srem('all_cids', _entry[1]);
            }
        break;
        default:
        console.warn('Unhandled DB_EVENT: '+event+' '+entry);
    }
});

validateClient = function(cid, cb){
    if(typeof cid==='undefined' || cid==null){
        newCID(function(new_cid){
            cb(new_cid);
        });
    } else {
        db.sismember('all_cids', cid, function(err, exists){
            if(err) throw err;
            if(!exists){
                newCID(function(new_cid){
                    cb(new_cid);
                });
            } else {
                cb(cid);
            }
        });
    }
}

//===Incoming Client Socket Connections===\\
io.on('connect', function(socket){
    validateClient(socket.handshake.query['cid'], function(cid){
        connectUser({cid:cid, sid:socket.id});
    });

    
    socket.on('host', function(data){
        validateClient(data.cid, function(cid){
            data.cid = cid;
            connectUser(data);
        })
    });

    
});



server.listen(1337, () => console.log('server listening on port 1337'));