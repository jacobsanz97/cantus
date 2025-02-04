from django.shortcuts import render
from django.conf import settings
import markdown
import os.path
import re
import codecs

def homepage(request):
        """The view of the homepage, generated from a Markdown file.

        The content is taken from a Markdown file, which is always located at `home.md` of the `cantus-staticpages` repository.
        """
        markdown_file = '../cantus-staticpages/content/home.md'
        markdown_fullpath = os.path.join(settings.BASE_DIR, markdown_file)
        content = codecs.open(markdown_fullpath, encoding='utf-8').read()
        content_as_html = markdown.markdown(content)
        context = {'content': content_as_html}
        return render(request, 'staticpages/homepage.html', context)

def general(request, static_page):
        """The view of a generic static page generated from a Markdown file.

        The first line of the markdown is considered the title.
        The rest of the markdown is considered the content.

        Parameters
        ----------
        static_page : str
            Name of the markdown file where the content is to be found, which is extracted from the url of the staticpage in `urls.py`
        """
        formatstr = '../cantus-staticpages/content/{}.md'
        markdown_file = formatstr.format(static_page)
        mrkdwn_fullpath = os.path.join(settings.BASE_DIR, markdown_file)
        titlecont = codecs.open(mrkdwn_fullpath, encoding='utf-8').readlines()
        title_line = titlecont[0]
        content = '\n'.join(titlecont[1:])
        title = re.match(r"^#([A-Za-z0-9 _-]+)$", title_line).group(1)
        content_as_html = markdown.markdown(content)
        context = {'title': title, 'content': content_as_html}
        return render(request, 'staticpages/general.html', context)