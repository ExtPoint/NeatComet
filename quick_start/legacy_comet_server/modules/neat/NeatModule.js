var path = require('path');
var when = require('when');

/**
 * @class app.neat.NeatModule
 * @extends Jii.base.Module
 */
Joints.defineClass('app.neat.NeatModule', Jii.base.Module, {

    /** @type {NeatComet.adapters.jii.JiiCometServerMultiProcess} */
    adapter: null,

    init: function() {

        this._super();

        // Adapt Jii comet server
        // See also "open" and "close" actions
        this.adapter = new NeatComet.adapters.jii.JiiCometServerMultiProcess(Jii.app.comet);

        // Configure NeatCometServer
        var server = new NeatComet.NeatCometServer();
        server.setup({

            comet: this.adapter,

            configFileName: Jii.app.params.bindingsFile,

            // Use proxy to forward loadData calls
            externalDataLoader: function(requestParams) {

                return Jii.app.getModule('proxy').request(
                    Jii.app.params.phpServerLoadDataAction,
                    { msg: JSON.stringify(requestParams) }
                );

            }.bind(this)
        });

    }

});

