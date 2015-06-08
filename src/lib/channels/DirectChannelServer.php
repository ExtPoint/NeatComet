<?php

namespace NeatComet\channels;

class DirectChannelServer extends BaseChannelServer {

    const CONSTANT_CHANNEL = '1';

    protected static function iterateParams($params, $restParams, $tailFn) {

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
     * @param string[]|string[][] $params
     * @return string[]
     */
    public function getChannels($params) {

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
                foreach ($this->binding->applyAttributesToMatchObject($scalarParams) as $name => $value) {
                    if ($channel !== '') {
                        $channel .= ':';
                    }
                    $channel .= $name . '=' . $value;
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
    public function getChannel($attributes) {

        // Format by template, if any
        if (isset($this->binding->channelTemplate)) {
            return preg_replace_callback(
                '/{(\w+)}/',
                function($matches) use ($attributes) {
                    return $attributes[$matches[1]];
                },
                $this->binding->channelTemplate
            );
        }

        // Format by match object, if set
        if (isset($this->binding->match)) {
            $channel = '';
            foreach ($this->binding->applyAttributesToMatchObject($attributes) as $name => $value) {
                if ($channel !== '') {
                    $channel .= ':';
                }
                $channel .= $name . '=' . $value;
            }
            return $channel;
        }

        // Constant, if none
        return self::CONSTANT_CHANNEL;
    }

    private function push($channel, $args) {

        $this->binding->neatComet->comet->broadcast(
            // TODO: Decide what should be channel like
            $this->binding->profile . ':' . $this->binding->id . ':' . $channel,
            $args
        );
    }

    public function sendAdd($attributeValues) {

        $this->push($this->getChannel($attributeValues), ["add", $attributeValues]);
    }

    public function sendUpdate($updatedAttributeValues, $oldAttributeValues) {

        $newChannel = $this->getChannel($updatedAttributeValues);
        $oldChannel = $this->getChannel($oldAttributeValues);

        if ($newChannel !== $oldChannel) {
            $this->push($newChannel, ["add", $updatedAttributeValues]);
            $this->push($oldChannel, ["remove", $oldAttributeValues]);
        }
        else {
            $this->push($newChannel, ["update", $updatedAttributeValues, $oldAttributeValues]);
        }
    }

    public function sendRemove($oldAttributeValues) {

        $this->push($this->getChannel($oldAttributeValues), ["remove", $oldAttributeValues]);
    }
}
