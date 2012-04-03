/**
 * Created with JetBrains PhpStorm.
 * User: georgroesch
 * Date: 03.04.12
 * Time: 09:45
 *
 * Test of basic auth
 * As found here: http://stackoverflow.com/questions/5951552/basic-http-authentication-in-node-js
 */

require('http').createServer(function(req,res){
    var header=req.headers['authorization']||'',        // get the header
        token=header.split(/\s+/).pop()||'',            // and the encoded auth token
        auth=new Buffer(token, 'base64').toString(),    // convert from base64
        parts=auth.split(/:/),                          // split on colon
        username=parts[0],
        password=parts[1];

    if (username=='testuser' && password=='password') {
        res.writeHead(200,{'Content-Type':'text/plain'});
        res.end('username is "'+username+'" and password is "'+password+'"');
    } else {
        res.writeHead(401,{'WWW-Authenticate':'Basic realm="DbUdpLog"'});
        res.end();
    }

}).listen(1337,'127.0.0.1');