import $ from "jquery";
import Marionette from "marionette";
import afterTransition from "utils/afterTransition";

import template from './sidenav.template.html';

var SIDENAV_TRANSITION_MS = 300;
var BACKDROP_TRANSITION_MS = 150;

/**
 * Render a sidenav element
 *
 * Options:
 *  - content: a view or function returning a view to
 *    render when the sidenav is first shown
 *
 * Methods:
 *  - toggle
 *  - show
 *  - hide
 */
export default Marionette.LayoutView.extend({
    template,

    regions: {
        content: '.sidenav'
    },

    ui: {
        sidenav: '.sidenav'
    },

    initialize()
    {
        this._isExpanded = this._backdrop = null;
    },

    onRender()
    {
        this._isExpanded = this.ui.sidenav.hasClass('in');
    },

    onDestroy()
    {
        if (this._backdrop)
            this._removeBackdrop();
    },

    _removeBackdrop()
    {
        this._backdrop.remove();
        this._backdrop = null;
    },

    /** Toggle the side nav open or closed */
    toggle()
    {
        if (!this._isExpanded)
            this.show();
        else
            this.hide();
    },

    /** Expand the side nav */
    show()
    {
        if (this._isExpanded)
            return;

        this._renderContent();

        this.triggerMethod('sidenav:show');

        this._isExpanded = true;

        if (!this._backdrop)
        {
            this._backdrop = $('<div class="sidenav-backdrop fade">');
            this._backdrop.on('click', () => this.hide());
        }

        this._backdrop.appendTo(document.body);
        this.ui.sidenav.addClass('sliding');

        // Force a reflow
        // The logic here follows Bootstrap's very closely
        this._backdrop[0].offsetWidth;

        this._backdrop.addClass('in');
        this.ui.sidenav.addClass('in');
        this.ui.sidenav.removeClass('sliding');
    },

    _renderContent()
    {
        if (!this.content.currentView)
        {
            let contentView = this.getOption('content');

            if (typeof contentView === 'function')
                contentView = contentView();

            if (contentView)
                this.content.show(contentView);
        }
    },

    /** Collapse the side nav */
    hide()
    {
        if (!this._isExpanded)
            return;

        this.triggerMethod('sidenav:hide');

        this._isExpanded = false;

        this.ui.sidenav.addClass('sliding');

        this.ui.sidenav.removeClass('in');
        afterTransition(this._backdrop, SIDENAV_TRANSITION_MS, function ()
        {
            this.ui.sidenav.removeClass('sliding');
        }, this);

        this._backdrop.removeClass('in');
        afterTransition(this._backdrop, BACKDROP_TRANSITION_MS, () => this._removeBackdrop());
    }
});
