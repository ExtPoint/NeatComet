<?php
namespace NeatComet;

/**
 * Basic class supports two types of initialization
 *
 * I. Single operator call. Note: init() is being called internally
 * var x = new X({
 *     abc: 123
 * });
 *
 * II. Explicit initialization
 * var x = new X; // Don't pass any parameter in constructor. init() won't be called implicitly.
 * x.abc = 123;
 * x.init();
 *
 * @class NeatComet.Object
 */
class Object {

    /**
     * @param array [$config]
     */
    public function __construct($config = null) {

        if ($config !== null) {
            foreach ($config as $key => $value) {
                $this->{$key} = $value;
            }
            $this->init();
        }
    }

    public function init() {

    }
}
