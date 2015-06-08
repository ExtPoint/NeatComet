/**
 * @class app.neat.actions.CloseAction
 * @extends Jii.base.action.ServerAction
 */
var self = Joints.defineClass('app.neat.actions.CloseAction', Jii.base.action.ServerAction, {

    run: function () {

        // No wait
        this.send();

        Jii.app.getModule('neat').adapter.events
            .onCloseProfileCommand(
                this.params.connectionUid,
                this.params.ids
            );
    }

});
