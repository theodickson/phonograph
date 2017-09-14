from . import *
from .. import utils

scraper = SpotifyScraper()

if __name__ == '__main__':
    parser = utils.TaskParser(description='Run spotify scraping tasks.')
    parser.run(globals(), locals())