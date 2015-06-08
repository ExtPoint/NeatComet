/**
 * @class app.neat.actions.OpenAction
 * @extends Jii.base.action.ServerAction
 */
var self = Joints.defineClass('app.neat.actions.OpenAction', Jii.base.action.ServerAction, {

    run: function () {

        Jii.app.getModule('neat').adapter.events
            .onOpenProfileCommand(
                this.params.connectionUid,
                this.params.neat
            )
            .then(function(neatResponse) {

                // Send response
                this.send({
                    neat: neatResponse
                });

            }.bind(this));
    }

});
