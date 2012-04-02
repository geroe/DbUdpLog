/**
 * Created with JetBrains PhpStorm.
 * User: georgroesch
 * Date: 31.03.12
 * Time: 14:41
 *
 * Copyright 2012 georg.roesch@gmail.com
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

//config
try {
    var config = JSON.parse(require('fs').readFileSync('./config.json','utf-8'));
} catch (e) {
    console.log('Could not read config file: '+ e.toString());
    process.exit(1);
}

//stats
var stats = {
    startupTime: new Date(),
    processed: 0
};

//helper function to manage logs in respect to verbosity lvl
var outp = function(msg,lvl) {
    if (lvl<=config.verbosityLevel) {
        console.log('[%s] %s',new Date().toISOString(), msg);
    }
};

//do the mongo magic
var mongoLib = require('mongodb');
var mongoServer = new mongoLib.Server(config.mongoHost,config.mongoPort,{});
var mongoDb = new mongoLib.Db(config.mongoDb, mongoServer, {});

//check connection
mongoDb.open(function(error,db) {
    if (error) {
        outp(error.toString(),0);
        process.exit(1);
    }
});

/**
 * The Control server
 *
 * This is a (very) basic web server to change the configuration
 * and/or get information about the logging.
 *
 * It will always return a valid JSON string as a result.
 *
 * The HTTP Code will vary:
 * - 200 if everything works fine, http://localhost:8080/stats
 * - 404 if the command was not understood, http://localhost:8080/foobar
 * - 500 if something went wrong, , http://localhost:8080/longest and MongoDB has an error
 */
