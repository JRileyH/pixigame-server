const server = require('http').createServer();
const redis = require('redis');
const db = redis.createClient();
const db_multi = db.multi();
const db_events = redis.createClient();
db_events.subscribe('__keyevent@0__:expired')
db.config("SET","notify-keyspace-events", "Ex");
const io = require('socket.io')(server);
const expiration = 600;

//===Connect to REDIS DB===\\
db.on('connect', function(){
    db.flushdb();//tmp flush for cleanliness
});

//Validates the existance of a GUID and returns performs a callback with either new GUID or existing GUID and boolean to determine if it had already existed
validateGUID = function(guid, set, length, pool, cb){
    if(typeof guid==='undefined' || guid==null){
        newGUID(set, length, pool, function(new_guid){
            cb(new_guid, false);
        });
    } else {
        db.sismember(set, guid, function(err, exists){
            if(err) throw err;
            if(!exists){
                newGUID(set, length, pool, function(new_guid){
                    cb(new_guid, false);
                });
            } else {
                cb(guid, true);
            }
        });
    }
}

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
            db.hset('room:'+client.rid, 'client:'+client.cid, client.sid);
            db.expire('room:'+client.rid, expiration);
        }

        //broadcast room update
        if(client.rid){
            db.hgetall('room:'+client.rid, function(err, all){
                if(err) throw err;
                for(var client in all){
                    db_multi.hgetall(client)
                }
                db_multi.exec(function(err, members){
                    if(err) throw err;
                    for(let member of members){
                        io.sockets.connected[member.sid].emit('update_room', members);
                    }
                })
            });
        }
        
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



//===Incoming Client Socket Connections===\\
io.on('connect', function(socket){
    validateGUID(socket.handshake.query['cid'], 'all_cids', 24, "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", function(cid, existed){
        if(existed){
            db.hgetall('client:'+cid, function(err, client){
                client.cid = cid;
                client.sid = socket.id;
                if(client.rid){
                    if(client.role==='host'){
                        io.sockets.connected[client.sid].emit('connect_host', client);
                    } else if(client.role==='guest'){
                        io.sockets.connected[client.sid].emit('connect_guest', client);
                    } else {
                        io.sockets.connected[client.sid].emit('connect_request');
                    }
                } else {
                    io.sockets.connected[client.sid].emit('connect_request');
                }
                createClient(client);
            });
        } else {
            io.sockets.connected[client.sid].emit('connect_request');
            createClient({cid:cid, sid:socket.id});
        }
    });

    
    socket.on('host', function(data){
        validateGUID(data.cid, 'all_cids', 24, "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", function(cid, existed){
            data.cid = cid;
            validateGUID(data.rid, 'all_rids', 4, "ABCDEFGHIJKLMNOPQRSTUVWXYZ", function(rid, existed){
                data.rid = rid;
                createClient(data);
            });
        })
    });

    socket.on('join', function(data){
        if(typeof data.rid === 'string' && data.rid.length != 4) {
            console.error('VALID RID NOT PROVIDED: '+data.rid)
        } else {
            validateGUID(data.cid, 'all_cids', 24, "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", function(cid, existed){
                data.cid = cid;
                db.sismember('all_rids', data.rid, function(err, exists){
                    if(exists){
                        createClient(data);
                    } else {
                        console.error('VALID RID NOT PROVIDED: '+data.rid)
                    }
                });
            })
        }
    });

});



server.listen(1337, () => console.info('server listening on port 1337'));