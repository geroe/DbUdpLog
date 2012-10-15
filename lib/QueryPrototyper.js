/**
 * Created with JetBrains PhpStorm.
 * User: georgroesch
 * Date: 31.03.12
 * Time: 16:50
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

/**
 * The prototyping function
 *
 * It will take a string ([duration|]query) and prototype & hash it
 *
 * @param {Object} the config object
 * @param {String} duration|query
 * @return {Object}
 */
exports.proto = function(config, msg, duration) {
	// tokenize additional info
	// SELECT ... /*REQUEST-ID:34234234*/ /*COUNTER:4*/

	var additionalInfo = {},
		myMatch;

	//check if we find a request id token
	if (myMatch = msg.match(/\/\*REQUEST-ID:(.+?)\*\//)) {
		additionalInfo.requestId = myMatch[1];
		msg = msg.replace(/\/\*REQUEST-ID:(.)+?\*\//,'');
	}

	//check if we find a counter token
	if (myMatch = msg.match(/\/\*COUNTER:(.+?)\*\//)) {
		additionalInfo.counter = myMatch[1];
		msg = msg.replace(/\/\*COUNTER:(.)+?\*\//,'');
	}

	//check if we find a master/slave token
	if (myMatch = msg.match(/\/\*MASTER-SLAVE:(.+?)\*\//)) {
		additionalInfo.masterSlave = myMatch[1];
		msg = msg.replace(/\/\*MASTER-SLAVE:(.)+?\*\//,'');
	}

	//check if we find a switch token
	if (myMatch = msg.match(/\/\*SWITCH:(.+?)\*\//)) {
		additionalInfo.switch = myMatch[1];
		msg = msg.replace(/\/\*SWITCH:(.)+?\*\//,'');
	}
	//make everything lower case
	msg = msg.toString().toLowerCase();

	//cleanup the msg
	msg = msg.replace(/^\s+/,''); //get rid of leading whitespaces
	msg = msg.replace(/\s+/g,' '); //replace whitespaces and normalize spaces

	//do the prototyping
	//this chaining of regex is probably not the best way to do this
	//@todo find a better, better performing solution
	var proto = msg; //copy to make a prototype of the query
	proto = proto.replace(/\/\*.+?\*\//g,''); //get rid of comments
	proto = proto.replace(/^\s+/,''); //get rid of leading whitespaces (after comments)
	proto = proto.replace(/;(\s)?$/,''); //get rid of trailing semicolon
	proto = proto.replace(/in(\s)*\([^\)]+\)/g,'in(?)'); //replace INs
	proto = proto.replace(/(?:'([^'\\]*(?:\\[\S\s][^'\\]*)*)'|"([^"\\]*(?:\\[\S\s][^"\\]*)*)")/g,'?'); //replace strings
	proto = proto.replace(/=(\s)*\d+/g,'=?'); //replace ints
	proto = proto.replace(/(\s)+=(\s)?\?/g,'=?'); //move = to field

	//call custom aggregators
	for (var i=0; i<config.customPrototypers.length; i++) {
		var prototyper = config.customPrototypers[i];

		var regex = new RegExp(prototyper.search,prototyper.options);
		proto = proto.replace(regex,prototyper.replace);
	}

    //cleanup the msg
    msg = msg.replace(/^\s+/,''); //get rid of leading whitespaces
    msg = msg.replace(/\s+/g,' '); //replace whitespaces and normalize spaces

    //do the prototyping
    //this chaining of regex is probably not the best way to do this
    //@todo find a better, better performing solution
    var proto = msg; //copy to make a prototype of the query
    proto = proto.replace(/\/\*.+?\*\//g,''); //get rid of comments
    proto = proto.replace(/^\s+/,''); //get rid of leading whitespaces (after comments)
    proto = proto.replace(/;(\s)?$/,''); //get rid of trailing semicolon
    proto = proto.replace(/in(\s)*\([^\)]+\)/g,'in(?)'); //replace INs
    proto = proto.replace(/(?:'([^'\\]*(?:\\[\S\s][^'\\]*)*)'|"([^"\\]*(?:\\[\S\s][^"\\]*)*)")/g,'?'); //replace strings
    proto = proto.replace(/=(\s)*\d+/g,'=?'); //replace ints
    proto = proto.replace(/(\s)+=(\s)?\?/g,'=?'); //move = to field

    //call custom aggregators
    for (var i=0; i<config.customPrototypers.length; i++) {
        var prototyper = config.customPrototypers[i];

        var regex = new RegExp(prototyper.search,prototyper.options);
        proto = proto.replace(regex,prototyper.replace);
    }

    //at the end, get rid of leading and trailing whitespaces
    proto = proto.replace(/^\s+/,''); //get rid of leading whitespaces
    proto = proto.replace(/\s+$/,''); //get rid of trailing whitespaces

    //create hash
    var hash = require('crypto').createHash('md5').update(proto,'utf8').digest('hex');

    //return the data object
    return {
        hash: hash,
        proto: proto,
        duration: duration,
        query: msg,
	    additionalInfo: additionalInfo
    };
};


/***
 *  This is an extended prototyper that accepts a JSON string as a message and 
 *  prepares it for the generic SQL prototyper above
 ***/
exports.protoJSON = function(config,msg) {
    //first, process JSON string to a valid message
    try{
        msg = JSON.parse(msg);
    }catch (e) {
        console.log('Could not parse JSON call.');
        return {
            hash: 'json_parse_error',
            proto: 'json_parse_error',
            duration: 0,
            query: 'json_parse_error',
            additionalInfo: []
        };
    }
    
    //set some defaults
    if(!msg.duration){
        msg.duration = 0;
    }
    
    //the prototype the SQL with all the stuff that belongs there
    var reply = exports.proto(config, msg.sql, msg.duration);
    
    //add some more info for the generic additional info array    
    if(msg.additionalinfo){
        reply.additionalInfo = msg.additionalinfo;
    }
    
    return reply;
}


/***
 *  This is an extended prototyper that accepts a RAW string as a message and 
 *  prepares it for the generic SQL prototyper above (default behaviour)
 ***/
exports.protoRAW = function(config, msg) {
    //first cook the message
    msg = msg.toString().toLowerCase();
    
    //initialize duration to 0;
    var duration = 0;

    //check if duration is present
    if (msg.match(/^\d+(\.\d+)?\|/)) {
        //get the duration

        var dummy = msg.split('|');
        duration = parseFloat(dummy.shift());
        msg = dummy.join('|');
    }

    return exports.proto(config, msg, duration);
}