var controlServer = require('http').createServer(function(req, resp) {

    //extract the url from the request object
    var reqUrl = require('url').parse(req.url,true);

    //the return object
    var ret;

    //should the output be generated a t the bottom
    //@todo there should be a better way, but it's ok for now.
    var doOutput = true;

    //always get limit & skip from GET, even though it is not used for all commands.
    var limit = parseInt(reqUrl.query.limit);
    if (isNaN(limit)) {
        //default
        limit = 10;
    }

    var skip = parseInt(reqUrl.query.skip);
    if (isNaN(skip)) {
        //default
        skip = 0;
    }

    //dispatch and get rid of leading /
    //as long as the commands are that simple, this approach is tolerable,
    //as soon as we do more this needs to be refactored!
    //@todo refactor
    switch(reqUrl.pathname.substring(1)) {
        //get the config object
        case 'config':
            outp('Config status requested by '+req.connection.remoteAddress,5);
            resp.writeHead(200, {'ContentType' : 'application/json'});
            ret = config;
            break;
        //get the stats object and some os infos
        case 'stats':
            outp('Stats requested by '+req.connection.remoteAddress,5);
            resp.writeHead(200, {'ContentType' : 'application/json'});
            var os = require('os');
            ret = {
                'loadavg': os.loadavg(),
                'freemem': os.freemem(),
                'local': stats
            };
            break;
        //start the logging again - even if it is already running
        case 'start':
            outp('Start requested by '+req.connection.remoteAddress,3);
            config.logListen = true;
            resp.writeHead(200, {'ContentType' : 'application/json'});
            ret = 'Continuing to listen for logs on port '+config.logPort;
            break;
        //stop the logging - even if it is already stopped
        case 'stop':
            outp('Stop requested by '+req.connection.remoteAddress,3);
            config.logListen = false;
            resp.writeHead(200, {'ContentType' : 'application/json'});
            ret = 'Stopping to listen for logs';
            break;
        //set verbosity level
        case 'verbose':
            var lvl = parseInt(reqUrl.query.level);
            if (isNaN(lvl)) {
                //if something went wrong, just keep the current value
                lvl = config.verbosityLevel;
            }
            config.verbosityLevel = lvl;
            outp('Changing verbosity level to '+lvl+' as requested by '+req.connection.remoteAddress,0); //this should always be logged
            resp.writeHead(200, {'ContentType' : 'application/json'});
            ret = 'Verbosity level changed to '+lvl;
            break;
        //should single queries be logged as well?
        //ATTENTION! be careful - for high QPS you may clog everything!!!
        case 'logSingle':
            config.logSingleQueries = (reqUrl.query.log=='true' ? true : false);
            outp('Setting logSingleQueries to '+(config.logSingleQueries ? 'TRUE' : 'FALSE')+' as requested by '+req.connection.remoteAddress,0); //this should always be logged
            resp.writeHead(200, {'ContentType' : 'application/json'});
            ret = 'logSingleQueries set to '+(config.logSingleQueries ? 'TRUE' : 'FALSE');
            break;
        //get top report on totaltime = longest overall time
        //users limit & skip
        case 'longest':
            doOutput = false;
            mongoDb.collection(config.logAggregatedCollection,function(error,collection) {
                if (error) {
                    outp(error.toString(),1);
                    return;
                }

                collection.find({}).sort({totaltime: -1}).skip(skip).limit(limit).toArray(function(err,docs) {
                    if (err) {
                        resp.writeHead(500, {'ContentType' : 'application/json'});
                        resp.write(JSON.stringify(err.toString()));
                        resp.end();
                        outp(err.toString(),3);
                    } else {
                        resp.writeHead(200, {'ContentType' : 'application/json'});
                        resp.write(JSON.stringify(docs));
                        resp.end();
                        outp('Longest queries as requested by '+req.connection.remoteAddress,5);
                    }
                });
            });
            break;
        //get top report on counter = most often called
        //users limit & skip
        case 'most':
            doOutput = false;
            mongoDb.collection(config.logAggregatedCollection,function(error,collection) {
                if (error) {
                    outp(error.toString(),1);
                    return;
                }

                collection.find({}).sort({counter: -1}).skip(skip).limit(limit).toArray(function(err,docs) {
                    if (err) {
                        resp.writeHead(500, {'ContentType' : 'application/json'});
                        resp.write(JSON.stringify(err.toString()));
                        resp.end();
                        outp(err.toString(),3);
                    } else {
                        resp.writeHead(200, {'ContentType' : 'application/json'});
                        resp.write(JSON.stringify(docs));
                        resp.end();
                        outp('Most often called queries as requested by '+req.connection.remoteAddress,5);
                    }
                });
            });
            break;
        // i keep this as an example for map/reduce, but this not needed anymore
        /*case 'calcavg':
            doOutput = false;
            mongoDb.collection(config.logAggregatedCollection,function(error,collection) {
                if (error) {
                    outp(error.toString(),1);
                    return;
                }

                var map = function() {
                    emit(this._id, {hash: this.hash, totaltime: this.totaltime, counter: this.counter, avg: 0});
                }

                var reduce = function(key,values) {
                    var result = {hash: key, totaltime: this.totaltime, counter: this.counter, avg: 0};
                    return result;
                }

                var finalize = function(key,value) {
                    value.avg = value.totaltime/value.counter;
                    return value;
                }

                collection.mapReduce(map, reduce, {finalize: finalize, out: 'aggregated'},function(err,results,stats) {
                    if (err) {
                        resp.writeHead(500, {'ContentType' : 'application/json'});
                        resp.write(JSON.stringify(err.toString()));
                        resp.end();
                        outp(err.toString(),3);
                    } else {
                        resp.writeHead(200, {'ContentType' : 'application/json'});
                        resp.write(JSON.stringify('Done'));
                        resp.end();
                        outp('calcavg as requested by '+req.connection.remoteAddress,3);
                    }
                });
            });
            break;*/
        //get top report on avg = highest avg time
        //users limit & skip
        case 'worst':
            doOutput = false;
            mongoDb.collection(config.logAggregatedCollection,function(error,collection) {
                if (error) {
                    outp(error.toString(),1);
                    return;
                }

                collection.find({}).sort({avg: -1}).skip(skip).limit(limit).toArray(function(err,docs) {
                    if (err) {
                        resp.writeHead(500, {'ContentType' : 'application/json'});
                        resp.write(JSON.stringify(err.toString()));
                        resp.end();
                        outp(err.toString(),3);
                    } else {
                        resp.writeHead(200, {'ContentType' : 'application/json'});
                        resp.write(JSON.stringify(docs));
                        resp.end();
                        outp('Worst queries as requested by '+req.connection.remoteAddress,5);
                    }
                });
            });
            break;
        //default case = error
        default:
            outp(reqUrl.pathname+' requested but not found by '+req.connection.remoteAddress,1);
            resp.writeHead(404, {'ContentType' : 'application/json'});
            ret = reqUrl.pathname+' is not known.';
    }

    //use ret and jsonify it
    if (doOutput) {
        resp.write(JSON.stringify(ret));
        resp.end();
    }
}).listen(config.controlPort);

