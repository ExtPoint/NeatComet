/**
 * @copyright Copyright 2014 <a href="http://www.extpoint.com">ExtPoint</a>
 * @author <a href="http://koryagin.com">Pavel Koryagin</a>
 * @license MIT
 */
var when = require('when');

var UNINITIALIZED_PARAM = {};

/**
 * @class NeatComet.router.OpenedProfileServer
 * @extends NeatComet.Object
 */
var self = NeatComet.router.OpenedProfileServer = NeatComet.Object.extend(/** @lends NeatComet.router.OpenedProfileServer.prototype */{

    /** @type {number} */
    id: null,

    /** @type {string} */
    profileId: null,

    /** @type {Object.<string, NeatComet.bindings.BindingServer>} */
    bindings: null,

    /** @type {NeatComet.router.ConnectionServer} */
    connection: null,

    /** @type {Object.<string, *>} */
    requestParams: null,

    /** @type {Object.<string, Object.<string, (Function|boolean)>>} */
    _channelFilters: null,

    /** @type {Object.<string, Object.<string, Object.<string, boolean>>>} */
    _knownModels: null,

    /** @type {Object.<string, *>} Just a cache for XxxChannelServer */
    pushers: null,


    constructor: function() {
        this._channelFilters = {};
        this._knownModels = {};
        this.pushers = {};
    },

    init: function() {

        this.bindings = this.connection.manager.profileBindings[this.profileId];

        // Init master values
        _.each(this.bindings, function(binding) {
            _.each(binding.masterKeys, function(dummy, name) {
                this.requestParams[binding.id + '.' + name] = UNINITIALIZED_PARAM;
            }, this);
        }, this);
    },

    /**
     * @private
     */
    _initMasterKeysForLoad: function() {

        _.each(this.bindings, function(binding) {

            // Reset master keys
            _.each(binding.masterKeys, function(dummy, name) {
                this.requestParams[binding.id + '.' + name] = UNINITIALIZED_PARAM;
            }, this);
            this._knownModels[binding.id] = {};

            // Attach channels, before load data
            // WAS HERE, TEMPORARY MOVED // binding.channel.openProfile(this);

        }, this);

    },

    open: function() {

        // Extracted for use in updateMasterValues tests
        this._initMasterKeysForLoad();

        // Load
        return this
            ._loadNext({
                loaded: {},
                loadNow: null,
                loadNext: this.bindings
            })
            .then(_.bind(function(result) {

                // Skip, if profile was closed during DB call
                if (this.profileId) {

                    // Attach channels, before load data
                    _.each(this.bindings, function(binding) {
                        binding.channel.openProfile(this);
                    }, this);
                }

                return result;
            }, this));
    },

    /**
     * @param {Object} sets
     * @param {Object.<string, Object>} sets.loaded
     * @param {Object.<string, NeatComet.bindings.BindingServer>} sets.loadNow
     * @param {Object.<string, NeatComet.bindings.BindingServer>} sets.loadNext
     * @returns {Promise}
     * @private
     */
    _loadNext: function(sets) {

        var hasInstantlyLoaded = false;

        // Extract current portion and reset lists
        var bindings = sets.loadNext;
        sets.loadNow = {};
        sets.loadNext = {};


        // Bind server
        _.each(bindings, function(binding) {

            var targetSet = sets.loadNow;

            _.find(binding.match, function(paramKey /*, attributeKey*/) {

                // Empty array in params = empty array of models
                var value = this.requestParams[paramKey];
                if (_.isArray(value) && value.length === 0) {

                    // Set result without DB query
                    this._markBindingLoaded(binding);
                    sets.loaded[binding.id] = [];
                    hasInstantlyLoaded = true;

                    // Stop
                    targetSet = null;
                    return true;
                }

                if (value === UNINITIALIZED_PARAM) {
                    targetSet = sets.loadNext;
                }
            }, this);

            // Plan work
            if (targetSet) {
                targetSet[binding.id] = binding;
            }

        }, this);

        // Quit recursion
        if (_.isEmpty(sets.loadNow)) {

            // Check sanity
            if (!_.isEmpty(sets.loadNext)) {

                // Handle successful load, if any
                if (hasInstantlyLoaded) {
                   return this._loadNext(sets);
                }

                throw new NeatComet.Exception('Cycle links in bindings of "' + this.profileId + '" profile');
            }

            return when.resolve(sets.loaded);
        }

        // Create data loader
        var dataLoader = this._createDataLoader();

        // Bind server
        _.each(sets.loadNow, function(binding) {
            dataLoader.addParams(binding.id, this.requestParams, binding.id);
        }, this);

        // Load and start next chain
        return dataLoader.load()
            .then(this._handleLoaded.bind(this, sets, dataLoader.associations));
    },

    /**
     * @param {NeatComet.bindings.BindingServer} binding
     * @private
     */
    _markBindingLoaded: function(binding) {

        // Replace UNINITIALIZED_PARAM with empty values
        _.each(binding.masterKeys, function(dummy, name) {
            this.requestParams[binding.id + '.' + name] = [];
        }, this);
    },

    /**
     * @param {Object} sets
     * @param {Object.<string, Object>} sets.loaded
     * @param {Object.<string, NeatComet.bindings.BindingServer>} sets.loadNow
     * @param {Object.<string, NeatComet.bindings.BindingServer>} sets.loadNext
     * @param {string[]} bindingIds
     * @param {Array} data
     * @returns {Promise|null}
     * @private
     */
    _handleLoaded: function(sets, bindingIds, data) {

        // Stop, if profile was closed during DB call
        if (!this.profileId) {
            return null;
        }

        _.each(bindingIds, function(bindingId, index) {

            var binding = sets.loadNow[bindingId];

            // Mark master keys loaded
            this._markBindingLoaded(binding);

            // Save loaded master keys
            if (!_.isEmpty(binding.masterKeys)) {
                _.each(data[index], function (attributes) {
                    this.updateMasterValues(
                        bindingId,
                        binding.getIdFromAttributes(attributes),
                        NeatComet.NeatCometServer.intersectKeys(attributes, binding.masterKeys),
                        null,
                        null,
                        true // No cascade
                    );
                }, this);
            }

            // Write data
            sets.loaded[bindingId] = data[index];
        }, this);

        // Load rest
        return this._loadNext(sets);
    },

    /**
     * @returns {NeatComet.router.DataLoaderServer}
     * @private
     */
    _createDataLoader: function() {

        // Create data loader
        var dataLoader = new NeatComet.router.DataLoaderServer;
        dataLoader.manager = this.connection.manager;
        dataLoader.profileId = this.profileId;
        dataLoader.init();

        return dataLoader;
    },

    destroy: function() {

        // Unsubscribe
        _.each(this._channelFilters, function(channelFilters, bindingId) {
            this.removeChannels(bindingId, channelFilters);
        }, this);

        // Mark ready to remove
        this.profileId = null;

        // Unlink
        this.connection.removeOpenedProfile(this.id);

        // Help to garbage collector
        this.connection = null;
    },

    /**
     * @param {string} bindingId
     * @param {NeatComet.channels.ChannelsMap} channelsMap
     * @param {Function} [directSender]
     */
    addChannels: function(bindingId, channelsMap, directSender) {

        var canForward = this.connection.comet.getSupportsForwardToClient();

        var channelFilters = this._channelFilters[bindingId];

        // Construct hash
        if (!channelFilters) {
            channelFilters = this._channelFilters[bindingId] = {};
        }

        _.each(channelsMap, function(filterAndSender, channel) {

            if (filterAndSender === directSender && canForward) {

                // Mark here
                channelFilters[channel] = true;

                // Connect to channel
                this.connection.comet.forwardToClient(channel);
            }
            else {

                // Mark here
                channelFilters[channel] = filterAndSender;

                // Connect to channel
                this.connection.comet.subscribe(channel, filterAndSender);
            }

        }, this);
    },

    /**
     * @param {string} bindingId
     * @param {NeatComet.channels.ChannelsMap} channelsMap
     */
    removeChannels: function(bindingId, channelsMap) {

        var channelFilters = this._channelFilters[bindingId];

        _.each(channelsMap, function(dummy, channel) {

            var filterAndSender = channelFilters[channel];

            // Mark here
            delete channelFilters[channel];

            // Disconnect from channel
            if (filterAndSender === true) {
                this.connection.comet.stopForwardingToClient(channel);
            }
            else {
                this.connection.comet.unsubscribe(channel, filterAndSender);
            }

        }, this);
    },

    /**
     * @param {string} bindingId
     * @param {NeatComet.channels.ChannelsMap} channelsMap
     * @param {Function} [directSender]
     */
    updateChannels: function(bindingId, channelsMap, directSender) {

        // Classify
        var add = {};
        var remove = {};
        var current = this._channelFilters[bindingId];

        // Add new
        _.each(channelsMap, function(filterAndSender, channel) {
            if (!current || current[channel] !== filterAndSender) {
                add[channel] = filterAndSender;
            }
        }, this);

        // Remove absent
        _.each(current, function(filterAndSender, channel) {
            if (channelsMap[channel] !== filterAndSender) {
                remove[channel] = filterAndSender;
            }
        }, this);

        // Apply
        this.removeChannels(bindingId, remove);
        this.addChannels(bindingId, add, directSender);
    },

    /**
     *
     * @param {string} bindingId
     * @param {string|null} addOfModelId
     * @param {Object.<string, string>|null} addValues
     * @param {string|null} [removeOfModelId]
     * @param {Object.<string, string>|null} [removeValues]
     * @param {Boolean} [noCascade]
     */
    updateMasterValues: function(bindingId, addOfModelId, addValues, removeOfModelId, removeValues, noCascade) {

        var binding = this.bindings[bindingId];

        // Detect related, reload them
        var added = {};
        var paramsBeforeOperation;
        var minimalParams;
        var removed = {};

        // Allow calls on empty master keys
        if (_.isEmpty(addValues) && _.isEmpty(removeValues)) {
            return;
        }

        if (!noCascade) {
            paramsBeforeOperation = NeatComet.NeatCometServer.cloneRecursive(this.requestParams);
            minimalParams = NeatComet.NeatCometServer.cloneRecursive(this.requestParams);
        }

        _.each(addValues, function(value, name) {

            // Ensure type is correct
            value = String(value);

            var bindingHash = this._knownModels[bindingId];

            var attributeHash = bindingHash[name];
            if (!attributeHash) {
                bindingHash[name] = attributeHash = {};
            }

            var valueHash = attributeHash[value];
            if (!valueHash) {

                this.requestParams[bindingId + '.' + name].push(value);
                attributeHash[value] = valueHash = {};

                // Prepare data load
                added[name] = value;
            }

            valueHash[addOfModelId] = true;
        }, this);

        _.each(removeValues, function(value, name) {

            // Ensure type is correct
            value = String(value);

            var attributeHash = this._knownModels[bindingId][name];
            var valueHash = attributeHash[value];

            // This condition prevents crash in case of unexpected input
            // During normal flow it must be always true
            if (valueHash && valueHash[removeOfModelId]) {

                delete valueHash[removeOfModelId];

                if (_.isEmpty(valueHash)) {

                    delete attributeHash[value];
                    var paramName = bindingId + '.' + name;
                    var values = this.requestParams[paramName];
                    values.splice(values.indexOf(value), 1);

                    removed[name] = value;
                    if (minimalParams) {
                        minimalParams[paramName].splice(minimalParams[paramName].indexOf(value), 1);
                    }

                    // Don't delete bindingHash and nameHash, in fact they are constant
                }
            }
        }, this);

        // Stop here, if no work
        if (_.isEmpty(added) && _.isEmpty(removed)) {
            return;
        }

        var channelsToUpdate = {};

        // Simplified channels update, if no cascade
        if (noCascade) {

            // Collect related binding channel processors
            _.each(added, function(value, name) {
                _.each(binding.masterKeys[name], function (detailBinding) {
                    channelsToUpdate[detailBinding.id] = detailBinding.channel;
                }, this);
            });
            _.each(removed, function(value, name) {
                _.each(binding.masterKeys[name], function (detailBinding) {
                    channelsToUpdate[detailBinding.id] = detailBinding.channel;
                }, this);
            });

            // Update
            _.each(channelsToUpdate, function(channel) {
                channel.updateChannels(this);
            }, this);

            return;
        }


        // Full cascade update
        var dataLoader = this._createDataLoader();
        var reducedParams;

        // Send added
        if (!_.isEmpty(added)) {

            reducedParams = _.isEmpty(removed) ? minimalParams : _.clone(minimalParams);

            _.each(added, function(value, name) {

                var paramName = bindingId + '.' + name;
                reducedParams[paramName] = value;

                _.each(binding.masterKeys[name], function(detailBinding) {

                    dataLoader.addParams(detailBinding.id, _.clone(reducedParams), ['add', detailBinding]);
                    channelsToUpdate[detailBinding.id] = detailBinding.channel;
                }, this);

                reducedParams[paramName] = this.requestParams[paramName];

            }, this);
        }

        // Send removed
        reducedParams = paramsBeforeOperation;
        _.each(removed, function(value, name) {

            var paramName = bindingId + '.' + name;
            reducedParams[paramName] = value;

            _.each(binding.masterKeys[name], function(detailBinding) {

                dataLoader.addParams(detailBinding.id, _.clone(reducedParams), ['remove', detailBinding]);
                channelsToUpdate[detailBinding.id] = detailBinding.channel;
            }, this);

            reducedParams[paramName] = minimalParams[paramName];

        }, this);

        // Update channel subscriptions
        _.each(channelsToUpdate, function(channel) {
            channel.updateChannels(this);
        }, this);


        // Load
        dataLoader.load()
            .then(_.bind(function(data) {
                _.each(data, function(collection, index) {
                    var listCommandBinding = dataLoader.associations[index];

                    _.each(collection, function(record) {

                        // Push message
                        listCommandBinding[1].channel.push(this, [listCommandBinding[0], record]);
                    }, this);
                }, this);
            }, this));
    }

});
