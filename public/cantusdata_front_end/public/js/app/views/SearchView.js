define(['backbone', 'marionette',
        "utils/SolrQuery",
        "models/SearchInput",
        "collections/SearchResultCollection",
        "views/collection_views/SearchResultCollectionView",
        "views/SearchInputView"],
    function(Backbone, Marionette,
             SolrQuery,
             SearchInput,
             SearchResultCollection,
             SearchResultCollectionView,
             SearchInputView) {

        "use strict";

        /**
         * Top-level search view
         */
        return Marionette.LayoutView.extend({
            template: "#search-template",

            showManuscriptName: true,

            regions: {
                searchResultRegion: ".search-results",
                searchInputRegion: ".search-input-container"
            },

            /**
             * Initialization options:
             *
             * - `restriction`: restrictions to apply to all queries originating
             *    from the view
             * - `query`: initial query to search for
             * - `field`: initial field to search with
             */
            initialize: function()
            {
                _.bindAll(this, 'search', 'setRestriction');

                // Set options
                this.restrictions = this.getOption('restrictions') || {};
                this.showManuscriptName = this.getOption('showManuscriptName');

                // Initialize search input model
                this.searchParameters = new SearchInput();

                // Initialize search result collection which is sorted
                // by the criteria specified by the search input
                this.collection = new SearchResultCollection(null, {
                    comparisonParameters: this.searchParameters
                });

                // Set initial values for query and field if they are provided
                this.searchParameters.set(_.filter({
                    query: this.getOption('query'),
                    field: this.getOption('field')
                },  _.identity));

                // Trigger a search when the search query or field changes
                this.listenTo(this.searchParameters, 'change:query change:field', this.search);

                // Execute an initial search if there is a query
                if (this.searchParameters.get('query'))
                    this.search();
            },

            /**
             * Add a restriction to apply to all queries originating in the view.
             * @param {string} field
             * @param {string} value
             */
            setRestriction: function (field, value)
            {
                this.restrictions[field] = value;

                // If there is a search active then redo it
                if (this.searchParameters.get('query'))
                    this.search();
            },

            /**
             * Take the value of the search input box and perform a search query
             * with it. This function hits the API (possibly multiple times) every
             * time it is called if the query is non-empty.
             */
            search: function()
            {
                var query = this.searchParameters.get('query');
                var field = this.searchParameters.get('field');

                if (!query)
                {
                    this.collection.reset();
                    return;
                }

                if (field !== 'all')
                {
                    // FIXME(wabain): I don't think this is ever actually triggered
                    // If the field is a mode then the value is already an array
                    if (_.isString(query))
                        query = query.split(',');
                }

                var queryBuilder = new SolrQuery();
                queryBuilder.setField(field, query, 'OR');

                _.forEach(this.restrictions, function (value, field) {
                    queryBuilder.setField(field, value);
                });

                this.collection.fetch({baseSolrQuery: queryBuilder});
            },

            onRender: function ()
            {
                this.searchInputRegion.show(new SearchInputView({model: this.searchParameters}));

                this.searchResultRegion.show(new SearchResultCollectionView({
                    collection: this.collection,
                    showManuscriptName: this.showManuscriptName,
                    searchParameters: this.searchParameters
                }));
            }
        });
    });