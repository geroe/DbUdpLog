# DbUdpLog

*collect, prototype & store queries in MongoDB*

## Overview
DbUdpLog is a simple node.js Server to track & analyze DB queries.

It uses [MongoDB](http://www.mongodb.org/) as a storage backend.

I borrowed the idea of using a UDP server to do this from [statsd](https://github.com/etsy/statsd).

## Usage

### Configuration
At the top of the logServer.js file, a config object holds all relevant configuration.
It should be quite self-explanatory and is well documented.

This will probably change in the future to get the config from an INI file.

### Server
Simply start the server:

    $ node logServer.js

From that point on, you have actually started 2 servers:

* UDP log Server that processes all the queries
* HTTP Server to control the behavior and deliver stats and aggregated info

The Control server accepts the following commands:

* config    - get the config object
* stats     - get system & load stats
* start     - set the server to process incoming logs
* stop      - set the server to **NOT** process incoming logs
* verbose   - set the verbosity level with ?level=[0-10]
* logSingle - tells the server to log single queries with ?log=[true|false]
* longest   - get the longest queries in terms of total time needed
* most      - get the queries that were called most often
* worst     - get the queries with the longest average execution time

**Attention! Right now there are no security features present!
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

[http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.