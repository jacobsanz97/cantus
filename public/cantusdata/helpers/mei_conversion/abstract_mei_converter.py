import os
from abc import ABCMeta, abstractmethod

import pymei

DEFAULT_MIN_GRAM = 2
DEFAULT_MAX_GRAM = 10


class AbstractMEIConverter:
    __metaclass__ = ABCMeta

    TYPE = "cantusdata_music_notation"

    def __init__(self, file_name, siglum_slug, min_gram=DEFAULT_MIN_GRAM, max_gram=DEFAULT_MAX_GRAM):
        self.file_name = file_name
        self.siglum_slug = siglum_slug

        self.min_gram = min_gram
        self.max_gram = max_gram

        self.doc = pymei.documentFromFile(str(file_name), False).getMeiDocument()
        self.page_number = getPageNumber(file_name)

    @classmethod
    def convert(cls, directory, siglum_slug, min_gram=DEFAULT_MIN_GRAM, max_gram=DEFAULT_MAX_GRAM):
        # Generate list of files to process, preferring human-corrected MEI files
        meifiles = []
        for bd, dn, fn in os.walk(directory):
            if ".git" in bd:
                continue
            for f in fn:
                if f.startswith("."):
                    continue
                if ".mei" in f:
                    meifiles.append(os.path.join(bd, f))
                    print "Adding {0}".format(f)

        meifiles.sort()

        for file_name in meifiles:
            print '\nProcessing ' + str(file_name) + '...'

            inst = cls(file_name, siglum_slug, min_gram, max_gram)
            yield inst.process()

    @abstractmethod
    def process(self):
        raise NotImplementedError('process()')


def getPageNumber(ffile):
    """
    Extract the page number from the file name

    :param ffile:
    :return: page number as a string
    """
    return str(ffile).split('_')[-1].split('.')[0]
