/**
 * Created with JetBrains PhpStorm.
 * User: georgroesch
 * Date: 02.04.12
 * Time: 14:01
 */

//config
try {
    var config = JSON.parse(require('fs').readFileSync('../config.json','utf-8'));
} catch (e) {
    console.log('Could not read config file: '+ e.toString());
    process.exit(1);
}
try {
    var msg = '0.123|CREATE TABLE temp_123_12345 whatever';
    console.dir(require('../lib/QueryPrototyper.js').proto(config,msg));
} catch (e) {
    console.log(e.toString());
}