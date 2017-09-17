from . import *
from .. import utils

scraper = SpotifyScraper()
test_scraper = SpotifyScraper(db="test_db")

parser = utils.TaskParser(description='Run spotify scraping tasks.')
parser.run(globals(), locals())