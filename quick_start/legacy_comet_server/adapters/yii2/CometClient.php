<?php

namespace NeatComet\quickStart\legacyCometServer;

use NeatComet\api\ICometClient;
use yii\base\Component;
use yii\base\Exception;

class CometClient extends Component implements ICometClient {

    public $secretKey = '';
    public $cometUrl = null;
    public $cometHttpUrl = null;

    /**
     * @param string $channel
     * @param mixed $data
     * @throws Exception
     */
    public function publish($channel, $data) {
        $this->send('publish', array(
            'channel' => $channel,
            'data' => json_encode($data),
        ));
    }

    /**
     * @param string $channel
     * @param mixed $data
     * @throws Exception
     */
    public function broadcast($channel, $data) {
        $this->publish('profiles:' . $channel, $data);
    }

    /**
     * @param string $method Action name
     * @param array $data
     * @throws Exception
     */
    protected function send($method, array $data = []) {
        // Generate url
        $url = rtrim($this->cometHttpUrl, '/');
        $data['method'] = $method;

        // Append server-server token
        $data['token'] = $this->secretKey;

        // @todo cache
        // For fix slow request (slow find host by domain)
        $host = parse_url($url, PHP_URL_HOST);
        $ip = gethostbyname($host);
        $url = str_replace($host, $ip, $url);

        try {
            $message = file_get_contents($url, false, stream_context_create(array(
                'http' => array(
                    'method' => 'POST',
                    'header' => 'Host: ' . $host . PHP_EOL
                        . 'Content-Type: application/x-www-form-urlencoded' . PHP_EOL,
                    'content' => http_build_query($data),
                ),
            )));
        } catch (\Exception $e) {
            throw new Exception('Call to Node.js server ' . $url . ' failed. Error: ' . $e->getMessage());
        }

        if ($message === false) {
            throw new Exception('Call to Node.js server ' . $url . ' failed. Response is false.');
        }

        // TODO: Don't return. Check and throw
        // return json_decode($message, true);
    }

}