/**
 * The Log Server
 *
 * This is a very basic UDP4 Server that will get a string in that form:
 * duration|query, eg. 0.00675|UPDATE users SET last_login=now() WHERE uid=57;
 *
 * I opted to use this basic pipe syntax in favor of sending a JSON string to keep
 * the overhead as little as possbile.
 *
 * The duration| is actually optional, but the whole thing will become more or less
 * useless if not given. If you just want a counter, than that's ok. It will default
 * duration = 0.
 *
 * The above mentioned query will be prototyped and hashed for aggregation. The query
 * will become: UPDATE users SET last_login=now() WHERE uid=?
 * As you can see, all non-deterministic values will get substituted.
 *
 */
var logServer = require('dgram').createSocket('udp4').on('message', function(msg,sender) {
    //check if we should do the listening
    //it would probably be better to stop the listening altogether, than simply
    //returning on a message. i have to figure out how this works, though.
    //@todo start/stop server
    if (!config.logListen) { return; }

    //analyze the query an get the analyzing object
    var analyze = require('./lib/QueryPrototyper.js').proto(config,msg);
    outp('['+sender.address+'] ['+analyze.duration+'s] '+analyze.hash+' // '+analyze.proto,10);

    //store object in mongo
    mongoDb.collection(config.logAggregatedCollection,function(error,collection) {
        if (error) {
            outp(error.toString(),1);
            return;
        }

        //upsert data
        collection.findAndModify({
            hash: analyze.hash
        },{
            hash: 1
        },{
            $set: { hash: analyze.hash, proto: analyze.proto },
            $inc: { counter: 1, totaltime: analyze.duration }
        },{
            upsert: true
        }, function(err,doc) {
            if (err) {
                outp(err.toString(),3);
            }

            //calc aggregation
            //unfortunately, we have to do this. lets wait for:
            //@see https://jira.mongodb.org/browse/SERVER-458
            collection.update({
                _id: doc._id
            },{
                '$set': {
                    avg: doc.totaltime/doc.counter,
                    max: ((analyze.duration>doc.max || isNaN(doc.max)) ? analyze.duration : doc.max),
                    min: ((analyze.duration<doc.min || isNaN(doc.min)) ? analyze.duration : doc.min)
                }
            },function (err) {
                if (err) {
                    outp(err.toString(),3);
                }
            });
        });
    });

    //log ALL queries - PERFORMANCE KILLER!!!!
    if (config.logSingleQueries) {
        var single = new mongoLib.Collection(mongoDb, config.logSingleCollection);
        single.insert({
            hash: analyze.hash,
            executed: new Date(),
            duration: analyze.duration,
            query: analyze.query
        }, function(err) {
            if (err) {
                outp(err.toString(),3);
            }
        });
    }

    //update stats
    stats.processed++;
}).on('listening',function() {
    outp('Log Server started. Listening to UDP @ '+config.logPort,3);
}).bind(config.logPort);