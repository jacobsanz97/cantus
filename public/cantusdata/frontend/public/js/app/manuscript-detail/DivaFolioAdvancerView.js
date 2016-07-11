import Marionette from 'marionette';
import $ from 'jquery';

import template from './diva-folio-advancer.template.html';

/**
 * A widget with buttons that controls
 */
export default Marionette.ItemView.extend({
    template,

    ui:
    {
        nextButton: ".next-folio",
        previousButton: ".previous-folio"
    },

    events:
    {
        "click @ui.nextButton": "nextButtonCallbackHandler",
        "click @ui.previousButton": "previousButtonCallbackHandler"
    },

    /**
     * Get the stored Diva data.
     *
     * @returns {*|jQuery}
     */
    getDivaData: function()
    {
        return $("#diva-wrapper").data('diva');
    },

    /**
     * Increase the page by 1, or 2 if in 'Book' view.
     */
    nextButtonCallbackHandler: function(event)
    {
        // Don't follow the a href to "#"
        event.preventDefault();

        this.changeDivaPage(
            function(index, divaData)
            {
                var inBookView = divaData.getState().v === 'b';
                return index + (inBookView ? 2 : 1);
            }
        );
    },

    /**
     * Decrease the page by 1, or 2 if in 'Book' view.
     */
    previousButtonCallbackHandler: function(event)
    {
        // Don't follow the a href to "#"
        event.preventDefault();

        this.changeDivaPage(
            function(index, divaData)
            {
                var inBookView = divaData.getState().v === 'b';
                return index - (inBookView ? 2 : 1);
            }
        );
    },

    /**
     *  Change the Diva page index.  numberChangeFunction is a function that
     *  takes the current page index and returns the desired new page index.
     *
     * @param numberChangeFunction fn : int -> int
     */
    changeDivaPage: function(numberChangeFunction)
    {
        // Get DivaData and the curent page count
        var divaData = this.getDivaData(),
            currentPageIndex = divaData.getCurrentPageIndex();
        // Tell Diva to go to the page specified by numberChangeFunction()
        divaData.gotoPageByIndex(numberChangeFunction(currentPageIndex, divaData));
    }
});
