define(["backbone"], function (Backbone)
{
    return Backbone.Model.extend({
        defaults: {
            field: 'all',
            query: '',
            sortBy: 'folio',
            reverseSort: false
        }
    });
});