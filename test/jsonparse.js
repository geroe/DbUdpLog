/**
 * Created with JetBrains PhpStorm.
 * User: georgroesch
 * Date: 02.04.12
 * Time: 13:39
 */

//config
try {
    console.dir(JSON.parse(require('fs').readFileSync('../config.json','utf-8')));
} catch (e) {
    console.log('Could not read config file: '+ e.toString());
    process.exit(1);
}