<?php
namespace NeatComet\adapters\yii2;

use NeatComet\api\IOrmLoader;
use NeatComet\bindings\BindingServer;
use NeatComet\Exception;
use NeatComet\NeatCometServer;
use yii\base\Object;
use yii\db\ActiveQuery;
use yii\db\ActiveRecord;

class NeatCometComponent extends Object implements IOrmLoader {

    /** @var string|\Closure */
    public $cometComponent;

    /** @var NeatCometServer */
    public $server;

    /** @var boolean */
    public $enable = true;

    /** @var bool|bool[] */
    public $hasDynamicAttributes = false;

    public function __construct(array $config = []) {

        // Create aggregate
        $this->server = new NeatCometServer();

        // Extract NeatComet parameters
        foreach ($config as $name => $value) {
            if (property_exists($this->server, $name)) {
                $this->server->$name = $value;
                unset($config[$name]);
            }
        }

        parent::__construct($config);
    }

    public function init() {

        // Check set
        if ($this->cometComponent === null) {
            throw new Exception('cometComponent property of ' . __CLASS__ . ' is required');
        }

        // Attach comet interface
        $this->server->comet = is_string($this->cometComponent) ?
            \Yii::$app->{$this->cometComponent} :
            call_user_func($this->cometComponent);

        // Expose this as ORM adapter
        $this->server->ormLoader = $this;

        // Init library's object
        $this->server->init();

        parent::init();
    }

    /**
     * @param string|ActiveRecord $modelClass
     * @param \StdClass|null $match
     * @param string $whereType
     * @param string|null $where
     * @param string[] $attributes
     * @param BindingServer $binding
     * @returns array Array of records data
     * @throws Exception
     */
    public function loadRecords($modelClass, $match, $whereType, $where, $attributes, $binding) {

        /** @var ActiveQuery $query */
        $query = $modelClass::find();

        // Apply match condition
        if ($match) {
            $query->where((array)$match);
        }

        // Apply custom filter
        switch ($whereType) {

            case IOrmLoader::WHERE_NONE:
                // Find all
                break;

            case IOrmLoader::WHERE_JS:
                $where = BindingServer::convertWhereJsToSql($where);
                // no break;

            case IOrmLoader::WHERE_SQL:
                $query
                    ->from($modelClass::tableName() . ' ' . IOrmLoader::TABLE_ALIAS_IN_SQL)
                    ->andWhere((string)$where, BindingServer::filterAttributesBySqlParams($where, $attributes));
                break;

            default:
                throw new Exception('Where type "' . $whereType . '" is not implemented');
        }

        // Query via model implementation
        if (
            $this->hasDynamicAttributes === true
            || is_array($this->hasDynamicAttributes) && !empty($this->hasDynamicAttributes[$modelClass])
        ) {
            $result = [];
            foreach ($query->all() as $model) {
                $result[] = $model->attributes; // Filter is outside loadRecords()
            }
            return $result;
        }
        // Direct db query
        else {
            if ($binding->attributes !== null) {
                $query->select($binding->attributes);
            }
            return $query->asArray()->all();
        }
    }

    /**
     * @param ActiveRecord $model
     * @param boolean $insert
     * @param array $changedAttributes
     */
    public function afterSave($model, $insert, $changedAttributes) {
        if (!$this->enable) {
            return;
        }

        if ($insert) {

            $this->server->broadcastEvent(
                // Route
                get_class($model), 'sendAdd',
                // Params
                $model->attributes
            );
        }
        else {

            $this->server->broadcastEvent(
                // Route
                get_class($model), 'sendUpdate',
                // Params
                $model->attributes, $changedAttributes + $model->oldAttributes
            );
        }

    }

    /**
     * @param ActiveRecord $model
     */
    public function afterDelete($model) {
        if (!$this->enable) {
            return;
        }

        $this->server->broadcastEvent(
            // Route
            get_class($model), 'sendRemove',
            // Params
            $model->attributes
        );
    }

}
