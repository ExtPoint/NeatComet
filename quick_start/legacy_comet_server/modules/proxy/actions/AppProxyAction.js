/**
 * @class app.proxy.actions.AppProxyAction
 * @extends Jii.base.action.ServerAction
 */
var self = Joints.defineClass('app.proxy.actions.AppProxyAction', Jii.base.action.ServerAction, {

    run: function () {

        var data = _.clone(this._expressRequest.query);
        delete data.query;
        delete data.routeInfo;

        Jii.app.getModule('proxy')
            .request(
                this._expressRequest.query.routeInfo.url.replace(/^php\//, ''),
                data
            )

            .then(function(jsonData) {
                this.setStatusCode(200);
                this.send(jsonData);
            }.bind(this))

            .catch(function(error) {
                this.setStatusCode((error.response && error.response.statusCode) ? error.response.statusCode : 500);
                this.send();
            }.bind(this));
    }

});
