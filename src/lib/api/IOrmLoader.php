<?php
/**
 * @copyright Copyright 2014-2017 <a href="http://www.extpoint.com">ExtPoint</a>
 * @author <a href="http://koryagin.com">Pavel Koryagin</a>
 * @license MIT
 */
namespace NeatComet\api;

use NeatComet\bindings\BindingServer;

interface IOrmLoader {

    const TABLE_ALIAS_IN_SQL = 'model';

    const WHERE_NONE = 'none';
    const WHERE_JS = 'js';
    const WHERE_SQL = 'sql';

    /**
     * @param string $modelClass
     * @param \StdClass|null $match
     * @param string $whereType
     * @param string|null $where
     * @param array $attributes
     * @param BindingServer $binding
     * @param int[]|int|null $limit
     * @param int [$totalCount]
     * @returns array Array of records data
     */
    public function loadRecords($modelClass, $match, $whereType, $where, $attributes, $binding, $limit, &$totalCount = null);

}
