/**
 * @copyright Copyright 2014-2017 <a href="http://www.extpoint.com">ExtPoint</a>
 * @author <a href="http://koryagin.com">Pavel Koryagin</a>
 * @license MIT
 */

/**
 * @callback NeatComet.adapters.backbone.NeatCometBackboneCollectionAdapter~idMapper
 * @param {*} attributes
 * @returns {string}
 */
(function() {

    /** @namespace NeatComet.adapters.backbone */
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
        this.idMapper = options.idMapper || null;
    };

    NeatComet.adapters.backbone.NeatCometBackboneCollectionAdapter.prototype = {

        /** @type {Backbone.Collection} */
        collection: null,

        /** @type {NeatComet.api.ICollectionClient~callAction} */
        callAction: null,

        /** @type {NeatComet.adapters.backbone.NeatCometBackboneCollectionAdapter~idMapper|null} */
        idMapper: null,

        getNative: function() {
            return this.collection;
        },

        reset: function(list) {

            // Scan list
            var idsToKeep = {};
            _.each(list, function(attributes) {

                if (this.idMapper) {
                    attributes.id = this.idMapper(attributes);
                }

                idsToKeep[attributes.id] = true;
            }, this);

            // Remove unlisted records
            this.collection.each(function(model) {
                if (!idsToKeep[model.id]) {
                    this.collection.remove(model);
                }
            }, this);

            // Add new
            this.collection.add(list);
        },

        add: function(attributes) {

            if (this.idMapper) {
                attributes.id = this.idMapper(attributes);
            }

            this.collection.add([attributes]);
        },

        update: function(newAttributes, oldAttributes) {

            if (this.idMapper) {
                oldAttributes.id = this.idMapper(oldAttributes);
                newAttributes.id = this.idMapper(newAttributes);
            }

            var model = this.collection.get(oldAttributes.id);
            if (model) {
                model.set(newAttributes);
            }
            else {
                NeatComet.Exception.warning('Model to update not found');
            }
        },

        remove: function(oldAttributes) {

            if (this.idMapper) {
                oldAttributes.id = this.idMapper(oldAttributes);
            }

            var model = this.collection.get(oldAttributes.id);
            if (model) {
                this.collection.remove(model);
            }
            else {
                NeatComet.Exception.warning('Model to remove not found');
            }
        },

        action: function(attributes, action, params) {

            if (this.idMapper) {
                attributes.id = this.idMapper(attributes);
            }

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

    NeatComet.adapters.backbone.NeatCometBackboneCollectionAdapter.install = function(config) {

        return function(profileId, bindingId, definition, openedProfile) {

            // Get model class
            var modelClass = config.getModelClass ?
                config.getModelClass(profileId, bindingId, definition, openedProfile) :
                Backbone.Model;

            // Get collection class
            var collectionClass = config.getCollectionClass ?
                config.getCollectionClass(profileId, bindingId, definition, openedProfile) :
                Backbone.Collection;

            // Create
            return new NeatComet.adapters.backbone.NeatCometBackboneCollectionAdapter({
                collection:
                    new collectionClass([], {
                        model: modelClass
                    })
            });
        };
    };

})();
