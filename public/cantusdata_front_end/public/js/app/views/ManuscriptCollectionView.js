//var ManuscriptCollection = require(["collections/ManuscriptCollection"]);
//var CantusAbstractView = require(["views/CantusAbstractView"]);

define( ['App', 'backbone', 'marionette', 'jquery', "collections/ManuscriptCollection", "views/CantusAbstractView"],
    function(App, Backbone, Marionette, $, ManuscriptCollection, CantusAbstractView, template) {

        return CantusAbstractView.extend
        ({
            collection: null,

            initialize: function(options)
            {
                _.bindAll(this, 'render', 'update', 'registerClickEvents',
                    'buttonClickCallback');
                this.template= _.template($('#manuscript-collection-template').html());
                this.collection = new ManuscriptCollection(options.url);
                this.listenTo(this.collection, 'sync', this.registerClickEvents);
                this.listenTo(this.collection, 'sync', this.render);
            },

            registerClickEvents: function()
            {
                // Clear out the events
                this.events = {};
                // Menu items
                for (var i = 0; i < this.collection.length; i++)
                {
                    this.events["click #manuscript-list-" + i] = "buttonClickCallback";
                }
                // Delegate the new events
                this.delegateEvents();
            },

            buttonClickCallback: function(input)
            {
                // Prevent page from reloading
                event.preventDefault();
                // Figure out which button was pressed
                var button_name = String(input.currentTarget.id);
                var id = button_name.split('-')[button_name.split('-').length - 1];
                // Now that we have that id, route the application to it's URL!
                var newUrl = "manuscript/" + this.collection.toJSON()[id].id + "/";
                var oldUrl = Backbone.history.fragment;

                // Only route to the new URL if it really is a new url!
                if (!(newUrl === "#" || newUrl.trim('/') === oldUrl.trim('/')))
                {
                    app.navigate(newUrl, {trigger: true});
                }
            },

            update: function()
            {
                this.collection.fetch();
            },

            render: function()
            {
                $(this.el).html(this.template({
                    manuscripts: this.collection.toJSON()
                }));
                globalEventHandler.trigger("renderView");
                return this.trigger('render', this);
            }
        });
    });