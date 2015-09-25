<?php
namespace NeatComet\configReader;

use NeatComet\Exception;

class ConfigReader {

    /** @var string */
    public $fileName;

    /** @var array */
    public $profiles;

    /**
     * @return array
     * @throws Exception
     */
    public function read()
    {
        if (!$this->fileName) {
            throw new Exception('fileName property required in ' . __CLASS__);
        }

        // Read
        $data = self::readJson($this->fileName);

        // Get profiles
        $profiles = isset($data->profiles) ? (array)$data->profiles : [];

        // Include
        if (isset($data->includes)) {

            if (isset($data->basePath) && $data->basePath !== '') {
                $basePath = ($data->basePath{0} === '/') ?
                    $data->basePath :
                    (dirname($this->fileName) . '/' . $data->basePath);
            }
            else {
                $basePath = dirname($this->fileName);
            }

            foreach ($data->includes as $subFile) {

                $profiles += self::readFile($basePath . '/' . $subFile);
            }
        }

        $this->profiles = $profiles;

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

    /**
     * @param string $fileName
     * @return array
     * @throws Exception
     */
    public static function readFile($fileName) {
        $reader = new self;
        $reader->fileName = $fileName;
        return $reader->read();
    }


    /**
     * @return array
     */
    public function getClientParams() {

        if ($this->profiles === null) {
            $this->read();
        }

        $result = [];

        foreach ($this->profiles as $profileId => $profileDefinition) {
            foreach ($profileDefinition as $bindingId => $bindingDefinition) {
                if (array_key_exists('client', $bindingDefinition)) {
                    $result[$profileId][$bindingId] = $bindingDefinition['client'];
                }
            }
        }

        return $result;
    }
}
