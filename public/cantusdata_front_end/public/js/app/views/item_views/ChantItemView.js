define( ['App', 'backbone', 'marionette', 'jquery',
        "models/Folio",
        "views/CantusAbstractView",
        "views/ChantCollectionView",
        "singletons/GlobalEventHandler",
        "config/GlobalVars"],
function(App, Backbone, Marionette, $,
         Folio,
         CantusAbstractView,
         ChantCollectionView,
         GlobalEventHandler,
         GlobalVars,
         template) {

"use strict";

/**
 * A chant.
 */
return Marionette.ItemView.extend
({
    template: "#chant-item-template",

    open: false,

    /**
     * Generate the containing div's tag name
     *
     * @returns {string}
     */
    tagName: function() {
        // "item_id" is what solr calls the standard django id
        var output =  'div id="chant-' + parseInt(this.model.get("sequence"), 10) + '" class="panel panel-default';
        if (this.open) {
            // Append "in" if open
            output += " in ";
        }
        return output + '"';
    }
});
});