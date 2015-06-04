from django.db import models
from cantusdata.models.chant import Chant
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver


class Folio(models.Model):
    """
    A folio is a manuscript page.
    A manuscript has many folios.  A folio has many chants.
    """
    class Meta:
        app_label = "cantusdata"
        ordering = ['number']

    number = models.CharField(max_length=50, blank=True, null=True)
    manuscript = models.ForeignKey("Manuscript")
    chant_count = models.IntegerField(default=0)

    def add_to_solr(self, solrconn):
        """
        Add a Solr entry for this folio

        Return true if an entry was added
        """
        import uuid

        d = {
            'type': 'cantusdata_folio',
            'id': str(uuid.uuid4()),
            'number': self.number,
            'item_id': self.id,
            'manuscript_id': self.manuscript.id,
        }

        solrconn.add(**d)
        return True

    def delete_from_solr(self, solrconn):
        """
        Delete the Solr entry for this folio if it exists

        Return true if there was an entry
        """
        record = solrconn.query("type:cantusdata_folio item_id:{0}"
                                .format(self.id), q_op="AND")

        if record:
            solrconn.delete(record.results[0]['id'])
            return True

        return False

    def update_chant_count(self):
        self.chant_count = Chant.objects.filter(folio=self).count()
        self.save()

    def __unicode__(self):
        return u"{0} - {1}".format(self.number, self.manuscript)


@receiver(post_delete, sender=Chant)
def pre_chant_delete(sender, instance, **kwargs):
    auto_count_chants(instance)


@receiver(post_save, sender=Chant)
def post_chant_delete(sender, instance, **kwargs):
    auto_count_chants(instance)


def auto_count_chants(chant):
    """
    Compute the number of chants on the chant's folio
    """
    if chant.folio:
        chant.folio.update_chant_count()


@receiver(post_save, sender=Folio)
def solr_index(sender, instance, created, **kwargs):
    from django.conf import settings
    import solr

    solrconn = solr.SolrConnection(settings.SOLR_SERVER)

    instance.delete_from_solr(solrconn)
    instance.add_to_solr(solrconn)

    solrconn.commit()


@receiver(post_delete, sender=Folio)
def solr_delete(sender, instance, **kwargs):
    from django.conf import settings
    import solr

    solrconn = solr.SolrConnection(settings.SOLR_SERVER)

    if instance.delete_from_solr(solrconn):
        solrconn.commit()
