#import sys
import logging

from tqdm import tqdm

from . import *
from .. import utils

engine = get_engine()
new_session = get_new_session()

logging.basicConfig()
# logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)

def add_missing_groups():
    with new_session(autoflush=False) as session:
        tracks = session.query(Track).filter(Track.group == None).limit(100)
        c = 0
        for track in tqdm(tracks):
            group = Group.from_artists(track.artists, add_artists=False)
            assert group not in session
            track.artists[0].groups.append(group)
            assert group not in session
            #assert group not in session
            #session.merge(group)
            #group.artists = track.artists
            #assert group not in session
            #c += 1
            #session.merge(group)
            #group.artists = track.artists
            #if c % 1000 == 0:
                #session.commit()

        # albums = session.query(Album).filter(Album.group == None).limit(100)
        # c = 0
        # for album in tqdm(albums):
        #     group = Group.from_artists(album.artists)
        #     #album.group = group
        #     c +=1
            # if c % 1000 == 0:
            #     session.commit()



parser = utils.TaskParser(description='Run spotify scraping tasks.')
parser.run(globals(), locals())
# if sys.argv[1] == 'recreate_all':
#     Base.metadata.drop_all(engine)
#     Base.metadata.create_all(engine)

# elif sys.argv[1] == 'create_all':
#     Base.metadata.create_all(engine)

