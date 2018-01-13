const server = require('http').createServer();
const redis = require('redis');
const db = redis.createClient();
const db_events = redis.createClient();
db_events.subscribe('__keyevent@0__:expired')
db.config("SET","notify-keyspace-events", "Ex");
const io = require('socket.io')(server);
const expiration = 600;

//===Connect to REDIS DB===\\
db.on('connect', function(){
    db.flushdb();//tmp flush for cleanliness
});

newGUID = function(set, length, pool, cb){
    var _count = 0;
    if(typeof set != 'string') throw Error('No DB SET specified to track GUID');
    length = length || 24;
    pool = pool || "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    _newGUID = function(set, length, cb){
        if(_count++>5) throw Error('Couldnt generate GUID for '+set);
        var guid = "";
        for (var i = 0; i < length; i++){guid += pool.charAt(Math.floor(Math.random() * pool.length));}
        db.sismember(set, guid, function(err, exists){
            if(exists){
                _newGUID(set, length, cb)
            } else {
                db.sadd(set, guid);
                cb(guid);
            }
        });
    }
    _newGUID(set, length, cb);
}

createClient = function(client){
    if(client.hasOwnProperty('cid') && client.hasOwnProperty('sid')){
        for(var key in client){
            if(client.hasOwnProperty(key)){
                db.hset('client:'+client.cid, key, client[key]);
            }
        }
        db.expire('client:'+client.cid, expiration);
        io.sockets.connected[client.sid].emit('create_cid', {cid: client.cid, expiration: expiration});
        if(typeof client.rid!=='undefined' && client.rid!=null){
            db.hset('room:'+client.rid, 'rid', client.rid);
            db.expire('room:'+client.rid, expiration);
            io.sockets.connected[client.sid].emit('create_rid', {rid: client.rid, expiration: expiration});
        }

        //Do what ever connection means
        console.log('CONNECT: '+client.cid)
        db.smembers('all_cids', function(err, cids){
            console.log('----------')
            for(var cid of cids){
                db.hgetall('client:'+cid, function(err, all){
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
            if(_entry[0]==='client'){
                db.srem('all_cids', _entry[1]);
            }
            if(_entry[0]==='room'){
                db.srem('all_rids', _entry[1]);
            }
        break;
        default:
        console.warn('Unhandled DB_EVENT: '+event+' '+entry);
    }
});

validateRoom = function(rid, cb){
    if(typeof rid==='undefined' || rid==null){
        newGUID('all_rids', 4, "ABCDEFGHIJKLMNOPQRSTUVWXYZ", function(new_rid){
            cb(new_rid);
        });
    } else {
        db.sismember('all_rids', rid, function(err, exists){
            if(err) throw err;
            if(!exists){
                newGUID('all_rids', 4, "ABCDEFGHIJKLMNOPQRSTUVWXYZ", function(new_rid){
                    cb(new_rid);
                });
            } else {
                cb(rid);
            }
        });
    }
}
validateClient = function(cid, cb){
    if(typeof cid==='undefined' || cid==null){
        newGUID('all_cids', 24, "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", function(new_cid){
            cb(new_cid);
        });
    } else {
        db.sismember('all_cids', cid, function(err, exists){
            if(err) throw err;
            if(!exists){
                newGUID('all_cids', 24, "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", function(new_cid){
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
        createClient({cid:cid, sid:socket.id});
    });

    
    socket.on('host', function(data){
        validateClient(data.cid, function(cid){
            data.cid = cid;
            validateRoom(socket.handshake.query['rid'], function(rid){
                data.rid = rid;
                createClient(data);
            });
        })
    });

    socket.on('join', function(data){
        validateClient(data.cid, function(cid){
            data.cid = cid;
            createClient(data);
        })
    });

});



server.listen(1337, () => console.log('server listening on port 1337'));