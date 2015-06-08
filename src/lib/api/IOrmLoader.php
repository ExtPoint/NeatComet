<?php
namespace NeatComet\api;

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
     * @returns array Array of records data
     */
    public function loadRecords($modelClass, $match, $whereType, $where, $attributes);

}
