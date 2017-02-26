/**
 * @copyright Copyright 2014-2017 <a href="http://www.extpoint.com">ExtPoint</a>
 * @author <a href="http://koryagin.com">Pavel Koryagin</a>
 * @license MIT
 */

var fs = require('fs');
var path = require('path');

/**
 * @class NeatComet.configReader.ConfigReader
 * @extends NeatComet.Object
 */
var self = NeatComet.configReader.ConfigReader = NeatComet.Object.extend(/** @lends NeatComet.configReader.ConfigReader.prototype */{

    /** @type {String} */
    fileName: null,

    /** @type {Object} */
    profiles: null,

    read: function() {

        if (!this.fileName) {
            throw new NeatComet.Exception('fileName property required in NeatComet.configReader.ConfigReader');
        }

        // Read
        var data = JSON.parse(fs.readFileSync(this.fileName));

        // Get profiles
        var profiles = data.profiles || {};

        // Include
        if (data.includes) {

            var $basePath;
            if (data.basePath) {
                $basePath = (data.basePath.substr(0, 1) == '/') ?
                    data.basePath :
                    (path.dirname(this.fileName) + '/' + data.basePath);
            }
            else {
                $basePath = path.dirname(this.fileName);
            }

            _.each(data.includes, function (subFile) {

                profiles = _.extend(self.readFile($basePath + '/' + subFile), profiles);
            });
        }

        this.profiles = profiles;

        return profiles;
    },

    /**
     * Collect client params from profiles
     * @returns {Object.<string, Object.<string, *>>}
     */
    getClientParams: function() {

        if (this.profiles == null) {
            this.read();
        }

        var result = {};

        _.each(this.profiles, function(profileDefinition, profileId) {
            result[profileId] = {};
            _.each(profileDefinition, function(bindingDefinition, bindingId) {
                result[profileId][bindingId] = bindingDefinition.client || null;
            });
        });

        return result;
    }

}, /** @lends NeatComet.configReader.ConfigReader */ {

    /**
     *
     * @param {string} fileName
     * @returns {Object}
     */
    readFile: function(fileName) {
        var reader = new self;
        reader.fileName = fileName;
        reader.init();
        return reader.read();
    }
});
