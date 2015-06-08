/**
 * @class Jii.actions.CometApiAction
 * @extends Jii.base.action.ServerAction
 */
var self = Joints.defineClass('Jii.actions.CometApiAction', Jii.base.action.ServerAction, {

    accessFilter: function () {
        return _.merge(this._super(), {
            required: [
                'token',
                'method'
            ]
        });
    },

    checkCanAccess: function() {
        return this._super().then(function() {
            return _.indexOf(Jii.app.comet.apiTokens || [], this.params.token) !== -1;
        }.bind(this));
    },

    run: function () {
        switch (this.params.method) {
            case 'publish':
                if (this.params.channel && this.params.data) {
                    Jii.app.comet.send(this.params.channel, JSON.parse(this.params.data));
                    this.send('ok');
                } else {
                    this.setStatusCode(400);
                    this.send('Channel and data params is required.');
                }
                break;

            default:
                this.setStatusCode(400);
                this.send('Wrong api method.');
        }
    }

});
