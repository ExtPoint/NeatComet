<?php
namespace NeatComet\api;

interface ICometClient {

    /**
     * @param string $channelName
     * @param mixed $messageData
     */
    public function broadcast($channelName, $messageData);

}
