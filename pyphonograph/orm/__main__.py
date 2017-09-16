#import sys
import logging

from tqdm import tqdm

from . import *
from .. import utils

engine = get_engine()
new_session = get_new_session()
new_connection = get_new_connection()

logging.basicConfig()
# logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)

# def add_missing_groups_core():
#     #1. first we need to add all artist groups to the database 
#     with new_connection() as conn:
        
# def add_missing_groups():
#     #. 
#     with new_session(autoflush=False) as session:
#         tracks = session.query(Track).filter(Track.group == None).limit(100)
#         c = 0
#         for track in tqdm(tracks):
#             group = Group.from_artists(track.artists, add_artists=True)
#             session.merge(group)
#             new_track = Track(id_=track.id_, album_id=track.album_id, name=track.name, group_id=group.id_, duration_ms=track.duration_ms, external_urls=track.external_urls)
#             session.merge(new_track

            #adding the artists to the group is adding the group to the session (therefore new groups are being added not merged)
            #need to either figure out cascades (being careful not to break the way crawling adds everything)
            #or find a way to add the artists to the group without triggering this behaviour
            #the key may be that the normal way doesn't add 'live' artists to the group

            #this was true, I can create the group from new copies of the artists (from_artists2) and merge the whole thing
            #however I now have the same problem with the track. and the same fix doesnt work. there's something much deeper here
            #i'm not understanding...

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

