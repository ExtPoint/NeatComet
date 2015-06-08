<?php
namespace NeatComet\configReader;

use NeatComet\Exception;

class ConfigReader {

    /**
     * @param string $fileName
     * @return array
     */
    public static function read($fileName)
    {
        // Read
        $data = self::readJson($fileName);

        // Get profiles
        $profiles = isset($data->profiles) ? (array)$data->profiles : [];

        // Include
        if (isset($data->includes)) {

            if (isset($data->basePath) && $data->basePath !== '') {
                $basePath = ($data->basePath{0} === '/') ?
                    $data->basePath :
                    (dirname($fileName) . '/' . $data->basePath);
            }
            else {
                $basePath = dirname($fileName);
            }

            foreach ($data->includes as $subFile) {

                $profiles += self::read($basePath . '/' . $subFile);
            }
        }

        return $profiles;
    }

    protected static function readJson($jsonFile) {

        $json = file_get_contents($jsonFile);

        // TODO: strip comments, but skip strings

        $result = json_decode($json);
        if ($result === null && $json !== 'null') {
            throw new Exception('Incorrect JSON in ' . $jsonFile);
        }

        return $result;
    }

}
