<?php
/**
 * @copyright Copyright 2014-2017 <a href="http://www.extpoint.com">ExtPoint</a>
 * @author <a href="http://koryagin.com">Pavel Koryagin</a>
 * @license MIT
 */
namespace NeatComet\channels;

class DirectChannelServer extends BaseChannelServer {

    const CONSTANT_CHANNEL = '1';

    private static function iterateParams($params, $restParams, $tailFn) {

        reset($restParams);
        while (list($name, $value) = each($restParams)) {

            if (is_scalar($value)) {

                // Client has disabled the channel
                if ($value === null) {
                    return;
                }

                // Collect
                // It is already there // $params[$name] = $value;
            }
            else {
                // Get new tail
                $newRest = [];
                while (list($restName, $restValue) = each($restParams)) {
                    $newRest[$restName] = $restValue;
                }

                // Recurse for each
                foreach ($value as $scalarValue) {
                    $params[$name] = $scalarValue;
                    self::iterateParams($params, $newRest, $tailFn);
                }

                // Quit recursion. Tail was already there
                return;
            }
        }

        // Finish
        $tailFn($params);
    }

    /**
     * @param string[]|string[][]|\StdClass $params
     * @return string[]
     */
    private function getChannels($params) {

        // Format by template, if any
        if (isset($this->binding->channelTemplate)) {
            $result = [];
            self::iterateParams($params, $params, function($scalarParams) use (&$result) {
                $result[] = preg_replace_callback(
                    '/{(\w+)}/',
                    function($matches) use ($scalarParams) {
                        return $scalarParams[$matches[1]];
                    },
                    $this->binding->channelTemplate
                );
            });
            return $result;
        }

        // Format by match object, if set
        if (isset($this->binding->match)) {
            $result = [];
            self::iterateParams($params, $params, function($scalarParams) use (&$result) {
                $channel = '';
                foreach ($scalarParams as $name => $value) {
                    if ($channel !== '') {
                        $channel .= ':';
                    }
                    $channel .= $value === null ? $name : ($name . '=' . $value);
                }
                $result[] = $channel;
            });
            return $result;
        }

        // Constant, if none
        return [self::CONSTANT_CHANNEL];
    }

    /**
     * @param string[] $attributes
     * @return string
     */
    private function getChannelByAttributes($attributes) {
        return $this->getChannel($this->binding->applyAttributesToMatchObject($attributes));
    }

    /**
     * @param string[]|\StdClass $params
     * @return string
     */
    private function getChannel($params) {

        // Format by template, if any
        if (isset($this->binding->channelTemplate)) {
            return preg_replace_callback(
                '/{(\w+)}/',
                function($matches) use ($params) {
                    return $params[$matches[1]];
                },
                $this->binding->channelTemplate
            );
        }

        // Format by match object, if set
        if (isset($this->binding->match)) {
            $channel = '';
            foreach ($params as $name => $value) {
                if ($channel !== '') {
                    $channel .= ':';
                }
                $channel .= $value === null ? $name : ($name . '=' . $value);
            }
            return $channel;
        }

        // Constant, if none
        return self::CONSTANT_CHANNEL;
    }

    private function push($channel, $args) {

        $this->comet->broadcast(
            // TODO: Decide what should be channel like
            $this->binding->profileId . ':' . $this->binding->id . ':' . $channel,
            $args
        );
    }

    public function sendAdd($attributeValues) {

        $channel = $this->getChannelByAttributes($attributeValues);

        // Filter
        if ($this->binding->attributesFilter !== null) {
            $attributeValues = array_intersect_key($attributeValues, $this->binding->attributesFilter);
        }

        // Send
        $this->push($channel, ["add", $attributeValues]);
    }

    public function sendUpdate($updatedAttributeValues, $oldAttributeValues) {

        $newChannel = $this->getChannelByAttributes($updatedAttributeValues);
        $oldChannel = $this->getChannelByAttributes($oldAttributeValues);

        // Filter
        if ($this->binding->attributesFilter !== null) {
            $updatedAttributeValues = array_intersect_key($updatedAttributeValues, $this->binding->attributesFilter);
            $oldAttributeValues = array_intersect_key($oldAttributeValues, $this->binding->attributesFilter);
        }

        // Send
        if ($newChannel !== $oldChannel) {
            $this->push($newChannel, ["add", $updatedAttributeValues]);
            $this->push($oldChannel, ["remove", $oldAttributeValues]);
        }
        else {
            $this->push($newChannel, ["update", $updatedAttributeValues, $oldAttributeValues]);
        }
    }

    public function sendRemove($oldAttributeValues) {

        $channel = $this->getChannelByAttributes($oldAttributeValues);

        // Filter
        if ($this->binding->attributesFilter !== null) {
            $oldAttributeValues = array_intersect_key($oldAttributeValues, $this->binding->attributesFilter);
        }

        // Send
        $this->push($channel, ["remove", $oldAttributeValues]);
    }
}
