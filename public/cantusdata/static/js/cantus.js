(function($){

    /*
    Models
     */

    var CantusAbstractModel = Backbone.Model.extend
    ({
        initialize: function(url)
        {
            this.url = url;
//            console.log("Model URL: " + this.url);
//            console.log(this.url);
        }
    });

    var Chant = CantusAbstractModel.extend
    ({
        defaults: function()
        {
            return {
                marginalia: "the marginalia",
                folio: "the folio",
                sequence:"the sequence",
                cantus_id: "the cantus id",
                feast: "the feast",
                office: "the office",
                genree: "the genre",
                lit_position: "the lit position",
                mode: "the mode",
                differentia: "the differentia",
                finalis: "the finalis",
                incipit: "the incipit",
                full_text: "Quite a nice chant!",
                concordances: [],
                volpiano: "the volpiano",
                manuscript: "the manuscript"
            }
        }
    });

    var Concordance = CantusAbstractModel.extend
    ({
        defaults: function()
        {
            return {
                letter_code: "ZZZ",
                institution_city: "Montreal",
                instutition_name: "DDMAL",
                library_manuscript_name: "No Name",
                date: "Right now",
                location: "Montreal",
                rism_code: "ABC1234"
            }
        }
    });

    var Folio = CantusAbstractModel.extend
    ({
        defaults: function()
        {
            return {
                number: "000",
                manuscript: null,
                chant_count: 0
            }
        }
    });

    var Manuscript = CantusAbstractModel.extend
    ({
        defaults: function()
        {
            return {
                url: "#",
                name: "Test Name",
                siglum: "Test Siglum",
                siglum_slug: "#",
                date: "Tomorrow",
                provenance: "Test provenance",
                description: "This is a nice manuscript...",
                chant_count: 5,
                folio_set: [],
                chant_set: []
            };
        },

        /**
         * Turn the folio set into a collection
         */
        getFolioCollection: function() {
            var output = ConcordanceCollection();
            output.reset(this.folio_set);
            return output;
        },

        /**
         * Turn the folio set into a collection
         */
        getChantCollection: function() {
            var output = ChantCollection();
            output.reset(this.chant_set);
            return output;
        }
    });

    /**
     * This represents a search result.  It is experimental.
     */
    var SearchResult = CantusAbstractModel.extend
    ({
        initialize: function(pQuery)
        {
            CantusAbstractModel.__super__.initialize.apply(
                this, "http://localhost:8000/search/?q=" + pQuery);
        },

        /**
         * An empty search is empty.
         */
        defaults: function()
        {
            return {
                results: []
            }
        }
    });


    /*
    Collections
     */
    var CantusAbstractCollection = Backbone.Collection.extend
    ({
        initialize: function(url)
        {
            this.url = url;
            console.log("Collection URL: " + this.url);
            console.log(this.url);
        }
    });

    var ChantCollection = CantusAbstractCollection.extend
    ({
        model: Chant
    });

    var ConcordanceCollection = CantusAbstractCollection.extend
    ({
        model: Concordance
    });

    var FolioCollection = CantusAbstractCollection.extend
    ({
        model: Folio
    });

    var ManuscriptCollection = CantusAbstractCollection.extend
    ({
        model: Manuscript
    });


    /*
    Views
    */

    var CantusAbstractView = Backbone.View.extend
    ({
        /**
         * Used to render subviews.
         *
         * @param view The view object to be rendered
         * @param selector The html selector where you want to render the view
         */
        assign : function (view, selector) {
            view.setElement(selector).render();
//            view.setElement(this.$(selector)).render();
        }
    });

    var FolioView = CantusAbstractView.extend
    ({
        // Subviews
        chantCollectionView: null,

        initialize: function(options)
        {
            _.bindAll(this, 'render', 'update', 'assignChants');
            this.template= _.template($('#folio-template').html());

            console.log("Initializing Folio: " + options.url);
            this.model = new Folio(options.url);

            // Assign the chant list!
            this.assignChants();

            this.listenTo(this.model, 'sync', this.assignChants);
        },

        update: function()
        {
            this.model.fetch();
            this.chantCollectionView.update();
        },

        /**
         * Rebuild the list of chants
         */
        assignChants: function()
        {
            this.chantCollectionView = new ChantCollectionView(
                {
                    collection: this.model.chant_set
                }
            )
        },

        render: function()
        {
            $(this.el).html(this.template(this.model.toJSON()));

            this.assign(this.chantCollectionView, '.chant-list');

            return this.trigger('render', this);
        }
    });

    var ChantCollectionView = CantusAbstractView.extend
    ({
        initialize: function(options)
        {
            _.bindAll(this, 'render', 'update');
            this.template= _.template($('#chant-collection-template').html());
            // If a set of chants is supplied, use it!
            if (options.collection)
            {
                this.collection = new ChantCollection(options.collection);
            }
            else if (options.url)
            {
                this.collection = new ChantCollection(options.url);
            }
        },

        update: function()
        {
            this.collection.fetch();
        },

        render: function()
        {
            // Render out the template
            $(this.el).html(this.template(this.model.toJSON()));

            return this.trigger('render', this);
        }
    })


    var ManuscriptIndividualPageView = CantusAbstractView.extend
    ({
        el: $('#view-goes-here'),

        id: null,
        manuscript: null,
        folioSet: null,
        activeFolioNumber: null,

        // Subviews
        headerView: null,
        divaView: null,
        folioView: null,

        initialize: function(options)
        {
            _.bindAll(this, 'render', 'afterFetch');

            console.log("VIEW ID: " + this.id);

            this.template= _.template($('#manuscript-template').html());

            console.log("Creating manuscript with id=" + this.id);
            this.manuscript = new Manuscript(
                "http://localhost:8000/manuscript/" + this.id + "/");

            // Render every time the model changes...
            this.listenTo(this.manuscript, 'sync', this.afterFetch);

            // Build the subviews
            this.headerView = new HeaderView();
            console.log("Siglum Slug: " + this.manuscript.get("siglum_slug"));
            console.log(this.manuscript.get("siglum_slug"));
            this.divaView = new DivaView({siglum: this.manuscript.get("siglum_slug")});
        },

        getData: function()
        {
            this.manuscript.fetch();
            console.log("HomePageView data fetched.");
        },

        afterFetch: function()
        {
            console.log("after manuscript fetch...");
            this.divaView = new DivaView({siglum: this.manuscript.get("siglum_slug")});
            this.render();
        },

        render: function()
        {
            console.log("Rendering");
            $(this.el).html(this.template({
                manuscript: this.manuscript.toJSON()
            }));

            // Render subviews
            this.assign(this.headerView,        '.header');

            if (this.divaView !== undefined) {
                this.assign(this.divaView, '#diva-wrapper');
            }

            console.log("Rendering done");
            return this.trigger('render', this);
        }

//        /**
//         * Assign the active folio to be displayed.
//         * @param url
//         */
//        setActiveFolio: function(url)
//        {
//            this.activeFolio = new Folio(url);
//            this.activeFolio.fetch();
//        }
    });


    var DivaView = CantusAbstractView.extend
    ({
        initialize: function(options)
        {
            console.log("DivaView initialized.");
            console.log("Diva Siglum: " + options.siglum);
            this.siglum = options.siglum;
        },

        render: function()
        {
            siglum = this.siglum;
            console.log(siglum);
            console.log("Rendering Diva View");
            $(document).ready(function() {
                var dv;
                $("#diva-wrapper").diva({
                // $(this.el).diva({
                    enableAutoTitle: false,
                    enableAutoWidth: true,
                    enableAutoHeight: true,
                    enableFilename: false,
                    fixedHeightGrid: false,
                    iipServerURL: "http://localhost:8001/fcgi-bin/iipserver.fcgi",
                    objectData: "/static/" + siglum + ".json",
                    imageDir: "/Users/afogarty/Documents/manuscript-images/processed/"
                        + siglum + "/",
                    onScroll: function ()
                    {
                        // This is the page number
                        console.log(dv.getState()["p"]);

                        // This is the photograph file name
                        // console.log("Just scrolled to: "+ dv.getState()["i"]);
                    },
                    onJump: function ()
                    {
                        console.log("Just jumped to: " );
                    },
                    onDocumentLoaded: function ()
                    {
                        console.log("Document loaded" );
                    }
                });
                var dv = $("#diva-wrapper").data("diva");
//                var dv = $(this.el).data("diva");
            });

            console.log("Done rendering Diva View");
            return this.trigger('render', this);
        }
    });

    var TopMenuView = CantusAbstractView.extend
    ({
        initialize: function(options)
        {
            _.bindAll(this, 'render');
            this.template= _.template($('#top-menu-template').html());

            // Menu list items provided
            this.items = options.menuItems;
        },

        render: function()
        {
            console.log("Rendering top menu.");
            console.log(this.items);
            $(this.el).html(this.template({items: this.items}));
            return this.trigger('render', this);
        }
    })

    var HeaderView = CantusAbstractView.extend
    ({
        // Subviews
        topMenuView: null,

        initialize: function(options)
        {
            _.bindAll(this, 'render');
            this.template= _.template($('#header-template').html());

            // Create the TopMenuView with all of its options
            this.topMenuView = new TopMenuView(
                {
                    menuItems: [
                        {
                            name: "Home",
                            url: "/",
                            active: false
                        },
                        {
                            name: "Manuscripts",
                            url: "/manuscripts/",
                            active: false
                        },
                        {
                            name: "Search",
                            url: "#",
                            active: false
                        }
                    ]
                }
            )

            console.log("HeaderView constructed.");
        },

        render: function()
        {
            $(this.el).html(this.template());
            console.log("HeaderView rendered.");

            // Render subviews
            this.assign(this.topMenuView, '#top-menu');

            return this.trigger('render', this);
        }
    });

    var ManuscriptCollectionView = CantusAbstractView.extend
    ({
        template: null,
        collection: null,

        initialize: function(options)
        {
            _.bindAll(this, 'render', 'update');
            this.template= _.template($('#manuscript-collection-template').html());

            this.collection = new ManuscriptCollection(options.url);
            this.collection.fetch();

            this.listenTo(this.collection, 'sync', this.render);
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
            return this.trigger('render', this);
        }
    });

    var ManuscriptsPageView = CantusAbstractView.extend
    ({
        el: $('#view-goes-here'),

        //Subviews
        headerView: null,
        manuscriptCollectionView: null,

        initialize: function()
        {
            _.bindAll(this, 'render', 'update');
            this.template= _.template($('#manuscripts-page-template').html());

            //Subviews
            this.headerView = new HeaderView();
            this.manuscriptCollectionView = new ManuscriptCollectionView(
                {url: "http://localhost:8000/manuscripts/"});

            // Listen for changes
            this.listenTo(this.manuscriptCollectionView.collection, 'sync', this.afterFetch);
        },

        update: function()
        {
            this.manuscriptCollectionView.update();
        },

        render: function()
        {
            console.log("About to render ManuscriptCollectionViewtemplate...");
            $(this.el).html(this.template());

            this.assign(this.headerView, '.header');
            this.assign(this.manuscriptCollectionView, '.manuscript-list');

            console.log("ManuscriptCollectionView template rendered...");
            return this.trigger('render', this);
        }
    });

    var IndexPageView = CantusAbstractView.extend
    ({
        el: $('#view-goes-here'),

        // Subviews
        headerView: null,

        initialize: function()
        {
            _.bindAll(this, 'render');
            this.template= _.template($('#index-template').html());

            // Initialize the subviews
            this.headerView = new HeaderView();
        },

        render: function()
        {
            console.log("About to render IndexView...");
//            console.log(this.collection.toJSON());
            $(this.el).html(this.template());
            // Render subviews
            this.assign(this.headerView, '.header');

            console.log("IndexView template rendered...");
            return this.trigger('render', this);
        }
    });


    /*
    Routers
     */

    var Workspace = Backbone.Router.extend
    ({
        routes: {
            "" : "index",
            "manuscript/:query/": "manuscript",
            "manuscripts/": "manuscripts",
            '*path': "notFound"
        },

        index: function()
        {
            console.log("Index route.");
            var index = new IndexPageView();
            index.render();
        },

        manuscripts: function()
        {
            console.log("Manuscripts route.");
            var manuscripts = new ManuscriptsPageView();
            // Render initial templates
            manuscripts.render();
            // Fetch the data
            manuscripts.update();
        },

        manuscript: function(query)
        {
            console.log("Manuscript route.");
            var manuscript = new ManuscriptIndividualPageView({ id: query });
            // Render initial templates
            manuscript.render();
            // Fetch the data
            manuscript.getData();
        },

        notFound: function()
        {
            console.log("404 - Backbone route not found!");
        }
    });

    var route = new Workspace();

    // This gets the router working
    Backbone.history.start({ pushState: true });

})(jQuery);