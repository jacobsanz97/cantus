(function($){

    const siteUrl = "/";
    const iipImageServerUrl = "http://cantus.simssa.ca/iip/";
    const divaImageDirectory = "/opt/cantus/";

    // Global Event Handler for global events
    var globalEventHandler = {};
    _.extend(globalEventHandler, Backbone.Events);


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
//        defaults: function()
//        {
//            return {
//                marginalia: "the marginalia",
//                folio: "the folio",
//                sequence:"the sequence",
//                cantus_id: "the cantus id",
//                feast: "the feast",
//                office: "the office",
//                genre: "the genre",
//                lit_position: "the lit position",
//                mode: "the mode",
//                differentia: "the differentia",
//                finalis: "the finalis",
//                incipit: "the incipit",
//                full_text: "Quite a nice chant!",
//                concordances: [],
//                volpiano: "the volpiano",
//                manuscript: "the manuscript"
//            }
//        }
    });

    var Concordance = CantusAbstractModel.extend
    ({
//        defaults: function()
//        {
//            return {
//                letter_code: "ZZZ",
//                institution_city: "Montreal",
//                instutition_name: "DDMAL",
//                library_manuscript_name: "No Name",
//                date: "Right now",
//                location: "Montreal",
//                rism_code: "ABC1234"
//            }
//        }
    });

    var Folio = CantusAbstractModel.extend
    ({
//        defaults: function()
//        {
//            return {
//                number: "000",
//                manuscript: null,
//                chant_count: 0,
//                chant_set: []
//            }
//        }
    });

    var Manuscript = CantusAbstractModel.extend
    ({
//        defaults: function()
//        {
//            return {
//                url: "#",
//                name: "Test Name",
//                siglum: "Test Siglum",
//                siglum_slug: "#",
//                date: "Tomorrow",
//                provenance: "Test provenance",
//                description: "This is a nice manuscript...",
//                chant_count: 5
//            };
//        }
    });

    /**
     * This represents a search result.  It is experimental.
     */
    var SearchResult = Backbone.Model.extend
    ({
        initialize: function(pQuery)
        {
            this.setQuery(pQuery);
        },

        setQuery: function(query)
        {
            this.url = siteUrl + "search/?q=" + query;
        },

        /**
         * Formats the data to be printed in a search result list.
         */
        getFormattedData: function()
        {
            var output = [];

            _.each(this.toJSON().results, function(current)
            {
                var newElement = {};
                // Remove "cantusdata_" from the type string
                newElement.model = current.type.split("_")[1];
                newElement.name = current.Name;

                // Figure out what the name is based on the model in question
                switch(newElement.model)
                {
                    case "manuscript":
                        newElement.name = current.name;
                        // Build the url
                        newElement.url = "/" + newElement.model
                            + "/" + current.item_id + "/";
                        break;

                    case "chant":
                        newElement.name = current.incipit;
                        // Build the url
                        // TODO: Have this work with non-numbered folios
                        newElement.url = "/manuscript/" + current.manuscript_id
                            + "/#p=" + current.folio;
                        break;

                    case "concordance":
                        newElement.name = current.name;
                        // Build the url
                        newElement.url = "/" + newElement.model
                            + "/" + current.item_id + "/";
                        break;

                    case "folio":
                        newElement.name = current.name;
                        // Build the url
                        newElement.url = "/" + newElement.model
                            + "/" + current.item_id + "/";
                        break;
                }
                output.push(newElement);
            });
            return output;
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
            if (url) {
                this.url = url;
            }
        },

        defaults: function()
        {
            return []
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
    Component Views
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
        },

        unAssign : function (view, selector) {
            $(selector).empty();
        }
    });

    var ChantCollectionView = CantusAbstractView.extend
    ({
        initialize: function(options)
        {
            _.bindAll(this, 'render');
            this.template = _.template($('#chant-collection-template').html());
            if (options && options.url) {
                this.collection = new ChantCollection(options.url);
                this.collection.fetch();
            } else {
                this.collection = new ChantCollection();
            }
            // TODO: Figure out why this is still rendering multiple times
            this.listenTo(this.collection, 'sync', this.render);
        },

        /**
         * Set the URL of the collection and fetch the data.
         *
         * @param url
         */
        setUrl: function(url)
        {
            this.collection.url = url;
            this.collection.fetch();
        },

        /**
         * Render the collection.
         *
         * @returns {*}
         */
        render: function()
        {
            console.log("Rendering Chant Collection View.");
            // Render out the template
            $(this.el).html(this.template(
                {
                    chants: this.collection.toJSON()
                }
            ));
            return this.trigger('render', this);
        },

        resetCollection: function()
        {
            this.collection.reset();
        }
    });

    var DivaView = CantusAbstractView.extend
    ({
        currentFolioIndex: -1,
        currentFolioName: 0,

        timer: null,

        initialize: function(options)
        {
            _.bindAll(this, 'render', 'storeFolioIndex', 'triggerChange',
                'storeInitialFolio');
            this.siglum = options.siglum;
        },

        render: function()
        {
            console.log("Rendering Diva View.");
            // It's kind of hacky to doubly-bind the name like this, but I'm
            // not aware of any other way to access storeFolioIndex() from the
            // anonymous function below.
            var siglum = this.siglum;
            $("#diva-wrapper").diva({
                toolbarParentSelector: "#diva-toolbar",
                viewerWidthPadding: 0,
                enableAutoTitle: false,
                enableAutoWidth: false,
                enableAutoHeight: true,
                enableFilename: false,
                fixedHeightGrid: false,
                iipServerURL: iipImageServerUrl + "fcgi-bin/iipsrv.fcgi",
                objectData: "/static/" + siglum + ".json",
                imageDir: divaImageDirectory + siglum
            });
            console.log(iipImageServerUrl + "fcgi-bin/iipsrv.fcgi");
            diva.Events.subscribe("ViewerDidLoad", this.storeInitialFolio);
            diva.Events.subscribe("VisiblePageDidChange", this.storeFolioIndex);
            return this.trigger('render', this);
        },

        /**
         * Store the index and filename of the first loaded page.
         */
        storeInitialFolio: function()
        {
            var number = $("#diva-wrapper").data('diva').getCurrentPageIndex();
            var name = $("#diva-wrapper").data('diva').getCurrentPageFilename();
            this.storeFolioIndex(number, name);
        },

        /**
         * Store a folio index and image filename.
         *
         * @param index int
         * @param fileName string
         */
        storeFolioIndex: function(index, fileName)
        {
            if (index != this.currentFolioIndex)
            {
                this.currentFolioIndex = index;
                this.currentFolioName = fileName;

                if (this.timer !== null)
                {
                    window.clearTimeout(this.timer);
                }

                this.timer = window.setTimeout(this.triggerChange, 250);
            }
        },

        /**
         * Trigger the global manuscriptChangeFolio event.
         */
        triggerChange: function()
        {
            globalEventHandler.trigger("manuscriptChangeFolio");
        }


    });

    var FolioView = CantusAbstractView.extend
    ({
        /**
         * customNumber is the folio number that we actually render.
         */
        customNumber: 0,

        // Subviews
        chantCollectionView: null,

        initialize: function(options)
        {
            _.bindAll(this, 'render', 'afterFetch', 'assignChants');
            this.template= _.template($('#folio-template').html());

            // This can handle situations where the first folio
            // doesn't have a url but subsequent ones do.
            if (options && options.url)
            {
                this.setUrl(options.url);
            }
            else
            {
                this.model = new Folio();
                this.listenTo(this.model, 'sync', this.afterFetch);
            }
            this.chantCollectionView = new ChantCollectionView();
        },

        /**
         * Set the model URL.
         *
         * @param url
         */
        setUrl: function(url)
        {
            this.model = new Folio(url);
            this.listenTo(this.model, 'sync', this.afterFetch);
        },

        /**
         * Set the parameter that overrides the number that's rendered to the
         * screen.
         *
         * @param number
         */
        setCustomNumber: function(number)
        {
            this.customNumber = number;
        },

        /**
         * Fetch the latest version of the model.
         */
        update: function()
        {
            this.model.fetch();
        },

        /**
         * If the model is empty, un-render the view.  Otherwise, assign
         * the chants and render the view.
         */
        afterFetch: function()
        {
            if (jQuery.isEmptyObject(this.model.toJSON())) {
                console.log("Unassigning chant list.");
                this.unAssign('#chant-list');
            } else {
                this.assignChants();
                this.render();
            }
        },

        /**
         * Rebuild the list of chants
         */
        assignChants: function()
        {
            // We are going to query this data from SOLR because it's faster.
            // So we need the manuscript siglum and folio name.

            // We need to handle the data differently depending on whether
            // we're getting the information from Django or Solr.
            var folio_id;
            if (this.model.toJSON().item_id)
            {
                folio_id = this.model.toJSON().item_id;
            }
            else
            {
               folio_id = this.model.toJSON().id;
            }

//            console.log("item_id: " + this.model.toJSON().item_id);
//            console.log("id: " + this.model.toJSON().id);
//            console.log("folio_id: " + folio_id);

            if (folio_id !== undefined)
            {
                // Compose the url
                var composedUrl = siteUrl + "chant-set/folio/" + folio_id + "/";
                // Build a new view with the new data
                this.chantCollectionView.setUrl(composedUrl);
            }
            else
            {
                this.chantCollectionView.resetCollection();
            }
        },

        render: function()
        {
            console.log("Rendering Folio View.");
            $(this.el).html(this.template(
                {number: this.customNumber, model: this.model.toJSON()}
            ));
            this.renderChantCollectionView();

            return this.trigger('render', this);
        },

        /**
         * Render the collection of chants.
         */
        renderChantCollectionView: function()
        {
            if (this.chantCollectionView !== null) {
                this.assign(this.chantCollectionView, '#chant-list');
            }
        }
    });

    var HeaderView = CantusAbstractView.extend
    ({
        // Subviews
        topMenuView: null,
        searchView: null,
        searchModalView: null,


        initialize: function()
        {
            _.bindAll(this, 'render');
            this.template= _.template($('#header-template').html());

            // The search view that we will shove into the modal box
            this.searchView = new SearchView();
            // The modal box for the search pop-up
            this.searchModalView = new ModalView({title: "Search", view: this.searchView});

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
                            tags: 'data-toggle="modal" data-target="#myModal"',
                            url: "#",
                            active: false
                        }
                    ]
                }
            )
        },

        render: function()
        {
            console.log("Rendering Header View.");
            $(this.el).html(this.template());
            // Render subviews
            this.assign(this.topMenuView, '#top-menu');
            this.assign(this.searchModalView, '#search-modal');
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
            console.log("Rendering Top Menu View.");
            $(this.el).html(this.template({items: this.items}));
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
            console.log("Rendering Manuscript Collection View.");
            $(this.el).html(this.template({
                manuscripts: this.collection.toJSON()
            }));
            return this.trigger('render', this);
        }
    });

    /**
     * Draw a modal box containing a particular view.
     * This view follows the visitor design pattern.
     *
     * @type {*|void}
     */
    var ModalView = CantusAbstractView.extend
    ({
        title: null,
        visitorView: null,

        initialize: function(options)
        {
            _.bindAll(this, 'render');
            this.template = _.template($('#modal-template').html());

            this.title = options.title;
            this.visitorView = options.view;
        },

        render: function()
        {
            console.log("Rendering Modal View.");
            // Render out the modal template
            if (this.visitorView !== null)
            {
                $(this.el).html(this.template({title: this.title}));
            }
            // Render out the visitor
            this.assign(this.visitorView, '.modal-body');

            return this.trigger('render', this);
        }
    });

    /**
     * A simple paginator that fires events when it changes page.
     * Page indexes start at 1.
     *
     * @type {*|void}
     */
    var PaginationView = CantusAbstractView.extend
    ({
        name: null,
        elementCount: 1,
        pageCount: 1,
        pageSize: 10,

        // Used for rendering
        currentPage: 1,
        startPage: 1,
        endPage: 1,
        maxWidth: 9,

        events: {},

        initialize: function(options)
        {
            _.bindAll(this, 'render', 'setPage', 'increment', 'decrement',
                'render', 'buttonClick');
            this.template = _.template($('#pagination-template').html());

            this.name = options.name;

            // Set the size and the current
            this.elementCount = options.elementCount;
            this.pageSize = options.pageSize;

            // Calculate number of pages
            this.pageCount = Math.floor(this.elementCount / this.pageSize);
            if (this.elementCount % this.pageSize !== 0)
            {
                this.pageCount++;
            }

            // Page must be set after pagecount exists
            this.setPage(options.currentPage);
        },

        /**
         * Register the events that are necessary to have clickable buttons.
         */
        registerEvents: function()
        {
            // Clear out the events
            this.events = {}
            // No binding if there are no elements
            if (this.elementCount === 0) return;
            // Backwards
            if (this.currentPage > 1)
            {
                this.events["click #" + this.name + "-page-back"] = "decrement";
            }
            // Forwards
            if (this.currentPage < this.pageCount)
            {
                this.events["click #" + this.name + "-page-forward"] = "increment";
            }
            // Add the page clickers
            for (var i = this.startPage; i <= this.endPage; i++)
            {
                if (i !== this.currentPage)
                {
                    this.events["click #" + this.name + "-page-" + i] = "buttonClick";
                }
            }
            // Delegate the new events
            this.delegateEvents();
        },

        /**
         * Get the current paginator page.
         *
         * @returns {number}
         */
        getPage: function()
        {
            return this.currentPage;
        },

        /**
         * Set the page and render.
         *
         * @param page integer
         */
        setPage: function(page)
        {
            if (page < 1)
            {
                this.currentPage = 1;
            }
            else if (page > this.pageCount)
            {
                this.currentPage = this.pageCount;
            }
            else
            {
                this.currentPage = page;
            }

            if (this.pageCount <= this.maxWidth)
            {
                // This is the case where we don't need to scroll through
                // more pages than can fit in the paginator.
                this.startPage = 1;
                this.endPage = this.pageCount;
            }
            else
            {
                // This is the case where there are more pages than can fit
                // In the paginator, so we need to "scroll" through the numbers.
                if (this.currentPage <= Math.floor(((this.maxWidth | 0) / 2)))
                {
                    // This is the case of the first few numbers
                    this.startPage = 1;
                    this.endPage = this.maxWidth;
                }
                else if ((this.pageCount - this.currentPage) <= Math.floor((this.maxWidth | 0) / 2))
                {
                    // This is the case of the last few numbers
                    this.startPage = this.pageCount - this.maxWidth + 1;
                    this.endPage = this.pageCount;
                }
                else
                {
                    // This case should capture most instances where the
                    // current page is somewhere in the "middle" of the paginator"
                    this.startPage = this.currentPage - ((this.maxWidth / 2) | 0);
                    this.endPage = this.currentPage + ((this.maxWidth / 2) | 0);
                }
            }
            this.render();
            // We have to register the events every time we render
            this.registerEvents();
            this.trigger("change");
        },

        /**
         * Go to the next page.
         */
        increment: function()
        {
            this.setPage(this.currentPage + 1);
        },

        /**
         * Go to the previous page.
         */
        decrement: function()
        {
            this.setPage(this.currentPage - 1);
        },

        /**
         * This function gets called when you click on one of the numbered
         * paginator buttons.
         *
         * @param query
         */
        buttonClick: function(query)
        {
            console.log("button click");
            var buttonId = query.target.id;
            var newPage = parseInt(buttonId.split("page-")[1]);
            this.setPage(newPage);
        },

        render: function()
        {
            console.log("Rendering pagination view");
            $(this.el).html(this.template(
                {
                    name: this.name,
                    startPage: this.startPage,
                    endPage: this.endPage,
                    currentPage: this.currentPage
                }
            ));
            return this.trigger('render', this);
        }
    });

    var SearchView = CantusAbstractView.extend
    ({
        /**
         *
         */
        query: null,

        /**
         * Some additional text added to all queries.  For example, you might
         * want this view to only search through chants.  In that case,
         * you would set this.queryPostScript to "AND type:cantusdata_chant".
         */
        queryPostScript: null,

        timer: null,

        // Subviews
        searchResultView: null,

        events: {},

        initialize: function(options)
        {
            _.bindAll(this, 'render', 'newSearch', 'autoNewSearch',
                'registerEvents');
            this.template= _.template($('#search-template').html());
            // If not supplied, the query is blank
            if (options !== undefined)
            {
                // Is there a query?
                if (options.query !== undefined)
                {
                    this.query = options.query;
                }
                else
                {
                    this.query = "";
                }
                // Is there a query post script?
                if (options.queryPostScript !== undefined)
                {
                    this.setQueryPostScript(options.queryPostScript);
                }
            }

            //Date to use for checking timestamps
            this.searchResultView = new SearchResultView({query: this.query});

            // Re-register events if this.el changes
//            this.listenTo(this, "change", this.registerEvents);
        },

        /**
         * Set this.queryPostScript.
         *
         * @param postScript string
         */
        setQueryPostScript: function(postScript)
        {
            console.log("Setting query postscript:");
            console.log(String(postScript));
            this.queryPostScript = String(postScript);
        },

        /**
         * Take the value of the search input box and perform a search query
         * with it.  This function hits the API every time it is called.
         */
        newSearch: function()
        {
            console.log("New search!");
            // Grab the new search query
            var newQuery = encodeURIComponent($(this.$el.selector
                + ' .search-input').val());

            if (newQuery !== this.query) {
                this.query = newQuery;

                console.log("New search:");

                if (this.queryPostScript !== null)
                {
                    // Attach this.queryPostScript if available
                    this.searchResultView.changeQuery(newQuery + " "
                        + this.queryPostScript);
                    console.log(newQuery + " " + this.queryPostScript);
                }
                else
                {
                    // Set the new search results view
                    this.searchResultView.changeQuery(newQuery);
                    console.log(newQuery);
                }
//                app.navigate("/search/?q=" + this.query);
            }
        },

        /**
         * Register the events that are necessary to have search input.
         */
        registerEvents: function()
        {
            console.log("Registering search events for:");
            console.log(this.$el.selector);
            // Clear out the events
            this.events = {}
            // Register them
            console.log("click .search-button");
//            this.events["click " + this.$el.selector + ".search-button"] = "newSearch";
            this.events["change .search-input"] = "newSearch";
            this.events["input .search-input"] = "autoNewSearch";

            // Delegate the new events
            this.delegateEvents();
        },

        /**
         * Set the timer to perform a new search.
         * This is called when you want to avoid making multiple querie
         * very quickly.
         */
        autoNewSearch: function()
        {
            if (this.timer !== null)
            {
                console.log("Search timer cleared.");
                window.clearTimeout(this.timer);
            }
            this.timer = window.setTimeout(this.newSearch, 250);
        },

        render: function()
        {
            this.registerEvents();
            $(this.el).html(this.template({query: this.query}));
            // Render subviews
            console.log("Assign search result view:");
            console.log(this.$el.selector + '.search-result');
            $(this.$el.selector + ' .search-result').html("SEARCH RESULT VIEW!");
            this.assign(this.searchResultView, this.$el.selector + ' .search-result');
            return this.trigger('render', this);
        }
    });

    var SearchResultView = CantusAbstractView.extend
    ({
        pageSize: 10,
        currentPage: null,
        paginationView: null,
        query: null,

        initialize: function(options)
        {
            _.bindAll(this, 'render', 'updatePage', 'changeQuery',
                'updatePaginationView');
            this.template = _.template($('#search-result-template').html());
            this.currentPage = 1;
            this.model = new SearchResult();

            if (options.query !== undefined)
            {
                this.model.setQuery(options.query);
                this.query = options.query;
            }

            // Query the search result
            this.model.fetch({success: this.updatePaginationView});
            this.listenTo(this.model, 'sync', this.render);
        },

        /**
         * Set the model's query string and fetch results from the restful API.
         *
         * @param query string
         */
        changeQuery: function(query)
        {
            this.currentPage = 1;
            this.model.setQuery(query);
            this.query = query;
            this.model.fetch({success: this.updatePaginationView});
        },

        /**
         * Rebuild the pagination view with the latest data from the model.
         */
        updatePaginationView: function()
        {
            console.log("TEEEST");
            this.paginationView = new PaginationView(
                {
                    name: "search",
                    currentPage: this.currentPage,
                    elementCount: this.model.toJSON().numFound,
                    pageSize: this.pageSize
                }
            );
            this.listenTo(this.paginationView, 'change', this.updatePage);
        },

        /**
         * Grab the page number from the paginator
         */
        updatePage: function()
        {
            // Grab the page
            this.currentPage = this.paginationView.getPage();
            // Rebuild the model with a modified query
            this.model.setQuery(this.query + "&start="
                + (this.pageSize * (this.currentPage - 1)));
            this.model.fetch();
        },

        render: function()
        {
            console.log("Rendering Search Result View.");
            console.log(this.$el);
            // Only render if the model is defined
            if (this.model !== undefined)
            {
                $(this.el).html(this.template({results: this.model.getFormattedData()}));
            }
            if (this.paginationView !== null)
            {
                console.log("Pagination Assignment:");
//                console.log(this.$el.selector + '.pagination');
//                console.log($(this.$el.selector + '.pagination'));
                this.assign(this.paginationView, this.$el.selector + " .pagination");
            }

            return this.trigger('render', this);
        }
    });

    /*
    Page Views
     */

    /**
     * This is the homepage of the website.
     *
     * @type {*|void}
     */
    var IndexPageView = CantusAbstractView.extend
    ({
        el: $('#view-goes-here'),

        // Subviews
        headerView: null,

        initialize: function()
        {
            _.bindAll(this, 'render');
            this.template = _.template($('#index-template').html());
            // Initialize the subviews
            this.headerView = new HeaderView();
        },

        render: function()
        {
            console.log("Rendering Index Page View.");
            $(this.el).html(this.template());
            // Render subviews
            this.assign(this.headerView, '.header');
            return this.trigger('render', this);
        }
    });

    /**
     * This page shows an individual manuscript.  You get a nice diva viewer
     * and you can look through the chant info.
     *
     * @type {*|void}
     */
    var ManuscriptIndividualPageView = CantusAbstractView.extend
    ({
        el: $('#view-goes-here'),

        id: null,
        manuscript: null,
        searchView: null,

        // Subviews
        headerView: null,
        divaView: null,
        folioView: null,

        initialize: function()
        {
            _.bindAll(this, 'render', 'afterFetch', 'updateFolio');
            this.template= _.template($('#manuscript-template').html());
            this.manuscript = new Manuscript(
                siteUrl + "manuscript/" + this.id + "/");
            // Build the subviews
            this.headerView = new HeaderView();
            this.divaView = new DivaView({siglum: this.manuscript.get("siglum_slug")});
            this.folioView = new FolioView();
            this.searchView = new SearchView();

            // Render every time the model changes...
            this.listenTo(this.manuscript, 'change', this.afterFetch);
            // Switch page when necessary
            this.listenTo(globalEventHandler, "manuscriptChangeFolio", this.updateFolio);
        },

        updateFolio: function()
        {
            this.activeFolioName = this.divaView.currentFolioName;
            // Pull out the folio number from the Diva view
            var splitFolioName = this.activeFolioName.split('.')[0].split('_');
            // Grab the finalmost element before
            var folioNumber = splitFolioName[splitFolioName.length - 1];
            // Query the folio set at that specific manuscript number
            newUrl =  siteUrl + "folio-set/manuscript/"
                      + this.manuscript.toJSON().id + "/"
                      + folioNumber + "/";
            console.log("Old url: " + this.folioView.model.url);
            console.log("New url: " + newUrl);
            // Rebuild the folio View
            this.folioView.setUrl(newUrl);
            this.folioView.setCustomNumber(folioNumber);
            this.folioView.update();
        },

        /**
         * Fetch the manuscript's data from the API.
         */
        getData: function()
        {
            this.manuscript.fetch();
        },

        afterFetch: function()
        {
            // Set the search view to only search this manuscript
            this.searchView.setQueryPostScript('AND manuscript:"'
                + this.manuscript.toJSON().siglum + '"');

            this.divaView = new DivaView({siglum: this.manuscript.get("siglum_slug")});
            this.render();
        },

        render: function()
        {
            console.log("Rendering Manuscript Individual Page View.");
            $(this.el).html(this.template({
                manuscript: this.manuscript.toJSON()
            }));

            // Render subviews
            this.assign(this.headerView, '.header');

            if (this.divaView !== undefined) {
                this.assign(this.divaView, '#diva-wrapper');
            }
            this.renderFolioView();
            this.assign(this.searchView, '#manuscript-search');

            return this.trigger('render', this);
        },

        renderFolioView: function()
        {
            if (this.divaView !== undefined) {
                this.assign(this.folioView, '#folio');
            }
        }

    });

    /**
     * This page is a big list of manuscripts.
     *
     * @type {*|void}
     */
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
                {url: siteUrl + "manuscripts/"});
            // Listen for changes
            this.listenTo(this.manuscriptCollectionView.collection, 'sync', this.afterFetch);
        },

        update: function()
        {
            this.manuscriptCollectionView.update();
        },

        render: function()
        {
            $(this.el).html(this.template());
            this.assign(this.headerView, '.header');
            this.assign(this.manuscriptCollectionView, '.manuscript-list');
            return this.trigger('render', this);
        }
    });

    /**
     * This page is for searching.
     *
     * @type {*|void}
     */
    var SearchPageView = CantusAbstractView.extend
    ({
        el: $('#view-goes-here'),

        // Subviews
        headerView: null,
        searchView: null,

        initialize: function(options)
        {
            _.bindAll(this, 'render');
            this.template= _.template($('#search-page-template').html());
            // Initialize the subviews
            this.headerView = new HeaderView();
            this.searchView = new SearchView({query: options.query});
        },

        render: function()
        {
            console.log("Rendering Search Page View.");
            $(this.el).html(this.template());
            // Render subviews
            this.assign(this.headerView, '.header');
            this.assign(this.searchView, '#search');
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
            "manuscript/:query/": "manuscriptSingle",
            "manuscripts/": "manuscripts",
            "search/": "search",
            "search/?q=(:query)": "search",
            '*path': "notFound"
        },

        index: function()
        {
            var index = new IndexPageView();
            index.render();
        },

        manuscripts: function()
        {
            var manuscripts = new ManuscriptsPageView();
            // Render initial templates
            manuscripts.render();
            // Fetch the data
            manuscripts.update();
        },

        manuscriptSingle: function(query)
        {
            var manuscript = new ManuscriptIndividualPageView({ id: query });
            // Fetch the data
            manuscript.getData();
        },

        search: function(query)
        {
            var search = new SearchPageView({query: query});
            search.render();
        },

        notFound: function()
        {
            console.log("404 - Backbone route not found!");
        }
    });

    var app = new Workspace();

    // This gets the router working
    Backbone.history.start({ pushState: true });

})(jQuery);