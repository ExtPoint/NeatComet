<?php

namespace NeatComet\channels;

use NeatComet\bindings\BindingServer;
use NeatComet\Exception;
use NeatComet\Object;

abstract class BaseChannelServer extends  Object {

    /** @var BindingServer */
    public $binding;

    abstract public function sendAdd($attributeValues);

    abstract public function sendUpdate($updatedAttributeValues, $oldAttributeValues);

    abstract public function sendRemove($oldAttributeValues);

    /**
     * @param string|null $routeMode
     * @return self
     * @throws Exception
     */
    public static function create($routeMode) {

        switch ($routeMode) {
            case null: // Direct is default
            case 'direct': return new DirectChannelServer;
            case 'merged': return new MergedChannelServer;
            default: throw new Exception('Unknown routeMode: ' . $routeMode);
        }
    }
}
