from django.test import TestCase
from cantusdata.models.folio import Folio
from cantusdata.models.chant import Chant
from cantusdata.models.manuscript import Manuscript


class FolioModelTestCase(TestCase):

    def setUp(self):
        # Generic folio
        manuscript = Manuscript.objects.create(siglum=u"ABC - 456")
        Folio.objects.create(number="123", manuscript=manuscript)

    def test_chant_count(self):
        manuscript = Manuscript.objects.get(siglum_slug="abc-456")
        # Get the folio
        folio = Folio.objects.get(number="123")
        # Folio has no chants yet
        self.assertEqual(folio.chant_count, 0)
        # We are going to give it a chant
        chant = Chant.objects.create(sequence=2, manuscript=manuscript,
                                     folio=folio)
        # After saving the chant, the folio should have 1 chant
        self.assertEqual(folio.chant_count, 1)
        # Now we want to try it again and see if we go to 2
        second_chant = Chant.objects.create(sequence=5, manuscript=manuscript,
                                            folio=folio)
        # After saving the chant, the folio should have 1 chant
        self.assertEqual(folio.chant_count, 2)
        # Now we test deletes
        chant.delete()
        self.assertEqual(folio.chant_count, 1)
        second_chant.delete()
        self.assertEqual(folio.chant_count, 0)
