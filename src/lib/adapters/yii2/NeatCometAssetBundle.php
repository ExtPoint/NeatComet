<?php

namespace NeatComet\adapters\yii2;

use yii\web\AssetBundle;

class NeatCometAssetBundle extends AssetBundle {

    public $sourcePath = \NeatComet\LIB_PATH;

    public $js = [
        'clientBase.js',
        'Object.js',
        'Exception.js',
        'NeatCometClient.js',
        'SafeChannelClient.js',
        'SimpleCollectionMapperClient.js',
        'router/OpenedProfileClient.js',
    ];

    /**
     * List required client adapter files before register
     *
     * @var string[]
     */
    public static $adaptersJs = [];

    /**
     * Registers the CSS and JS files with the given view.
     * @param \yii\web\View $view the view that the asset files are to be registered with.
     */
    public function registerAssetFiles($view)
    {
        if (self::$adaptersJs) {
            $this->js = array_merge($this->js, self::$adaptersJs);
        }
        parent::registerAssetFiles($view);
    }

}
