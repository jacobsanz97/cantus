define(['underscore',
        'marionette',
        "models/Manuscript",
        "views/FolioView",
        "views/DivaView",
        "views/InternalSearchView",
        "views/SearchNotationView",
        "views/ManuscriptDataPopoverView",
        "singletons/GlobalEventHandler",
        "config/GlobalVars"],
function(_,
         Marionette,
         Manuscript,
         FolioView,
         DivaView,
         InternalSearchView,
         SearchNotationView,
         ManuscriptDataPopoverView,
         GlobalEventHandler,
         GlobalVars)
{

"use strict";

/**
 * This page shows an individual manuscript.  You get a nice diva viewer
 * and you can look through the chant info.
 *
 * @type {*|void}
 */
return Marionette.LayoutView.extend
({
    template: '#manuscript-template',

    searchView: null,
    searchNotationView: null,
    popoverContent: null,

    initialViewPortSize: null,

    // Subviews
    divaView: null,
    folioView: null,

    ui: {
        manuscriptTitleContainer: '#manuscript-title-container',
        manuscriptTitlePopoverLink: '#manuscript-title-popover-link'
    },

    // FIXME(wabain): use inserted.bs.popover after updating bootstrap
    events: {
        'shown.bs.popover @ui.manuscriptTitlePopoverLink': 'instantiatePopoverView',
        'hidden.bs.popover @ui.manuscriptTitlePopoverLink': 'destroyPopoverView'
    },

    regions: {
        divaViewRegion: "#diva-column",
        folioViewRegion: "#folio",
        searchViewRegion: "#manuscript-search",
        searchNotationViewRegion: "#search-notation"
    },

    behaviors: {
        resize: {
            target: '#manuscript-data-container',
            action: 'onWindowResized'
        }
    },

    initialize: function (options)
    {
        _.bindAll(this, 'getPopoverContent');

        // Build the subviews
        this.divaView = new DivaView(
            {
                siglum: this.model.get("siglum_slug"),
                folio: options.folio
            }
        );
        this.folioView = new FolioView();
        this.searchView = new InternalSearchView();
        this.searchNotationView = new SearchNotationView(
            {
                divaView: this.divaView
            }
        );

        // Render every time the model changes...
        this.listenTo(this.model, 'change', this.afterFetch);
        // Switch page when necessary
        this.listenTo(GlobalEventHandler, "ChangeFolio", this.updateFolio);
    },

    remove: function()
    {
        // Deal with the event listeners
        this.stopListening();
        this.undelegateEvents();
        // Nullify the manuscript model
        this.model = null;
        // Nullify the views
        this.divaView = null;
        this.searchView = null;
        this.searchNotationView = null;
        this.folioView = null;
        // Remove from the dom
        this.$el.empty();
    },

    /**
     * Marionette method called automatically before the destroy event happens.
     */
    onBeforeDestroy: function()
    {
        this.divaView.destroy();
        this.searchView.destroy();
        this.searchNotationView.destroy();
        this.folioView.destroy();
        this.destroyPopoverView();

        this.restoreInitialViewPortSize();
    },

    instantiatePopoverView: function ()
    {
        this.popoverView = new ManuscriptDataPopoverView({
            el: this.ui.manuscriptTitleContainer.find('.popover')
        });
    },

    destroyPopoverView: function ()
    {
        if (this.popoverView)
        {
            this.popoverView.destroy();
            this.popoverView = null;
        }
    },

    /**
     * Update the view for a changed folio
     */
    updateFolio: function(folio)
    {
        // Query the folio set at that specific manuscript number
        var newUrl =  GlobalVars.siteUrl + "folio-set/manuscript/" + this.model.id + "/" + folio + "/";

        // Rebuild the folio View
        this.folioView.setCustomNumber(folio);
        this.folioView.setUrl(newUrl);
    },

    /**
     * Get the HTML content for the manuscript data popover, generating it from a template if it has not
     * already been initialized.
     *
     * @returns {string}
     */
    getPopoverContent: function ()
    {
        if (!this.popoverContent)
            this.popoverContent = Marionette.TemplateCache.get('#manuscript-data-template')(this.serializeData());

        return this.popoverContent;
    },

    afterFetch: function()
    {
        // Figure out what search fields to activate
        var notationSearchFields = {};

        if (this.model.isPluginActivated("pitch-search"))
        {
            notationSearchFields.pnames = "Pitch";
        }
        if (this.model.isPluginActivated("neume-search"))
        {
            notationSearchFields.neumes = "Neume";
        }

        // Set the search view to only search this manuscript
        this.searchView.setRestriction('manuscript', '"' + this.model.get("siglum") + '"');
        this.divaView.setManuscript(this.model.get("siglum_slug"));
        this.searchNotationView.setManuscript(this.model.get("siglum_slug"));
        this.searchNotationView.setSearchFields(notationSearchFields);

        // Set the document title to reflect the manuscript name
        GlobalEventHandler.trigger("ChangeDocumentTitle", this.model.get("name"));
    },

    onShow: function()
    {
        this.storeInitialViewPortSize();
        this.setViewPortSize();

        this.ui.manuscriptTitlePopoverLink.popover({
            content: this.getPopoverContent,
            html: true
        });

        // Render subviews
        if (this.divaView !== undefined)
        {
            this.divaViewRegion.show(this.divaView, {preventDestroy: true});
            this.folioViewRegion.show(this.folioView, {preventDestroy: true});
        }

        this.searchViewRegion.show(this.searchView);
        this.searchNotationViewRegion.show(this.searchNotationView);
    },

    onWindowResized: function ()
    {
        this.setViewPortSize();
    },

    setViewPortSize: function()
    {
        // FIXME(wabain): Figure out if we really need to do this at all
        if ($(window).width() <= 880)
        {
            // Small screens
            $('meta[name=viewport]').attr('content', 'width=880, user-scalable=no');
        }
        else
        {
            // Big screens
            $('meta[name=viewport]').attr('content', 'width=device-width');
        }
    },

    storeInitialViewPortSize: function ()
    {
        this.initialViewPortSize = $('meta[name=viewport]').attr('content');
    },

    restoreInitialViewPortSize: function ()
    {
        if (this.initialViewPortSize)
            $('meta[name=viewport]').attr('content', this.initialViewPortSize);
    }
});
});
