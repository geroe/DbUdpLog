<?php
/**
 * Created by JetBrains PhpStorm.
 * User: georgroesch
 * Date: 01.04.12
 * Time: 16:38
 *
 * This is a simple example on how to extend adodb with a custom driver
 * It should be placed in the same folder as adodb-mysqli.inc.php
 * All you have to do is to tell adodb to use mymysqli instead of mysqsli. dead simple.
 *
 * Of course this class can be used to do a lot of other things as well, like
 * - adding a comment to each query to identify the current logged in user and the url
 *   (i find this extremely useful, as it will show up in innotop as well)
 * - slow query escalation
 * - etc.
 */

// security - hide paths (not my idea, this is what adodb does...)
if (!defined('ADODB_DIR')) die();

require_once(ADODB_DIR.'/drivers/adodb-mysqli.inc.php');

class ADODB_mymysqli extends ADODB_mysqli {

	function _query($sql, $inputarr) {
		$start = microtime(true);
		$ret = parent::_query($sql,$inputarr); //execute the query!
		$duration = microtime(true)-$start;
		unset($start);

		//do the actual DbUdpLog push
		self::addLog($duration,$sql);

		return $ret;
	}

	private static function addLog($duration,$sql) {
		$sock = fsockopen('udp://127.0.0.1', 13306, $errno, $errstr);
		if ($sock) {
			fwrite($sock, $duration.'|'.$sql);
			fclose($sock);
		}
	}
}