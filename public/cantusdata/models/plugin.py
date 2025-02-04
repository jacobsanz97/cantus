from django.db import models
from django.utils.text import slugify


class Plugin(models.Model):
    """
    Plugins describe added functionality that may be attached to a Manuscript.
    Plugins
    """
    name = models.CharField(max_length=255, blank=False, null=False)

    @property
    def slug(self):
        return slugify(u"{0}".format(self.name))

    def __unicode__(self):
        return u"{0}".format(self.name)
