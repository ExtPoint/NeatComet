<?php
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

    /** @var BindingServer[][] */
    protected $profileBindings;

    /** @var BindingServer[][] */
    protected $modelBindings;

    public function init() {

        $this->setupBindings();
    }

    protected function setupBindings() {

        // Apply settings
        foreach (ConfigReader::readFile($this->configFileName) as $profile => $definitions) {

            foreach ($definitions as $id => $definition) {

                // Create handler
                $binding = new BindingServer;
                $binding->manager = $this;
                $binding->profile = $profile;
                $binding->id = $id;
                $binding->definition = $definition;
                $binding->init();

                // Store
                $this->profileBindings[$profile][$id] = $binding;
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
            list($profile, $bindingId, $request) = $entry;
            $result[] = $this->profileBindings[$profile][$bindingId]->loadDataLocally($request);
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
                if ($binding->client !== null) {
                    $result[$profileId][$bindingId] = $binding->client;
                }
            }
        }

        return $result;
    }
}
