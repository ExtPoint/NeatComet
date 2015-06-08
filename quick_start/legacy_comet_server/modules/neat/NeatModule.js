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

            configFileName: path.dirname(require.main.filename) + '/../app/config/cometBindingFiles.json',

            // Use proxy to forward loadData calls
            externalDataLoader: function(requestParams) {

                return Jii.app.getModule('proxy').request(
                    'comet/api/load-data/',
                    { msg: JSON.stringify(requestParams) }
                );

            }.bind(this)
        });

    }

});

