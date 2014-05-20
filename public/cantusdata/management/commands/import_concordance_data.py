from django.core.management.base import BaseCommand
from cantusdata.models import Concordance


class Command(BaseCommand):
    args = ""
    debug = True

    def handle(self, *args, **kwargs):
        """
        Run "python manage.py import_concordance_data filename" to import
        a concordance list file into the db.

        filename must exist in /public/data_dumps/.
        """
        if args:
            file_name = str(args[0])
        else:
            return self.stdout.write("Please provide a file name!")
        try:
            file = open("data_dumps/" + file_name)
        except IOError:
            return self.stdout.write(u"File {0} does not exist!".format(file_name))
        if self.debug:
            self.stdout.write("Deleting all old concordance data...")
            # Nuke the db concordances
            Concordance.objects.all().delete()
            self.stdout.write("Old concordance data deleted.")
        # Every line is a new concordance
        self.stdout.write("Starting concordance import process.")
        for index, line in enumerate(file.readlines()):
            # This method is pretty hacky, but it seems to work
            concordance = Concordance()

            concordance.letter_code = line.split(" ", 1)[0].strip()
            line = line.split(" ", 1)[1]

            concordance.institution_city = line.split(",", 1)[0].strip()
            line = line.split(",", 1)[1]

            concordance.institution_name = line.split(",", 1)[0].strip()
            line = line.split(",", 1)[1]

            concordance.sections = line.split(" (", 1)[0].strip()
            line = line.split(" (", 1)[1]

            concordance.date = line.split(", from", 1)[0].strip()
            line = line.split(", from", 1)[1]

            concordance.location = line.split(")", 1)[0].strip()
            line = line.split(")", 1)[1]

            line = line.split(": ", 1)[1]

            concordance.rism_code = line.split("]", 1)[0].strip()

            concordance.save()
        self.stdout.write(u"Successfully imported {0} concordances into database.".format(index))