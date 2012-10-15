# DbUdpLog

*collect, prototype & store queries in MongoDB*

## Overview
DbUdpLog is a simple node.js Server to track & analyze DB queries.

It uses [MongoDB](http://www.mongodb.org/) as a storage backend.

I borrowed the idea of using a UDP server to do this from [statsd](https://github.com/etsy/statsd).

## Usage

### Configuration
Just copy the config_example.json file to config.json and adapt to your needs. It is also possible to
have multiple config files. config.json is the default. If you need to start the server with an alternative
cofig, just add the config file as a command line paramter.

	$ cp config_example.json config.json
	$ vi config.json //or use your editor of choice

Attention! JSON.parse() is very **strict**.

Unfortunately, .json files are not allowed to contain comments, so here is the documentation:

#### log udp server config

* logListen: should we listen to incoming logs?
* logPort: which port to listen to for log entries
* logSingleQueries: should single queries be logged as well?
* logAggregatedCollection: where to store accumulated query info
* logSingleCollection: where to store single query info

#### control web server config

* controlPort: which port to listen to for the control server
* controlAuth: object with username and password for the control server. if both are empty, no authentication is needed

#### mongodb config

***TODO*** check support for mongo clusters

* mongoHost: Hostname or IP address
* mongoPort: port of the MongoDB server
* mongoDb: name of the Database

#### global config

* verbosityLevel: 0 = important & fatal error, 3 = errors, 5 = infos, 10 = show all
* customPrototypers:
  An array of objects to perform additional prototyping after the standard prototypers are already executed.
  Please use [RegExp](https://developer.mozilla.org/en/Core%5FJavaScript%5F1.5%5FReference/Global%5FObjects/RegExp) syntax.
  Example:


	...,
	"customPrototypers": [{
		"search": "user_table_(\\d)*",
		"options": "ig",
		"replace": "user_table_?"
	},{
		...
	}]

### Server
Simply start the server:

	$ node logServer.js [configfile.json]

Naming the config file is optional. The default is: ./config.json

From that point on, you have actually started 2 servers:

* UDP log Server that processes all the queries
* HTTP Server to control the behavior and deliver stats and aggregated info

The Control server accepts the following commands:

* config    - get the config object
* stats     - get system & load stats
* start     - set the server to process incoming logs
* stop      - set the server to **NOT** process incoming logs
* reset     - full database reset (delete all data and start fresh)
* verbose   - set the verbosity level with ?level=[0-10]
* logSingle - tells the server to log single queries with ?log=[true|false]
* longest   - get the longest queries in terms of total time needed
* most      - get the queries that were called most often
* worst     - get the queries with the longest average execution time

**Attention! Only HTTP basic auth with a cleartext password on the server is implemented.
Please make sure that you configure your firewall that only trusted parties have access to the Control server.**

### Client
The software itself does not contain a client. I added a small example in /examples to illustrate the use.

Here is a PHP block to understand the concept:


	<?php
		...
		$start = microtime(true);
		mysql_query($query);
		$end = microtime(true);

		$sock = fsockopen("udp://127.0.0.1", 13306, $errno, $errstr);
		if ($sock) {
			fwrite(($end-$start).'|'.$query);
			fclose($sock);
		}
	    ...

As you can see, errors on the PHP side are silently ignored. It should just send the query if possible.
I just want logs, but not to jeopardize the application itself :)

You can also send a full-blown json encoded string as the message which enables packing more data into the socket call.
Here is an example:

    <?php
    
        ...
		$start = microtime(true);
		mysql_query($query);
		$end = microtime(true);

		$sock = fsockopen("udp://127.0.0.1", 13306, $errno, $errstr);
		if ($sock) {
			fwrite('json:'.json_encode(array('sql'=>$query, 'duration'=>$end-$start), 'additionalInfo'=>array('foo'=>'bar')));
			fclose($sock);
		}
	    ...
	    

You could also integrate this into some sort of proxy.
[MySQL Proxy](http://forge.mysql.com/wiki/MySQL_Proxy) for instance.
This was to intrusive for me, as I normally use a *direct* connection and did not want to deal with compression,
protocol details, etc.

## Dependencies
The software uses

* [node-mongodb-native](https://github.com/christkv/node-mongodb-native)

## License
Copyright 2012 georg.roesch@gmail.com

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.