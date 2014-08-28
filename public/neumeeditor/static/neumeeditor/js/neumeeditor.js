(function($){
    "use strict";

    /*
    Global Variables
     */

    var SITE_URL = "http://localhost:8000/neumeeditor/";
    var STATIC_URL = "http://localhost:8000/neumeeditor/media/";

    /*
    Boilerplate Code
     */

    // Enable CRSF in sync
    function getCookie(name) {
        var cookieValue = null;
        if (document.cookie && document.cookie != '') {
            var cookies = document.cookie.split(';');
            for (var i = 0; i < cookies.length; i++) {
                var cookie = jQuery.trim(cookies[i]);
                // Does this cookie string begin with the name we want?
                if (cookie.substring(0, name.length + 1) == (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
    var csrftoken = getCookie('csrftoken');
    var oldSync = Backbone.sync;
    Backbone.sync = function(method, model, options){
        options.beforeSend = function(xhr){
            xhr.setRequestHeader('X-CSRFToken', getCookie('csrftoken'));
        };
        return oldSync(method, model, options);
    };

    /*
    App initialization
     */

    var App = new Backbone.Marionette.Application();

    App.on('initialize:before', function(options)
    {
        options.anotherThing = true; // Add more data to your options
    });
    App.on('initialize:after', function(options)
    {
        console.log('Initialization Finished');
    });
    App.on('start', function(options)
    {
        Backbone.history.start(); // Great time to do this
    });

    // Create a region. It will control what's in the #container element.
    App.container = new Backbone.Marionette.Region
    ({
        el: "#container"
    });

    // Add a view to the region. It will automatically render immediately.
    //    region.show(new MyView());

    // Close out the view that's currently there and render a different view.
    //    region.show(new MyOtherView());

    // Close out the view and display nothing in #container.
    //    region.close();

    App.module("authentication", function(myModule, App, Backbone, Marionette, $, _){
        this.startWithParent = false;
    });

    App.module("glyphEdit", function(myModule, App, Backbone, Marionette, $, _){
        this.startWithParent = true;

        /*
        Models
         */

        var Image = Backbone.Model.extend({
            initialize: function(options)
            {
                if (options !== undefined && options.url !== undefined)
                {
                    this.url = String(options.url);
                }
            },

            url: SITE_URL + "images/",

            defaults: {
                image_file: ""
            }
        });

        var Name = Backbone.Model.extend({
            initialize: function(options)
            {
                if (options !== undefined && options.url !== undefined)
                {
                    this.url = String(options.url);
                }
            },

            url: SITE_URL + "names/",

            defaults: {
                string: "",
                short_code: ""
            },

            /**
             * Set the Name's glyph based on the ID int.
             *
             * @param id
             */
            setGlyph: function(id)
            {
                this.set("glyph", SITE_URL + "glyph/" + String(id) + "/");
            },

            /**
             * Set the model url to its url attribute.
             */
            transferUrl: function()
            {
                this.url = this.get("url");
            }
        });

        var Glyph = Backbone.Model.extend({

            initialize: function(options)
            {
                this.url = String(options.url);
            },

            /**
             * Get a collection containing the Glyph's names.
             *
             * @param attributeName
             * @param CollectionType
             * @param ItemType
             * @returns {CollectionType}
             */
            getCollection: function(attributeName, CollectionType, ItemType)
            {
                var output = new CollectionType();
                var urlList = this.get(String(attributeName));
                console.log(urlList);
                for (var i = 0; i < urlList.length; i++)
                {
                    console.log(String(urlList[i]));
                    var newModel = new ItemType({url: String(urlList[i])});
                    output.add(newModel);
                    newModel.fetch();
                }
                console.log(output.toJSON());
                return output;
            }
        });


        /*
        Collections
         */

        var NameCollection = Backbone.Collection.extend({
            model: Name
        });

        var ImageCollection = Backbone.Collection.extend({
            model: Image
        });


        /*
        Views
         */

        var CreateImagesView = Backbone.Marionette.CompositeView.extend({

            childView: CreateSingleNameView,
            childViewContainer: ".name-list",
            template: "#upload-image-template",

            childEvents: {
                "submit": "save"
            },

            save: function(child)
            {
                console.log("SAVE CALLBACK:");
            }
        });

        var EditSingleImageView = Backbone.Marionette.ItemView.extend({
            tagName: "div",
            template: _.template($('#edit-single-image-template').html()),
            modelEvents: {
                "change": "render"
            },
            events: {
                "click button[name='delete']": "destroyModel"
            },
            ui: {
                statusDiv: ".status-message"
            },

            destroyModel: function()
            {
                console.log("Delete name.");
                event.preventDefault();
                this.model.destroy();
                return this.trigger("destroy");
            }
        });

        var EditImagesView = Backbone.Marionette.CollectionView.extend({
            childView: EditSingleImageView
        });

        /**
         * View for looking at a single glyph object.
         */
        var SingleGlyphView = Backbone.Marionette.ItemView.extend({
            tagName: "li",
            template: _.template("")
        });

        var EditSingleGlyphView = Backbone.Marionette.CompositeView.extend({
            tagName: "li",
            template: _.template("#edit-single-glyph-template")
        });

        /**
         * View for editing a single name object.
         */
        var EditSingleNameView = Backbone.Marionette.ItemView.extend({

            tagName: "form",

            template: _.template($('#edit-single-name-template').html()),

            modelEvents: {
                "change": "render"
            },

            events: {
                "submit": "submitModel",
                "click button[name='delete']": "destroyModel"
            },

            ui: {
                statusDiv: ".status-message"
            },

            submitModel: function(event)
            {
                // Prevent default functionality
                event.preventDefault();
                // Grab values from the form fields
                this.model.set({
                    string: String(this.$("input[name='string']").val()),
                    short_code: String(this.$("input[name='short_code']").val())
                });
                var that = this;
                this.model.save(null,
                    {
                        success: function() {
                            console.log("Success.");
                            console.log(that.ui.statusDiv);
                            that.ui.statusDiv.html("Name saved successfully.");
                            that.ui.statusDiv.fadeOut(2500);
                            return that.trigger("submit");
                        },
                        error: function() {
                            that.ui.statusDiv.html("Error saving name.");
                            that.ui.statusDiv.fadeOut(2500);
                        }
                    }
                );
            },

            destroyModel: function()
            {
                console.log("Delete name.");
                event.preventDefault();
                this.model.destroy();
                return this.trigger("destroy");
            }
        });

        var CreateSingleNameView = EditSingleNameView.extend({
            template: _.template($('#create-single-name-template').html())
        });

        var EditNamesView = Backbone.Marionette.CompositeView.extend({
            childView: EditSingleNameView,

            childViewContainer: ".name-list",
            template: "#edit-name-collection-template"
        });

        var CreateNamesView = Backbone.Marionette.CompositeView.extend({

            initialize: function(options)
            {
                if(options)
                {
                    if (options.createdCollection)
                    {
                        this.createdCollection = options.createdCollection;
                    }
                }
            },

            childView: CreateSingleNameView,

            childViewContainer: ".name-list",
            template: "#create-name-collection-template",

            childEvents: {
                "submit": "save"
            },

            save: function(child)
            {
                console.log("SAVE CALLBACK:");
                // Remove model from this collection
                console.log(child.model);
                // Set the new URL
                child.model.transferUrl();
                this.createdCollection.add(child.model);
                this.collection.remove(child.model);
                this.collection.add(new Name());
            }
        });

        /*
        Execution Code
         */

        var glyph = new Glyph({url: "http://localhost:8000/neumeeditor/glyph/1/"});

        this.start = function()
        {
            console.log("Starting...");
            glyph.fetch({success: function(){
                var glyphNames = glyph.getCollection("name_set", NameCollection, Name);
                console.log(glyphNames);
                (new EditNamesView({
                    collection: glyphNames,
                    el: '.link-area'
                })).render();

                (new CreateNamesView({
                    createdCollection: glyphNames,
                    collection: emptyNameCollection,
                    el: '.link-area2'
                })).render();


            }});
        };


    });
    console.log("start app");
    App.start();

})(jQuery);
