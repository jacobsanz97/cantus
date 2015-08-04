define(["underscore",
        "marionette",
        "collections/SearchNotationResultCollection",
        "views/SearchNotationResultView",
        "views/SearchResultHeadingView"],
function(_,
         Marionette,
         SearchNotationResultCollection,
         SearchNotationResultView,
         SearchResultHeadingView)
{
    "use strict";

    /**
     * Provide an alert message to the user.
     */
    return Marionette.LayoutView.extend
    ({
        query: null,
        field: null,

        results: null,
        divaView: null,
        manuscript: undefined,

        template: "#search-notation-template",

        searchPlugins: [
            {
                name: 'neume-search',
                fields: [
                    {
                        name: 'Neume',
                        type: 'neumes'
                    }
                ]
            },
            {
                name: 'pitch-search',
                fields: [
                    {
                        name: 'Pitch',
                        type: 'pnames'
                    },
                    {
                        name: 'Pitch (invariant)',
                        type: 'pnames-invariant'
                    },
                    {
                        name: 'Contour',
                        type: 'contour'
                    },
                    {
                        name: 'Interval',
                        type: 'intervals'
                    }
                ]
            }
        ],

        ui: {
            typeSelector: ".search-field",
            searchBox: ".query-input"
        },

        events: {
            submit: 'newSearch'
        },

        regions: {
            resultHeading: ".result-heading",
            searchResults: ".note-search-results",
            glyphTypesRegion: ".glyph-types"
        },

        initialize: function(options)
        {
            _.bindAll(this, 'newSearch', 'resultFetchCallback', 'zoomToResult', 'getSearchMetadata');

            // The diva view which we will act upon!
            this.divaView = options.divaView;

            this.searchFields = [];

            this.results = new SearchNotationResultCollection();
            this.listenTo(this.results, "sync", this.resultFetchCallback);
        },

        getSearchType: function()
        {
            return encodeURIComponent(this.ui.typeSelector.val());
        },

        getSearchValue: function()
        {
            return encodeURIComponent(this.ui.searchBox.val());
        },

        setManuscript: function(model)
        {
            this.manuscript = model.get('siglum_slug');

            this.searchFields.splice(this.searchFields.length);

            _.forEach(this.searchPlugins, function (plugin)
            {
                if (model.isPluginActivated(plugin.name))
                {
                    this.searchFields.push.apply(this.searchFields, plugin.fields);
                }
            }, this);
        },

        newSearch: function(event)
        {
            // Stop the page from auto-reloading
            event.preventDefault();
            // Grab the query
            this.query  = this.getSearchValue();

            // If we pass an empty array, then all boxes are erased.
            this.divaView.paintBoxes([]);

            // Handle the empty case
            if (!this.query)
            {
                this.results.reset(null, {message: 'Please enter a search query.'});
            }
            else
            {
                // Grab the field name
                // FIXME(wabain): does this need to be an attribute?
                var field = this.field = this.getSearchType();

                var fieldName = _.find(this.searchFields, function (fieldDescription)
                {
                    return fieldDescription.type === field;
                }).name;

                this.results.updateParameters({
                    field: this.field,
                    fieldName: fieldName,
                    query: this.query,
                    manuscript: this.manuscript
                });

                this.results.fetch();
            }
            return false;
        },

        resultFetchCallback: function()
        {
            this.divaView.paintBoxes(_.flatten(this.results.map(function (model)
            {
                return _.map(model.get('boxes'), _.clone);
            })));

            if (this.results.length > 0)
                this.zoomToResult(this.results.at(0));
        },

        zoomToResult: function(model)
        {
            this.divaView.zoomToLocation(_.clone(model.get('boxes')[0]));
        },

        serializeData: function()
        {
            return {
                searchFields: this.searchFields
            };
        },

        //onRender: function()
        //{
        //    // TODO: Implement the search query builder
        //    //var glyphTypes = new Backbone.Collection();
        //    //glyphTypes.add(new Backbone.Model());
        //    //this.glyphTypesRegion.show(new GlyphTypeCollectionView({
        //    //    collection: glyphTypes
        //    //}));
        //},

        getSearchMetadata: function ()
        {
            return {
                fieldName: this.results.parameters.fieldName,
                query: decodeURIComponent(this.results.parameters.query)
            };
        },

        onRender: function()
        {
            this.resultHeading.show(new SearchResultHeadingView({
                collection: this.results,
                showLoading: true,
                getSearchMetadata: this.getSearchMetadata
            }));

            var resultView = new SearchNotationResultView({
                collection: this.results
            });

            this.listenTo(resultView, 'zoomToResult', this.zoomToResult);

            this.searchResults.show(resultView);
        }
    });
});