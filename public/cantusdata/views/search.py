from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.renderers import JSONRenderer, JSONPRenderer

from cantusdata.serializers.search import SearchSerializer
from cantusdata.renderers.custom_html_renderer import CustomHTMLRenderer

from cantusdata.helpers.solrsearch import SolrSearch


class SearchViewHTMLRenderer(CustomHTMLRenderer):
    template_name = "require.html"


class SearchView(APIView):
    serializer_class = SearchSerializer
    renderer_classes = (JSONRenderer, JSONPRenderer, SearchViewHTMLRenderer)

    def get(self, request, *args, **kwargs):
        querydict = request.GET

        s = SolrSearch(request)

        if not querydict:
            return Response({'query': '', 'numFound': 0, 'results': []})

        # Search for fifteen rows by default
        s.solr_params.setdefault('rows', 15)

        search_results = s.search()

        result = {
            'query': querydict['q'],
            'numFound': search_results.numFound,
            'results': search_results
        }

        result.update(s.solr_params)

        response = Response(result)
        return response
