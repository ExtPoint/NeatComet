<?php
/**
 * @copyright Copyright 2014-2017 <a href="http://www.extpoint.com">ExtPoint</a>
 * @author <a href="http://koryagin.com">Pavel Koryagin</a>
 * @license MIT
 */
namespace NeatComet\bindings;

use NeatComet\api\ICometClient;
use NeatComet\api\IOrmLoader;
use NeatComet\channels\BaseChannelServer;
use NeatComet\Exception;
use NeatComet\Object;

class BindingServer extends Object {

    /** Id **/

    /** @var string */
    public $profileId;

    /** @var string */
    public $id;


    /** Definition **/

    /** @var \StdClass */
    public $definition;

    /** @var string|string[] */
    public $idField = 'id';

    /** @var string */
    public $idDelimiter = '-';

    /** @var \StdClass|null */
    public $match;

    /** @var \StdClass|null */
    public $matchConst;

    /** @var string|null */
    public $where;

    /** @var string|null */
    public $whereSql;

    /** @var string|null */
    public $channelTemplate;

    /** @var string|null */
    public $routeMode;

    /** @var string|null */
    public $limitParam;

    /** @var string[]|null */
    public $limitOrder;

    /** @var string[]|null */
    public $attributes;

    /** @var string */
    public $serverModel;

    /** @var \StdClass|null */
    public $client;


    /** Components **/

    /** @var IOrmLoader */
    public $ormLoader;

    /** @var ICometClient */
    public $comet;

    /** @var BaseChannelServer */
    public $channel;

    /** @var boolean[] */
    public $masterKeys = [];

    /** @var array|null */
    public $attributesFilter = null;


    /**
     * @throws Exception
     */
    public function init() {

        // Cache helpers
        if ($this->attributes !== null) {
            $this->attributesFilter = array_flip($this->attributes);
        }

        // Assign params
        foreach ($this->definition as $key => $value) {
            if (property_exists($this, $key)) {
                $this->{$key} = $value;
            }
            else {
                throw new Exception('Parameter ' . $key . ' is not valid for ' . get_class($this));
            }
        }

        // Expand shortcuts
        if (is_array($this->match)) {
            $this->match = (object)array_combine($this->match, $this->match);
        }
        elseif ($this->match === null && $this->channelTemplate !== null) {
            if (preg_match_all('/{(\w+)}/', $this->channelTemplate, $matches)) {
                $this->match = (object)array_combine($matches[1], $matches[1]);
            }
        }

        if (isset($this->whereSql) && !isset($this->where)) {
            throw new Exception('Misuse of where. When using language-specific load time "where" clause, the EXACTLY SAME JavaScript version must be in "where" param for the router.');
        }

        $this->channel = BaseChannelServer::create($this->routeMode);
        $this->channel->comet = $this->comet;
        $this->channel->binding = $this;
        $this->channel->init();
    }

    /**
     * @param BindingServer[] $allBindings
     */
    public function initRelations($allBindings) {

        if ($this->match) {
            foreach ($this->match as $name => $source) {

                // Test for "masterBinding.attribute"
                if (substr($name, -1) !== '=') {
                    $pos = strpos($source, '.');
                    if ($pos !== false) {

                        // Set
                        $allBindings[substr($source, 0, $pos)]->masterKeys[substr($source, $pos + 1)] = true;
                    }
                }
            }
        }
    }

    /**
     * @param array $request
     * @return array|null
     */
    public function loadDataLocally($request) {

        $match = isset($this->match) ?
            $this->applyRequestToMatchObject($request) :
            null;

        $limit = ($this->limitParam !== null && isset($request[$this->limitParam])) ?
            $request[$this->limitParam] :
            null;

        if (isset($this->whereSql)) {

            $data = $this->ormLoader->loadRecords(
                $this->serverModel,
                $match,
                IOrmLoader::WHERE_SQL,
                $this->whereSql,
                $request,
                $this,
                $limit
            );
        }

        elseif (isset($this->where)) {

            $data = $this->ormLoader->loadRecords(
                $this->serverModel,
                $match,
                IOrmLoader::WHERE_JS,
                $this->where,
                $request,
                $this,
                $limit
            );
        }

        else {
            $data = $this->ormLoader->loadRecords(
                $this->serverModel,
                $match,
                IOrmLoader::WHERE_NONE,
                null,
                null,
                $this,
                $limit
            );
        }

        // Filter loaded attributes
        if ($this->attributesFilter !== null) {
            foreach ($data as &$item) {
                $item = array_intersect_key($item, $this->attributesFilter);
            }
        }

        // Pack
        return $data;
    }

    /**
     * @param array $request
     * @return \StdClass
     */
    public function applyRequestToMatchObject($request) {

        $result = new \StdClass;

        // Apply match
        if ($this->match !== null) {
            foreach ($this->match as $attributeName => $requestName) {
                if (is_array($requestName)) {
                    $list = [];
                    foreach ($list as $requestNameScalar) {
                        if (is_array($request[$requestNameScalar])) {
                            $list = array_merge($list, $request[$requestNameScalar]);
                        }
                        else {
                            $list[] = $request[$requestNameScalar];
                        }
                    }
                    $result->{$attributeName} = $list;
                }
                else {
                    $result->{$attributeName} = $request[$requestName];
                }
            }
        }

        // Apply constants
        if ($this->matchConst !== null) {
            foreach ($this->matchConst as $attributeName => $value) {
                if (property_exists($result, $attributeName)) {
                    if (!is_array($result->{$attributeName})) {
                        $result->{$attributeName} = [$result->{$attributeName}];
                    }
                    if (is_array($value)) {
                        $result->{$attributeName} = array_merge($result->{$attributeName}, $value);
                    }
                    else {
                        $result->{$attributeName}[] = $value;
                    }
                }
                else {
                    $result->{$attributeName} = $value;
                }
            }
        }

        return $result;
    }

    /**
     * @param array $attributes
     * @return \StdClass
     */
    public function applyAttributesToMatchObject($attributes) {

        $result = new \StdClass;

        // Apply match
        if ($this->match !== null) {
            // This is array_intersect_key, but for StdClass
            foreach ($this->match as $attributeName => $requestName) {
                $result->{$attributeName} = $attributes[$attributeName];
            }
        }

        // Apply constants
        if ($this->matchConst !== null) {
            foreach ($this->matchConst as $attributeName => $value) {
                $result->{$attributeName} = $attributes[$attributeName];
            }
        }

        return $result;
    }

    /**
     * @param string $whereJs
     * @return string
     */
    public static function convertWhereJsToSql($whereJs) {

        $where = $whereJs;
        $where = str_replace('&&', ' AND ', $where);
        $where = str_replace('||', ' OR ', $where);
        $where = str_replace('!=', ' <> ', $where);
        $where = str_replace('!', ' NOT ', $where);
        $where = preg_replace_callback('/{(\w+)}/', function($matches) {
            return ':' . $matches[1];
        }, $where);
        return $where;
    }

    /**
     * @param string $sql
     * @param array $attributes
     * @return string[]
     */
    public static function filterAttributesBySqlParams($sql, $attributes) {

        if (preg_match_all('/:(\w+)/', $sql, $matches)) {
            return array_intersect_key($attributes, array_flip($matches[1]));
        }
        else {
            return [];
        }
    }
}
