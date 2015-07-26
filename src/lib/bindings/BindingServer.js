/**
 * @copyright Copyright 2014 <a href="http://www.extpoint.com">ExtPoint</a>
 * @author <a href="http://koryagin.com">Pavel Koryagin</a>
 * @license MIT
 */

/**
 * @class NeatComet.bindings.BindingServer
 * @extends Joints.Object
 */
var self = Joints.defineClass('NeatComet.bindings.BindingServer', Joints.Object, /** @lends NeatComet.bindings.BindingServer.prototype */{

    /** Id **/

    /** @type {string} */
    profile: null,

    /** @type {string} */
    id: null,


    /** Definition **/

    /** @type {Object.<string, *>|null} */
    match: null,

    /** @type {Object.<string, *>|null} */
    matchConst: null,

    /** @type {string|null} */
    where: null,

    /** @type {string|null} */
    whereSql: null,

    /** @type {string|null} */
    channelTemplate: null,

    /** @type {string|null} */
    routeMode: null,

    /** @type {Object.<string, *>|null} */
    client: null,


    /** Components **/

    /** @type {NeatComet.channels.BaseChannelServer} */
    channel: null,

    /** @type {NeatComet.NeatCometServer} */
    neatComet: null,

    /** @type {Object.<string, NeatComet.bindings.BindingServer[]>} */
    masterKeys: null,


    constructor: function(neatComet, profile, id, definition) {

        _.assign(this, definition);

        // Expand shortcuts
        if (_.isArray(this.match)) {
            this.match = _.object(this.match, this.match);
        }
        else if (this.match === null && this.channelTemplate !== null) {
            var reg = /{(\w+)}/g,
                match;
            while (match = reg.exec(this.channelTemplate)) {
                if (this.match === null) {
                    this.match = {};
                }
                this.match[match[1]] = match[1];
            }
        }

        this.neatComet = neatComet;
        this.profile = profile;
        this.id = id;
        this.definition = definition;
        this.masterKeys = {};

        this.channel = NeatComet.channels.BaseChannelServer.create(this.routeMode);
        this.channel.binding = this;
        this.channel.init();
    },

    /**
     * @param {Object.<string, NeatComet.bindings.BindingServer>} allBindings
     */
    initRelations: function(allBindings) {

        if (this.match) {
            _.each(this.match, function(source, name) {

                // Test for "masterBinding.attribute"
                var pos = source.indexOf('.');
                if (pos !== -1) {

                    // Set
                    var masterBindingId = source.substr(0, pos);
                    var masterAttribute = source.substr(pos + 1);
                    var masterKeys = allBindings[masterBindingId].masterKeys;
                    if (!masterKeys[masterAttribute]) {
                        masterKeys[masterAttribute] = [];
                    }
                    masterKeys[masterAttribute].push(this);
                }
            }, this);
        }
    },

    /**
     * @param {Object.<string, *>} attributes
     * @return {string}
     */
    getIdFromAttributes: function(attributes) {
        // TODO: allow override from config. Support composite keys
        return attributes.id;
    },

    /**
     *
     * @param {Object} params
     * @returns {Promise}
     */
    loadDataLocally: function(params) {

        // TODO: implement this
        throw new NeatComet.Exception('Not implemented');
    },

    /**
     * @param {Object} request
     * @returns {Object}
     */
    applyRequestToMatchObject: function(request) {

        var result = {};

        // Apply match
        _.each(this.match, function(requestName, attributeName) {
            if (_.isArray(requestName)) {
                var list = [];
                for (var i = 0; i < requestName.length; i++) {
                    var value = request[requestName[i]];
                    if (_.isArray(value)) {
                        list = list.concat(value);
                    }
                    else {
                        list.push(value);
                    }
                }
                result[attributeName] = list;
            }
            else {
                result[attributeName] = request[requestName];
            }
        });

        // Apply match
        _.each(this.matchConst, function(value, attributeName) {
            if (_.has(result, attributeName)) {
                if (!_.isArray(result[attributeName])) {
                    result[attributeName] = [result[attributeName]];
                }
                if (_.isArray(value)) {
                    result[attributeName] = result[attributeName].concat(value);
                }
                else {
                    result[attributeName].push(value);
                }
            }
            else {
                result[attributeName] = value;
            }
        });

        return result;
    },

    /**
     * @param {Object} attributes
     * @returns {Object}
     */
    applyAttributesToMatchObject: function(attributes) {

        var result = {};

        // Apply match
        _.each(this.match, function(requestName, attributeName) {
            result[attributeName] = attributes[attributeName];
        });

        // Apply constants
        _.each(this.matchConst, function(value, attributeName) {
            result[attributeName] = attributes[attributeName];
        });

        return result;
    },


    /**
     * @param {Function} sender
     * @param {Object.<string, (string[])>} params
     * @param {NeatComet.router.OpenedProfileServer} openedProfile
     * @return {Function}
     */
    composeJsFilter: function(sender, params, openedProfile) {

        var jsText = this.where;
        var modelFilter = null;

        // Skip, if no work
        if (!jsText && _.isEmpty(this.masterKeys)) {
            return sender;
        }

        // Prepare filter
        if (jsText) {
            jsText = jsText.replace(/{(\w+)}/g, function (dummy, name) {
                return JSON.stringify(params[name]);
            });
            modelFilter = eval('(function(model) { return (' + jsText + ') })');
        }

        return this._jsFilter.bind(this, sender, modelFilter, openedProfile);
    },

    /**
     *
     * @param {Function} sender
     * @param {Function|null} jsFilter
     * @param {NeatComet.router.OpenedProfileServer} openedProfile
     * @param {string} channel
     * @param {Array} message
     * @private
     */
    _jsFilter: function(sender, jsFilter, openedProfile, channel, message) {

        // Test against JS filter
        if (jsFilter !== null) {

            // Split updates into add and remove
            if (message[0] === 'update') {

                var newMatches = jsFilter(message[1]);
                var oldMatches = jsFilter(message[2]);

                if (!newMatches && !oldMatches) {
                    return; // Irrelevant message
                }
                else if (newMatches && !oldMatches) {
                    message = ['add', message[1]];
                }
                else if (oldMatches && !newMatches) {
                    message = ['remove', message[2]];
                }
            }

            // Test other messages
            else if (!jsFilter(message[1])) {
                return; // Doesn't pass filter
            }
        }

        // Collect master keys
        if (!_.isEmpty(this.masterKeys)) {
            this._collectMasterKeys(message, openedProfile);
        }

        // Send
        sender(channel, message);
    },

    /**
     * @param {Array} message
     * @param {NeatComet.router.OpenedProfileServer} openedProfile
     * @private
     */
    _collectMasterKeys: function(message, openedProfile) {

        switch (message[0]) {

            case 'add':
                openedProfile.updateMasterValues(
                    this.id,
                    this.getIdFromAttributes(message[1]),
                    NeatComet.NeatCometServer.intersectKeys(message[1], this.masterKeys)
                );
                break;

            case 'remove':
                openedProfile.updateMasterValues(
                    this.id,
                    null,
                    null,
                    this.getIdFromAttributes(message[1]),
                    NeatComet.NeatCometServer.intersectKeys(message[1], this.masterKeys)
                );
                break;

            case 'update':

                var add = null;
                var remove = null;
                _.each(this.masterKeys, function(dummy, name) {
                    if (message[1][name] != message[2][name]) {

                        // Lazy init
                        if (add === null) {
                            add = {};
                            remove = {};
                        }

                        add[name] = message[1][name];
                        remove[name] = message[2][name];
                    }
                }, this);

                if (add !== null) {
                    openedProfile.updateMasterValues(
                        this.id,
                        add === null ? null : this.getIdFromAttributes(message[1]),
                        add,
                        remove === null ? null : this.getIdFromAttributes(message[2]),
                        remove
                    );
                }

                break;
        }
    }

});
