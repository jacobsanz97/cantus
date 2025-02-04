from django.conf import settings

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import APIException

from cantusdata.helpers import search_utils
import solr
import json
import types
from operator import itemgetter


class NotationException(APIException):
    status_code = 400
    default_detail = 'Notation search request invalid'


class SearchNotationView(APIView):
    """
    Search algorithm adapted from the Liber Usualis code
    """

    def get(self, request, *args, **kwargs):

        q = request.GET.get('q', None)
        stype = request.GET.get('type', None)
        manuscript = request.GET.get('manuscript', None)
        rows = request.GET.get("rows", "100")
        start = request.GET.get("start", "0")

        # Give a 400 if there's a notation exception, and let
        # anything else give a 500
        results = self.do_query(manuscript, stype, q)

        return Response({'numFound': len(results), 'results': results})

    def do_query(self, manuscript, qtype, query):
        # This will be appended to the search query so that we only get
        # data from the manuscript that we want!
        manuscript_query = ' AND siglum_slug:\"{0}\"'.format(manuscript)

        solrconn = solr.SolrConnection(settings.SOLR_SERVER)

        # Normalize case and whitespace
        query = ' '.join(elem for elem in query.lower().split())

        if qtype == "neumes":
            query_stmt = 'neumes:{0}'.format(
                # query
                query.replace(' ', '_')
            )
        elif qtype == "pnames" or qtype == "pnames-invariant":
            if not search_utils.valid_pitch_sequence(query):
                raise NotationException("The query you provided is not a valid pitch sequence")
            real_query = query if qtype == 'pnames' else ' OR '.join(search_utils.get_transpositions(query))
            query_stmt = 'pnames:({0})'.format(real_query)
        elif qtype == "contour":
            query_stmt = 'contour:{0}'.format(query)
        elif qtype == "text":
            query_stmt = 'text:{0}'.format(query)
        elif qtype == "intervals":
            query_stmt = 'intervals:{0}'.format(query.replace(' ', '_'))
        elif qtype == "incipit":
            query_stmt = "incipit:{0}*".format(query)
        else:
            raise NotationException("Invalid query type provided")

        if qtype == "pnames-invariant":
            print query_stmt + manuscript_query
            response = solrconn.query(query_stmt + manuscript_query,
                                      score=False, sort="folio asc", q_op="OR",
                                      rows=1000000)
        else:
            print query_stmt + manuscript_query
            response = solrconn.query(query_stmt + manuscript_query,
                                      score=False, sort="folio asc",
                                      rows=1000000)

        results = []

        # get only the longest ngram in the results, for results which are associated with
        # a pitch sequence
        if qtype == "neumes":
            if manuscript == "ch-sgs-390":
                pass
            else:
                notegrams_num = search_utils.get_neumes_length(query)
                response = [r for r in response if not r.get('pnames') or len(r['pnames']) == notegrams_num]

        box_sort_key = itemgetter('p', 'y')

        for d in response:
            image_uri = d['image_uri']
            folio = d['folio']
            locations = json.loads(d['location'].replace("'", '"'))

            if isinstance(locations, types.DictType):
                box_w = locations['width']
                box_h = locations['height']
                box_x = locations['ulx']
                box_y = locations['uly']
                boxes = [{'p': image_uri, 'f': folio, 'w': box_w, 'h': box_h, 'x': box_x, 'y': box_y}]
            else:
                boxes = []

                for location in locations:
                    box_w = location['width']
                    box_h = location['height']
                    box_x = location['ulx']
                    box_y = location['uly']
                    boxes.append({'p': image_uri, 'f': folio, 'w': box_w, 'h': box_h, 'x': box_x, 'y': box_y})

                boxes.sort(key=box_sort_key)

            results.append({
                'boxes': boxes,
                'contour': get_value(d, 'contour', list),
                'intervals': get_value(d, 'intervals', lambda i: i.split('_')),
                'neumes': get_value(d, 'neumes', lambda i: i.split('_')),
                'pnames': get_value(d, 'pnames', list),
                'semitones': get_value(d, 'semitones', lambda tones: [int(s) for s in tones.split('_')])
            })

        results.sort(key=lambda result: [box_sort_key(box) for box in result['boxes']])

        return results

def get_value(d, key, transform):
    try:
        value = d[key]
    except KeyError:
        return None

    return transform(value)