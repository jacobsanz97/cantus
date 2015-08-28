define(["underscore",
        "backbone",
        "marionette",
        "link-watcher",
        "qs",
        "config/GlobalVars",
        "models/ManuscriptStateModel",
        "models/Manuscript",
        "views/RootView",
        "views/HeaderView",
        "views/ManuscriptsPageView",
        "views/ManuscriptIndividualPageView",
        "views/SearchPageView",
        "singletons/NavigationManager"],
    function(_,
             Backbone,
             Marionette,
             LinkWatcher,
             Qs,
             GlobalVars,
             ManuscriptStateModel,
             Manuscript,
             RootView,
             HeaderView,
             ManuscriptsPageView,
             ManuscriptIndividualPageView,
             SearchPageView,
             NavigationManager)
    {
        "use strict";

        return Marionette.Object.extend({
            initialize: function(options)
            {
                this.rootView = this.getOption('rootView', options);

                this.initialRouteComplete = false;
                this.listenToOnce(Backbone.history, 'route', function ()
                {
                    this.initialRouteComplete = true;
                });

                // Change the document title when the title global changes
                this.listenTo(NavigationManager.titling, 'change:title', function (model, title)
                {
                    this.setDocumentTitle(title);
                });

                // Maintain a manuscript state object that persists as long as the
                // route is the manuscript detail route
                this.manuscriptState = null;
                this.listenTo(Backbone.history, 'route', function (router, route)
                {
                    if (this.manuscriptState && route !== 'manuscriptSingle')
                    {
                        this.manuscriptState.trigger('exiting:route');
                        this.manuscriptState = null;
                    }
                });
            },

            /** Initialize the layout for the application */
            onBeforeStart: function()
            {
                // The manuscripts page has no state, so we might as well instantiate it
                this.manuscriptsPageView = new ManuscriptsPageView();

                // Navigate to clicked links
                LinkWatcher.onLinkClicked(document.body, function (event, info)
                {
                    if (info.isLocalNavigation && !info.isFragmentNavigation)
                    {
                        event.preventDefault();
                        Backbone.history.navigate(info.relativePath, {trigger: true});
                    }
                }, {rootHref: GlobalVars.siteUrl});
            },

            /**
             * Display the manuscripts list page
             */
            manuscripts: function()
            {
                this.showContentView(this.manuscriptsPageView, {title: 'Manuscripts'});
            },

            /**
             * Display the detail view for a specific manuscript
             *
             * @param id The manuscript ID
             * @param query The query string
             */
            manuscriptSingle: function(id, query)
            {
                var params = Qs.parse(query);
                var state = _.extend({manuscript: id}, _.pick(params, ['folio', 'chant', 'search']));

                // Update the manuscript state model if necessary; don't reload the whole
                // view if the manuscript has not changed
                if (!this.manuscriptState)
                {
                    this.manuscriptState = new ManuscriptStateModel();
                }
                else if (this.manuscriptState.get('manuscript') === id)
                {
                    this.manuscriptState.set(state, {stateChangeParams: {replaceState: true}});
                    return;
                }

                /* Render the view once the manuscript model has been loaded from the server.
                 *
                 * FIXME: We do things this way (instantiating the page view with a loaded model after
                 * each manuscript change) for two reasons:
                 *
                 * 1. The views aren't set up to be instantiated and rendered without a loaded model
                 * 2. Some of the views can't handle changes to the manuscript
                 *
                 * Fixing (1) probably isn't worth it, but fixing (2) might be
                 */
                this.listenToOnce(this.manuscriptState, 'load:manuscript', function (model)
                {
                    this.showContentView(new ManuscriptIndividualPageView({model: model}), {
                        title: model.get("name"),
                        navbarTitle: model.get("provenance") + ", " + model.get("siglum")
                    });
                });

                this.manuscriptState.set(state, {stateChangeParams: {replaceState: true}});
            },

            /**
             * Display the standalone search view
             *
             * @param queryString The query string
             */
            search: function(queryString)
            {
                var queryParams = Qs.parse(queryString);

                var query = queryParams.q;

                // FIXME: for now we just use the default search type
                this.showContentView(new SearchPageView({
                    searchTerm: {query: query}
                }), {title: 'Search'});
            },

            notFound: function()
            {
                if (!this.initialRouteComplete)
                {
                    // If this is the initial route then we've probably done something wrong.
                    // We can't trigger a browser reload since that would probably kick off an
                    // infinite loop.

                    // jshint devel:true
                    console.error('Started at unrecognized page: %s (fragment %s)', window.location.href,
                        Backbone.history.fragment);
                }
                else if (Backbone.history._hasPushState)
                {
                    // Trigger a browser reload
                    Backbone.history.location.href = Backbone.history.location.href;
                }
                else
                {
                    // Send the browser to the page for the current fragment
                    window.location = GlobalVars.siteUrl + Backbone.history.fragment;
                }
            },

            /**
             * Show the view in the mainContent region, setting the page title according to titleSettings
             *
             * @param newView
             * @param titleSettings
             */
            showContentView: function(newView, titleSettings)
            {
                this.rootView.mainContent.show(newView, {preventDestroy: this.shouldDestroyMainContentView()});
                NavigationManager.registerPage(titleSettings);
            },

            /**
             * Determine whether the current view of the main content region should be destroyed
             * when another view is rendered.
             *
             * @returns {boolean}
             */
            shouldDestroyMainContentView: function()
            {
                return this.rootView.mainContent.currentView === this.manuscriptsPageView;
            },

            /**
             * Set the title of the HTML document.
             *
             * @param title
             */
            setDocumentTitle: function(title)
            {
                if (title)
                    document.title = "Cantus Ultimus — " + title;
                else
                    document.title = "Cantus Ultimus";
            }
        });
    });