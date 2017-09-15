from . import *
from .. import utils

scraper = SpotifyScraper()

parser = utils.TaskParser(description='Run spotify scraping tasks.')
parser.run(globals(), locals())