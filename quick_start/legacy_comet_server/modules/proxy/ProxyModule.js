var request = require('request');
var when = require('when');

/**
 * @class app.proxy.ProxyModule
 * @extends Jii.base.Module
 */
Joints.defineClass('app.proxy.ProxyModule', Jii.base.Module, {

    /**
     * @param {String} urlPath
     * @param {*} data
     * @return {Promise}
     */
    request: function(urlPath, data) {
        return when.promise(_.bind(function(resolve, reject) {
            this._request(urlPath, data, function (error, responseData) {
                if (error) {
                    reject(error);
                } else {
                    resolve(responseData)
                }
            });
        }, this));
    },

    _request: function(urlPath, data, callback) {

        var startTime = Date.now();

        var url = this.processUrl(urlPath);
        Jii.app.logger.debug('Send request to server `%s`:', url, data);

        request({
            method: 'POST',
            uri: url,
            form: data
        }, function(error, response, body) {

            var jsonData = null;
            var time = ((Date.now() - startTime) / 1000) + ' sec';

            if (error || !response || response.statusCode >= 400) {
                var statusCodeTxt = response ? response.statusCode : '?';
                Jii.app.logger.error('Request to server `%s` failed (status `%s`, time `' + time + '`):', url, statusCodeTxt, error, data, body);

                if (!error) {
                    error = {
                        statusCode: response ? response.statusCode : 500,
                        response: response,
                        body: body
                    };
                }

            } else {
                // Try parse json
                try {
                    jsonData = JSON.parse(body);
                } catch (e) {
                    error = e;
                }
            }

            callback(error, jsonData);

        }.bind(this));
    },

    processUrl: function(path) {
        return Jii.app.params.phpServerUrl.replace(/\/$/, '') + '/' + path;
    }

});

