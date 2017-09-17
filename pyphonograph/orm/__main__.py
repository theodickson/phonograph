from . import *
from .. import utils

engine = get_engine()

new_session = get_sessionmaker()
new_test_session = get_sessionmaker(db="test_db")





parser = utils.TaskParser(description='Run spotify scraping tasks.')
parser.run(globals(), locals())
# if sys.argv[1] == 'recreate_all':
#     Base.metadata.drop_all(engine)
#     Base.metadata.create_all(engine)

# elif sys.argv[1] == 'create_all':
#     Base.metadata.create_all(engine)

