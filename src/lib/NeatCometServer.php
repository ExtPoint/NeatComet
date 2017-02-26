<?php
/**
 * @copyright Copyright 2014-2017 <a href="http://www.extpoint.com">ExtPoint</a>
 * @author <a href="http://koryagin.com">Pavel Koryagin</a>
 * @license MIT
 */
namespace NeatComet;

use NeatComet\api\ICometClient;
use NeatComet\api\IOrmLoader;
use NeatComet\bindings\BindingServer;
use NeatComet\configReader\ConfigReader;

class NeatCometServer extends Object {

    /** @var string */
    public $configFileName;

    /** @var ICometClient */
    public $comet;

    /** @var IOrmLoader */
    public $ormLoader;

    /** @var BindingServer[][] Read-only, if outside, please */
    public $profileBindings;

    /** @var BindingServer[][] */
    protected $modelBindings;

    public function init() {

        $this->setupBindings();
    }

    protected function setupBindings() {

        // Apply settings
        foreach (ConfigReader::readFile($this->configFileName) as $profileId => $definitions) {

            foreach ($definitions as $id => $definition) {

                // Create handler
                $binding = new BindingServer;
                $binding->ormLoader = $this->ormLoader;
                $binding->comet = $this->comet;
                $binding->profileId = $profileId;
                $binding->id = $id;
                $binding->definition = $definition;
                $binding->init();

                // Store
                $this->profileBindings[$profileId][$id] = $binding;
                $this->modelBindings[$definition->serverModel][] = $binding;
            }
        }

        // Init relations
        foreach ($this->profileBindings as $profileBindings) {
            foreach ($profileBindings as $binding) {
                $binding->initRelations($profileBindings);
            }
        }

    }

    public function broadcastEvent($modelClass, $method) {

        if (isset($this->modelBindings[$modelClass])) {

            // Get passed args
            $args = array_slice(func_get_args(), 2);

            // Call each
            foreach ($this->modelBindings[$modelClass] as $binding) {
                call_user_func_array([$binding->channel, $method], $args);
            }
        }
    }

    public function loadDataLocally($list) {

        $result = [];

        foreach ($list as $entry) {
            list($profileId, $bindingId, $request) = $entry;
            $result[] = $this->profileBindings[$profileId][$bindingId]->loadDataLocally($request);
        }

        return $result;
    }

    /**
     * @param string|string[]|null $profiles
     * @return array
     */
    public function getClientParams($profiles = null) {

        $result = [];

        if ($profiles === null) {
            $profiles = array_keys($this->profileBindings);
        }

        foreach ((array)$profiles as $profileId) {
            foreach ($this->profileBindings[$profileId] as $bindingId => $binding) {
                $result[$profileId][$bindingId] = $binding->client ?: null;
            }
        }

        return $result;
    }
}
