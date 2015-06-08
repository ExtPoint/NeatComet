/**
 * @copyright Copyright 2014 <a href="http://www.extpoint.com">ExtPoint</a>
 * @author <a href="http://koryagin.com">Pavel Koryagin</a>
 * @license MIT
 */

var fs = require('fs');
var path = require('path');

/**
 * @class NeatComet.configReader.ConfigReader
 * @extends Joints.Object
 */
var self = Joints.defineClass('NeatComet.configReader.ConfigReader', Joints.Object, {

}, {

    read: function(file) {

        // Read
        var data = JSON.parse(fs.readFileSync(file));

        // Get profiles
        var profiles = data.profiles || [];

        // Include
        if (data.includes) {

            var $basePath;
            if (data.basePath) {
                $basePath = (data.basePath.substr(0, 1) == '/') ?
                    data.basePath :
                    (path.dirname(file) + '/' + data.basePath);
            }
            else {
                $basePath = path.dirname(file);
            }

            _.each(data.includes, function (subFile) {

                profiles = _.extend(self.read($basePath + '/' + subFile), profiles);
            });
        }

        return profiles;
    }
});
