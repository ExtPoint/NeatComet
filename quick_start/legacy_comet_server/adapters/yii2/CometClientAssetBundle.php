<?php

namespace NeatComet\quickStart\legacyCometServer;

use yii\web\AssetBundle;

class CometClientAssetBundle extends AssetBundle {

    public $js = [
        'sockjs.min.js',
        'CometClient.js',
    ];

    public function init() {

        $this->sourcePath = __DIR__ . '/../../client/';

        parent::init();
    }
}
