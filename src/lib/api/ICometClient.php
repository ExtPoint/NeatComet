<?php
/**
 * @copyright Copyright 2014-2017 <a href="http://www.extpoint.com">ExtPoint</a>
 * @author <a href="http://koryagin.com">Pavel Koryagin</a>
 * @license MIT
 */
namespace NeatComet\api;

interface ICometClient {

    /**
     * @param string $channelName
     * @param mixed $messageData
     */
    public function broadcast($channelName, $messageData);

}
