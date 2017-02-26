<?php
/**
 * @copyright Copyright 2014-2017 <a href="http://www.extpoint.com">ExtPoint</a>
 * @author <a href="http://koryagin.com">Pavel Koryagin</a>
 * @license MIT
 */
namespace NeatComet;

define('NeatComet\LIB_PATH', __DIR__ . '/lib');

function autoload($className) {

    if (strpos($className, 'NeatComet\\') === 0) {
        require LIB_PATH . '/' . str_replace('\\', '/', substr($className, 10)) . '.php';
    }

}

spl_autoload_register('\NeatComet\autoload', true, true);
