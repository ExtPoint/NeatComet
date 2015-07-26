/**
 * @copyright Copyright 2014 <a href="http://www.extpoint.com">ExtPoint</a>
 * @author <a href="http://koryagin.com">Pavel Koryagin</a>
 * @license MIT
 */

/**
 * @class NeatComet.channels.DirectChannelServer
 * @extends NeatComet.channels.BaseChannelServer
 */
var self = Joints.defineClass('NeatComet.channels.DirectChannelServer', NeatComet.channels.BaseChannelServer, /** @lends NeatComet.channels.DirectChannelServer.prototype */{

    channelPrefix: '',

    init: function() {
        this.channelPrefix = this.binding.profile + ':' + this.binding.id + ':';
    },

    _iterateParams: function(result, params, restParams, sender, openedProfile, getChannelFn) {

        var newRest = null;
        var currentName = null;

        for (var name in restParams) if (Object.prototype.hasOwnProperty.call(restParams, name)) {

            if (currentName !== null) {
                newRest[name] = restParams[name];
            }
            else if (!_.isArray(restParams[name])) {

                // Client has disabled the channel
                if (restParams[name] === null) {
                    return;
                }

                // Collect
                // It is already there // params[$name] = $value;
            }
            else {
                // Switch to get new tail
                newRest = {};
                currentName = name;
            }
        }

        if (currentName !== null) {

            // Recurse for each
            var currentValues = params[currentName];
            for (var i in currentValues) if (Object.prototype.hasOwnProperty.call(currentValues, i)) {
                params[currentName] = currentValues[i];
                this._iterateParams(result, params, newRest, sender, openedProfile, getChannelFn);
            }

            // Quit recursion. Tail was already there
        }
        else {
            // Finish recursion
            var filterAndSender;

            // Compose filter, if required
            if (sender) {
                filterAndSender = this.binding.composeJsFilter(sender, params, openedProfile);
                result.hasJs = result.hasJs || (filterAndSender !== sender);
            }

            // Or just list channels
            else {
                filterAndSender = true;
            }

            result.channels[this.channelPrefix + getChannelFn(params)] = filterAndSender;
        }
    },

    /**
     * @param {Object.<string, (string[]|string[][])>} params
     * @param {Function} [sender]
     * @param {NeatComet.router.OpenedProfileServer} [openedProfile]
     * @returns {NeatComet.channels.FiltersList}
     * @private
     */
    _getFilters: function(params, sender, openedProfile) {

        /** @type {NeatComet.channels.FiltersList} */
        var result = {
            hasJs: false,
            channels: {}
        };

        var restParams;
        var getChannelFn;

        // Format by template, if any
        if (this.binding.channelTemplate) {

            var channelTemplate = this.binding.channelTemplate;
            var match;
            var regexp = /{(\w+)}/g;

            getChannelFn = function(scalarParams) {
                return channelTemplate.replace(
                    regexp,
                    function(match, p1) {
                        var x = scalarParams[p1];
                        return x === null ? '' : x;
                    }
                );
            }.bind(this);

            // Pick candidates to iterate
            restParams = {};
            while (match = regexp.exec(channelTemplate)) {
                restParams[match[1]] = params[match[1]];
            }
        }

        // Format by match object, if set
        else if (this.binding.match) {

            getChannelFn = function(scalarParams) {
                var channel = '';
                _.each(scalarParams, function(value, name) {
                    if (channel !== '') {
                        channel += ':';
                    }
                    channel += value === null ? name : (name + '=' + value);
                });
                return channel;
            }.bind(this);

            // Pick candidates to iterate
            restParams = NeatComet.NeatCometServer.intersectKeys(params, this.binding.match);
        }

        // Constant, if none
        else {
            getChannelFn = function() {
                return self.CONSTANT_CHANNEL;
            };

            restParams = {};
        }

        // Get
        this._iterateParams(result, params, restParams, sender, openedProfile, getChannelFn);

        return result;
    },

    /**
     * @param {Object.<string, (string[]|string[][])>} params
     * @returns {string[]}
     * @private
     */
    _getChannels: function(params) {
        return _.keys(this._getFilters(params).channels);
    },

    /**
     * @param {Object.<string, (string[])>} params
     * @returns {string}
     * @private
     */
    _getChannel: function(params) {
        return this._getChannels(params)[0];
    },

    /**
     * Do not port this in other languages
     * @param {NeatComet.router.OpenedProfileServer} openedProfile
     */
    openProfile: function(openedProfile) {

        /** @type {NeatComet.channels.FiltersList} */
        var filters;

        // Create client pusher
        var pusher = this._createPusher(openedProfile.connection, '!' + openedProfile.id + ':' + this.binding.id);

        // Check if enabled for the current set of parameters
        filters = this._getFilters(this.binding.applyRequestToMatchObject(openedProfile.requestParams), pusher, openedProfile);
        if (_.isEmpty(filters.channels)) {
            return;
        }

        // Serve channels. Allow forward, when supported
        openedProfile.addChannels(filters.channels, pusher);
    },

    /**
     *
     * @param {NeatComet.router.ConnectionServer} connection
     * @param {string} clientChannel
     * @return {Function}
     * @private
     */
    _createPusher: function(connection, clientChannel) {

        return function(sourceChannel, message) {
            connection.comet.pushToClient(
                connection.connectionId,
                clientChannel,
                message
            );
        }
    },

    /**
     * @param {NeatComet.router.OpenedProfileServer} openedProfile
     * @param {Array} message
     */
    push: function(openedProfile, message) {

        openedProfile.connection.comet.pushToClient(
            openedProfile.connection.connectionId,
            '!' + openedProfile.id + ':' + this.binding.id,
            message
        );
    }

}, {
    CONSTANT_CHANNEL: '1'
});
