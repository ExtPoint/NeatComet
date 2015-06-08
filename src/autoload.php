<?php
namespace NeatComet;

define('NeatComet\LIB_PATH', __DIR__ . '/lib');

function autoload($className) {

    if (strpos($className, 'NeatComet\\') === 0) {
        require LIB_PATH . '/' . str_replace('\\', '/', substr($className, 10)) . '.php';
    }

}

spl_autoload_register('\NeatComet\autoload', true, true);
