from . import *
from .. import utils

cleaner = DataCleaner()
test_cleaner = DataCleaner(db="test_db")

parser = utils.TaskParser(description='Run data cleaning tasks.')
parser.run(globals(), locals())