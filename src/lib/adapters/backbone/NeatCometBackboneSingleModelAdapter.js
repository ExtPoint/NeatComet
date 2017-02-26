/**
 * @copyright Copyright 2014-2017 <a href="http://www.extpoint.com">ExtPoint</a>
 * @author <a href="http://koryagin.com">Pavel Koryagin</a>
 * @license MIT
 */
(function() {

    /** @namespace NeatComet.adapters.backbone */
    NeatComet.adapters.backbone || (NeatComet.adapters.backbone = {});

    /**
     * @class NeatComet.adapters.backbone.NeatCometBackboneSingleModelAdapter
     * @implements NeatComet.api.ICollectionClient
     *
     * @param {object} options
     */
    NeatComet.adapters.backbone.NeatCometBackboneSingleModelAdapter = function(options) {

        this.model = options.model || (new Backbone.Model);
        this.callAction = options.callAction;
    };

    NeatComet.adapters.backbone.NeatCometBackboneSingleModelAdapter.prototype = {

        /** @type {Backbone.Model} */
        model: null,

        /** @type {NeatComet.api.ICollectionClient~callAction} */
        callAction: null,

        getNative: function() {
            return this.model;
        },

        reset: function(list) {

            if (list[0]) {
                this.model.set(list[0]);
            }
        },

        add: function(attributes) {

            this.model.set(attributes);
        },

        update: function(newAttributes, oldAttributes) {

            this.model.set(newAttributes);
        },

        remove: function(oldAttributes) {
            NeatComet.Exception.warning('Removing single model');
        },

        action: function(attributes, action, params) {

            if (!this.callAction) {
                throw new NeatComet.Exception('Action calls are not supported by client');
            }
            else {
                this.callAction([this.model], action, params);
            }
        }

    };

    NeatComet.adapters.backbone.NeatCometBackboneSingleModelAdapter.install = function(config) {

        return function(profileId, bindingId, definition, openedProfile) {

            // Get model class
            var modelClass = config.getModelClass ?
                config.getModelClass(profileId, bindingId, definition, openedProfile) :
                Backbone.Model;

            // Create
            return new NeatComet.adapters.backbone.NeatCometBackboneCollectionAdapter({
                model: new modelClass()
            });
        };
    };

})();
