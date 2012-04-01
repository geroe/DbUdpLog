<?php
/**
 * Created by JetBrains PhpStorm.
 * User: georgroesch
 * Date: 31.03.12
 * Time: 14:51
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

//a _very_ simple example of how to use this
//it is meant to be called from the command line
$sock = fsockopen("udp://127.0.0.1", 13306, $errno, $errstr);
if (! $sock) { echo 'Could not create socket.'; }

//loop!
while (1) {
	fwrite($sock, rand(1,80) .'|
		/* a comment in mysql */

		SELECT
			*
		FROM
			`1234_test_table`
		WHERE
			uid IN (123, "abc")
			AND last_name="geÖrg"
			AND first_name="hans"
	        AND year = 2010
			;
	');
	sleep(2);
}
fclose($sock);