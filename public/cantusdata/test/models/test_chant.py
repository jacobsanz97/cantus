import solr

from django.conf import settings
from django.test import TransactionTestCase

from cantusdata.models.chant import Chant
from cantusdata.models.manuscript import Manuscript
from cantusdata.models.folio import Folio


class ChantModelTestCase(TransactionTestCase):
    fixtures = ['2_initial_data.json']

    def setUp(self):
        self.manuscript = Manuscript.objects.get(name="MyName")
        self.folio = Folio.objects.get(number="123")
        self.chant = Chant.objects.get(cantus_id="1234")

    def test_unicode(self):
        chant = Chant.objects.get(cantus_id="1234")
        self.assertEqual(chant.__unicode__(), u"1234 - 5678")

    def test_solr_update(self):
        self.chant.sequence = 59

        solrconn = solr.SolrConnection(settings.SOLR_SERVER)
        prior_resp = self.chant.fetch_solr_records(solrconn)

        self.assertEqual(prior_resp.numFound, 1)
        self.assertNotEqual(prior_resp.results[0]['sequence'], 59)

        self.chant.save()

        post_resp = self.chant.fetch_solr_records(solrconn)

        self.assertEqual(post_resp.numFound, 1)
        self.assertEqual(post_resp.results[0]['sequence'], 59)

    def test_solr_deletion(self):
        pk = self.chant.pk

        solrconn = solr.SolrConnection(settings.SOLR_SERVER)
        self.chant.delete_from_solr(solrconn)

        solrconn.commit()

        indexed = solrconn.query('type:cantusdata_chant AND item_id:{}'.format(pk))
        self.assertEqual(indexed.numFound, 0)
