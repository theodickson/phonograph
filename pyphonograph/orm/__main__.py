import sys

from . import *

engine = get_engine()

if sys.argv[1] == 'recreate_all':
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)

elif sys.argv[1] == 'create_all':
    Base.metadata.create_all(engine)