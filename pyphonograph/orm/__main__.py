from . import *
from .. import utils

engine = get_engine()
test_engine = get_engine(db="test_db")

new_session = get_sessionmaker()
new_test_session = get_sessionmaker(db="test_db")

new_connection = get_connectionmaker()
new_test_connection = get_connectionmaker(db="test_db")

def create_all(engine=engine):
    Base.metadata.create_all(engine)
    with new_test_connection() as conn:
        for view_stmt in views:
            conn.execute(view_stmt)

def create_all_test():
    create_all(engine=test_engine)
    with new_test_session() as session:
        EntityRemovalInfo.populate(session)


parser = utils.TaskParser(description='Run spotify scraping tasks.')
parser.run(globals(), locals())

# if sys.argv[1] == 'recreate_all':
#     Base.metadata.drop_all(engine)
#     Base.metadata.create_all(engine)

# elif sys.argv[1] == 'create_all':
#     Base.metadata.create_all(engine)

