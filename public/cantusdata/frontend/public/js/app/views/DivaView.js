define(['marionette',
        'backbone',
        'jquery',
        "underscore",
        "diva",
        "diva/plugins/highlight",
        "diva/plugins/download",
        "diva/plugins/canvas",
        "diva/plugins/pagealias",
        "singletons/GlobalEventHandler",
        "config/GlobalVars"],
function(Marionette,
         Backbone,
         $,
         _,
         diva,
         DivaHighlight,
         DivaDownload,
         DivaCanvas,
         DivaPagealias,
         GlobalEventHandler,
         GlobalVars)
{

"use strict";

var manuscriptChannel = Backbone.Radio.channel('manuscript');

/**
 * Provide an alert message to the user.
 */
return Marionette.ItemView.extend
({
    //el: "#diva-wrapper",
    template: "#diva-template",

    divaInitialized: false,

    // Only used if initial folio
    initialFolio: undefined,

    currentFolioIndex: -1,
    currentFolioName: 0,

    imagePrefix: null,
    imageSuffix: "",

    ui: {
        divaWrapper: "#diva-wrapper"
    },

    behaviors: {
        resize: {
            target: '.diva-outer',
            action: 'publishDivaPanelResizedEvent'
        }
    },

    initialize: function(options)
    {
        _.bindAll(this, 'storeFolioIndex', 'onViewerLoad', 'setFolio',
            'setGlobalFullScreen', 'zoomToLocation', 'getPageAlias',
            'initializePageAliasing', 'gotoInputPage', 'getPageWhichMatchesAlias',
            'onDocLoad');

        this.divaEventHandles = [];

        // Create a debounced function to alert Diva that its panel size
        // has changed
        this.publishDivaPanelResizedEvent = _.debounce(function ()
        {
            diva.Events.publish("PanelSizeDidChange");
        }, 500);

        //this.el = options.el;
        this.toolbarParentObject = this.options.toolbarParentObject;

        this._setManuscript(options.siglum, manuscriptChannel.request('folio'));

        // Update the folio on change
        // FIXME(wabain): Support manuscript change?
        this.listenTo(manuscriptChannel, 'change:folio', function (number)
        {
            this.setFolio(number);
        });
    },

    onBeforeDestroy: function()
    {
        // Uninitialize Diva
        this.uninitializeDiva();
        // Clear the fields
        this.initialFolio = null;
        this.currentFolioName = null;
        this.currentFolioIndex = null;
        this.imagePrefix = null;
        this.imageSuffix = null;
    },

    /**
     * Destroy the Diva viewer, if it exists.
     */
    uninitializeDiva: function()
    {
        // Diva's default destructor
        this.divaInstance.destroy();
        this.divaInstance = null;

        if (this.divaInitialized)
        {
            // Unsubscribe the event handlers
            _.forEach(this.divaEventHandles, function (handle)
            {
                diva.Events.unsubscribe(handle);
            });

            this.divaEventHandles.splice(this.divaEventHandles.length);
        }
    },

    /**
     * Initialize Diva and subscribe to its events.
     */
    initializeDiva: function()
    {
        var siglum = this.siglum;

        var options = {
            toolbarParentObject: this.toolbarParentObject,
            viewerWidthPadding: 0,

            enableAutoTitle: false,
            enableAutoWidth: false,
            enableAutoHeight: false,
            enableFilename: false,
            enableHighlight: true,
            enableDownload: true,

            enablePagealias: true,
            pageAliasFunction: this.getPageAlias,

            fixedHeightGrid: false,

            enableKeyScroll: false,
            enableSpaceScroll: false,
            enableCanvas: true,

            iipServerURL: GlobalVars.iipImageServerUrl,
            objectData: "/static/" + siglum + ".json",
            imageDir: GlobalVars.divaImageDirectory + siglum,

            blockMobileMove: false
        };

        // Destroy the diva div just in case
        this.ui.divaWrapper.empty();
        // Initialize Diva
        this.ui.divaWrapper.diva(options);

        // TODO(wabain): Take this out after upgrading to Diva 4.0
        // Remove the extra viewport element Diva inserts on mobile devices
        $(document.head).find('meta[name=viewport]').slice(1).remove();

        this.divaInstance = this.ui.divaWrapper.data('diva');

        this.onDivaEvent("ViewerDidLoad", this.onViewerLoad);
        this.onDivaEvent("ViewerDidLoad", this.initializePageAliasing);
        this.onDivaEvent("VisiblePageDidChange", this.storeFolioIndex);
        this.onDivaEvent("ModeDidSwitch", this.setGlobalFullScreen);
        this.onDivaEvent("DocumentDidLoad", this.onDocLoad);

        // Remember that we've initialized diva
        this.divaInitialized = true;
    },

    /**
     * Subscribe to a Diva event, registering it for automatic deregistration
     * @param event
     * @param callback
     */
    onDivaEvent: function (event, callback)
    {
        this.divaEventHandles.push(diva.Events.subscribe(event, callback));
    },

    /**
     * Workaround for a weird Chrome bug - sometimes setting the style on the
     * diva-inner element doesn't work. The CSS value is changed, but the width
     * of the element itself is not. Manually re-applying the change in the Developer
     * Console makes it work, so it doesn't seem to be a styling issue.
     *
     * When this happens, setting the width to a different but close value seems to work.
     */
    onDocLoad: function ()
    {
        var inner = this.ui.divaWrapper.find('.diva-inner');
        var cssWidth = parseInt(inner[0].style.width, 10);

        if (cssWidth && cssWidth !== inner.width())
        {
            // jshint devel:true
            console.warn(
                "Trying to mitigate a Diva zooming bug...\n" +
                "If you're not using Chrome, you shouldn't be seeing this.\n" +
                "See https://github.com/DDMAL/cantus/issues/206");

            inner[0].style.width = (cssWidth + 1) + 'px';
        }
    },

    /**
     * Return an alias for display based on the folio for the page at the given index
     *
     * @param pageIndex
     * @returns {string}
     */
    getPageAlias: function (pageIndex)
    {
        var folio = this.imageNameToFolio(this.divaFilenames[pageIndex]);

        var pageNumber = pageIndex + 1;

        // Append an opening parenthesis and the page number
        // This is a hack, since Diva doesn't have functionality to customize the page label
        // beyond the pagealias plugin
        return folio + ' (' + pageNumber;
    },

    /**
     * Replacement callback for the Diva page input submission
     */
    gotoInputPage: function (event)
    {
        event.preventDefault();

        var pageInput = this.toolbarParentObject.find(this.divaInstance.getInstanceSelector() + 'goto-page-input');
        var pageAlias = pageInput.val();

        if (!pageAlias)
            return;

        var actualPage = this.getPageWhichMatchesAlias(pageAlias);

        if (actualPage === null)
        {
            alert("Invalid page number");
        }
        else
        {
            this.divaInstance.gotoPageByIndex(actualPage);
        }
    },

    /**
     * Implement lenient matching for a page alias. Handle leading zeros for
     * numerical folio names, prefix characters (for appendices, etc.) and suffix
     * characters (e.g. r and v for recto and verso).
     *
     * Given a bare page number, it will automatically match it with a recto page
     * with that number.
     *
     * Examples: Suppose the folios are named 0000a, 0000b, 001r, 001v, and A001r
     *
     *   - 0a would match 0000a
     *   - a1 would match A001r
     *   - 0001 would match 001r
     *
     * @param alias {string}
     * @returns {number|null} The index of the page with the matching folio name
     */
    getPageWhichMatchesAlias: function (alias)
    {
        if (!alias)
            return null;

        // Try to split the page alias into the following components:
        //   - an optional non-numerical leading value
        //   - an integer value (with leading zeros stripped)
        //   - an optional non-numerical trailing value
        var coreNumber = /^\s*([^0-9]*)0*([1-9][0-9]*|0)([^0-9]*)\s*$/.exec(alias);

        var aliasRegex;

        if (coreNumber)
        {
            var leading = coreNumber[1],
                number = coreNumber[2],
                trailing = coreNumber[3];

            leading = this.escapeRegex(leading);

            if (trailing)
            {
                trailing = this.escapeRegex(trailing);
            }
            else
            {
                // If there is no trailing value, then allow for a recto suffix by default
                trailing = 'r?';
            }

            // Get a case-insensitive regex which allows any number of leading zeros
            // and then the number
            aliasRegex = new RegExp('^' + leading + '0*' + number + trailing + '$', 'i');
        }
        else
        {
            // If the core number detection failed, just strip whitespace and get a case-insensitive regex
            aliasRegex = new RegExp('^' + this.escapeRegex(alias.replace(/(^\s+|\s+$)/g, '')) + '$', 'i');
        }

        // Find a folio which matches this pattern
        // TODO(wabain): cache folio names
        var length = this.divaFilenames.length;
        for (var i = 0; i < length; i++)
        {
            if (this.imageNameToFolio(this.divaFilenames[i]).match(aliasRegex))
            {
                return i;
            }
        }

        // We didn't find a match; fall back to treating this as a non-aliased page number
        if (alias.match(/^\d+$/))
        {
            var pageIndex = parseInt(alias, 10) - 1;

            if (pageIndex >= 0 && pageIndex < length)
            {
                return pageIndex;
            }
        }

        // If nothing worked, then just return null
        return null;
    },

    /**
     * Escape a string so that it can be used searched for literally in a regex.
     * Implementation adapted from Backbone.Router._routeToRegExp
     */
    escapeRegex: function (s)
    {
        return s.replace(/[\-{}\[\]+?.,\\\^$|#\s]/g, '\\$&');
    },

    onShow: function()
    {
        this.initializeDiva();
    },

    setGlobalFullScreen: function(isFullScreen)
    {
        if (isFullScreen)
        {
            GlobalEventHandler.trigger("divaFullScreen");
        }
        else
        {
            GlobalEventHandler.trigger("divaNotFullScreen");
            this.triggerMethod('recalculate:size');
        }
    },

    /**
     * Set the manuscript.
     *
     * @param siglum
     * @param initialFolio
     */
    _setManuscript: function(siglum, initialFolio)
    {
        this.siglum = String(siglum);
        if (initialFolio !== undefined)
        {
            this.initialFolio = String(initialFolio);
        }
    },

    /**
     * Calculate the page size and store the index and filename of the first
     * loaded page.
     */
    onViewerLoad: function()
    {
        this.triggerMethod('recalculate:size');
        this.trigger('loaded:viewer');

        // If there exists a client-defined initial folio
        if (this.initialFolio !== undefined)
        {
            this.setFolio(this.initialFolio);
        }
        // Store the initial folio
        //debugger;
        var number = this.divaInstance.getCurrentPageIndex();
        var name = this.divaInstance.getCurrentPageFilename();
        this.storeFolioIndex(number, name);
        // Store the image prefix for later
        this.setImagePrefixAndSuffix(name);
    },

    initializePageAliasing: function()
    {
        // Store the list of filenames
        this.divaFilenames = this.divaInstance.getFilenames();

        // Rebind the page input
        var input = this.$(this.divaInstance.getInstanceSelector() + 'goto-page');

        // Remove the original binding
        input.off('submit');

        // Add the replacement binding
        input.on('submit', this.gotoInputPage);

        // Rename the page label
        var pageLabel = this.toolbarParentObject.find('.diva-page-label')[0];

        // Replace "Page " with "Folio "
        pageLabel.firstChild.textContent = 'Folio ';

        // Add a closing parenthesis (the opening is within the page alias)
        pageLabel.appendChild(document.createTextNode(')'));

        // Hack: Make the go to page input a Bootstrap input group
        var inputGroup = $('<div class="input-group input-group-sm">');
        var inputGroupBtnContainer = $('<div class="input-group-btn">');

        this.toolbarParentObject.find('.diva-goto-form input[type=submit]')
            .addClass('btn btn-default')
            .appendTo(inputGroupBtnContainer);

        this.toolbarParentObject.find('.diva-goto-form .diva-input')
            .addClass('form-control')
            .replaceWith(inputGroup)
            .appendTo(inputGroup);

        inputGroup.append(inputGroupBtnContainer);
    },

    /**
     * Sets this.imagePrefix from any image name.
     *
     * @param imageName
     */
    setImagePrefixAndSuffix: function(imageName)
    {
        // Suffix is usually just ".jpeg" or whatever...
        this.imageSuffix = String(imageName).split('.')[1];
        // Prefix is trickier
        var splitFolioName = String(imageName).split('.')[0].split('_');

        // Assemble the parts into an image prefix
        var prefix = "";
        for (var i = 0; i < (splitFolioName.length - 1); i++)
        {
            prefix += splitFolioName[i];
        }

        this.imagePrefix = prefix;
    },

    /**
     * Set the diva viewer to load a specific folio...
     *
     * @param folioCode
     */
    setFolio: function(folioCode)
    {
        // We might need to set the prefix and suffix
        if (this.imagePrefix === null || this.imageSuffix === "")
        {
            this.setImagePrefixAndSuffix(this.currentFolioName);
        }

        var newImageName = this.imagePrefix + "_" + String(folioCode) + "." + this.imageSuffix;

        // Don't jump to the folio if we're already somewhere on it (this would just make Diva
        // jump to the top of the page)
        if (newImageName === this.currentFolioName)
            return;

        if (this.divaInstance)
        {
            this.divaInstance.gotoPageByName(newImageName);
        }
    },

    getFolio: function()
    {
        return this.imageNameToFolio(this.currentFolioName);
    },

    /**
     * Store a folio index and image filename.
     *
     * @param index int
     * @param fileName string
     */
    storeFolioIndex: function(index, fileName)
    {
        // The first time it's ever called
        if (this.initialFolio === undefined)
        {
            this.initialFolio = 0;
        }
        // Not the first time
        else if (index !== this.currentFolioIndex)
        {
            this.currentFolioIndex = index;
            this.currentFolioName = fileName;
            this.triggerFolioChange(this.imageNameToFolio(fileName));
        }
    },

    triggerFolioChange: _.debounce(function (folio)
    {
        manuscriptChannel.request('set:folio', folio, {replaceState: true});
    }, 250),

    /**
     * Draw boxes on the Diva viewer.  These usually correspond to
     * music notation on a manuscript page.
     * music notation on a manuscript page.
     *
     * @param boxSet [ {p,w,h,x,y}, ... ]
     */
    paintBoxes: function(boxSet)
    {
        if (!this.divaInstance)
            return;

        this.divaInstance.resetHighlights();

        // Grab the array of page filenames straight from Diva.
        var pageFilenameArray = this.divaInstance.getFilenames();

        // We might have to manually reset the page prefix
        if (this.imagePrefix === null)
        {
            this.setImagePrefixAndSuffix(pageFilenameArray[0]);
        }

        // Use the Diva highlight plugin to draw the boxes
        var highlightsByPageHash = {};
        var pageList = [];

        for (var i = 0; i < boxSet.length; i++)
        {
            // Translate folio to Diva page
            var folioCode = boxSet[i].p;
            var pageFilename = this.imagePrefix + "_" + folioCode + ".jp2";
            var pageIndex = pageFilenameArray.indexOf(pageFilename);

            if (highlightsByPageHash[pageIndex] === undefined)
            {
                // Add page to the hash
                highlightsByPageHash[pageIndex] = [];
                pageList.push(pageIndex);
            }
            // Page is in the hash, so we add to it.
            highlightsByPageHash[pageIndex].push
            ({
                'width': boxSet[i].w,
                'height': boxSet[i].h,
                'ulx': boxSet[i].x,
                'uly': boxSet[i].y
            });
        }
        // Now we need to add all of the pages to the Diva viewer
        for (var j = 0; j < pageList.length; j++)
        {
            this.divaInstance.highlightOnPage
            (
                pageList[j], // The page number
                highlightsByPageHash[pageList[j]] // List of boxes
            );
        }
    },

    /**
     * Zoom Diva to a location.
     *
     * @param box
     */
    zoomToLocation: function(box)
    {
        // Grab the diva internals to work with
        var divaData = this.divaInstance;

        // Do nothing if there's no box or if Diva is not initialized
        if (!box || !divaData)
            return;

        // Now figure out the page that box is on
        var divaOuter = divaData.getSettings().outerObject;
        var zoomLevel = divaData.getZoomLevel();

        // Grab the array of page filenames straight from Diva.
        var pageFilenameArray = divaData.getFilenames();
        var folioCode = box.p;
        var pageFilename = this.imagePrefix + "_" + folioCode + ".jp2";
        var desiredPage = pageFilenameArray.indexOf(pageFilename) + 1;

        // Now jump to that page
        divaData.gotoPageByNumber(desiredPage);
        // Get the height above top for that box
        var boxTop = divaData.translateFromMaxZoomLevel(box.y);
        var currentScrollTop = parseInt(divaOuter.scrollTop(), 10);

        var topMarginConsiderations = divaData.getSettings().averageHeights[zoomLevel] *
            divaData.getSettings().adaptivePadding;
        var leftMarginConsiderations = divaData.getSettings().averageWidths[zoomLevel] *
            divaData.getSettings().adaptivePadding;

        divaOuter.scrollTop(boxTop + currentScrollTop - (divaOuter.height() / 2) + (box.h / 2) +
            topMarginConsiderations);

        // Now get the horizontal scroll
        var boxLeft = divaData.translateFromMaxZoomLevel(box.x);
        divaOuter.scrollLeft(boxLeft - (divaOuter.width() / 2) + (box.w / 2) + leftMarginConsiderations);
        // Will include the padding between pages for best results
    },

    /*
     DivaView helpers
     */

    /**
     * Takes an image file name and returns the folio code.
     *
     * @param imageName Some image name, ex: "folio_001.jpg"
     * @returns string "001"
     */
    imageNameToFolio: function(imageName)
    {
        var splitFolioName = String(imageName).split('.')[0].split('_');
        return splitFolioName[splitFolioName.length - 1];
    }
});
});