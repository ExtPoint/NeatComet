(function() {

    /**
     * @namespace NeatComet.adapters.backbone
     */
    NeatComet.adapters || (NeatComet.adapters = {});
    NeatComet.adapters.backbone || (NeatComet.adapters.backbone = {});

    /**
     * @class NeatComet.adapters.backbone.NeatCometBackboneCollectionAdapter
     * @implements NeatComet.api.ICollectionClient
     *
     * @param {object} options
     */
    NeatComet.adapters.backbone.NeatCometBackboneCollectionAdapter = function(options) {

        this.collection = options.collection || (new Backbone.Collection);
        this.callAction = options.callAction;
    };

    NeatComet.adapters.backbone.NeatCometBackboneCollectionAdapter.prototype = {

        /** @type {Backbone.Collection} */
        collection: null,

        /** @type {NeatComet.api.ICollectionClient~callAction} */
        callAction: null,

        reset: function(list) {

            // Add new
            this.collection.add(list);

            // Remove unlisted records
            var idsToKeep = {};
            _.each(list, function(attributes) {
                idsToKeep[attributes.id] = true;
            });
            this.collection.each(function(model) {
                if (!idsToKeep[model.id]) {
                    this.collection.remove(model);
                }
            }, this);
        },

        add: function(attributes) {
            this.collection.add([attributes]);
        },

        update: function(newAttributes, oldAttributes) {

            var model = this.collection.get(oldAttributes.id);
            if (model) {
                model.set(newAttributes);
            }
            else {
                NeatComet.Exception.warning('Model to update not found');
            }
        },

        remove: function(oldAttributes) {

            var model = this.collection.get(oldAttributes.id);
            if (model) {
                this.collection.remove(model);
            }
            else {
                NeatComet.Exception.warning('Model to remove not found');
            }
        },

        action: function(attributes, action, params) {

            if (!this.callAction) {
                throw new NeatComet.Exception('Action calls are not supported by client');
            }
            else {
                var models = this.collection.where(attributes);
                if (models.length) {
                    this.callAction(models, action, params);
                }
                else {
                    NeatComet.Exception.warning('No models matched by action criteria');
                }
            }
        }

    };


})();
