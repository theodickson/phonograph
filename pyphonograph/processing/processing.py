
from sqlalchemy.sql.expression import update,and_,any_

from ..orm.utils import get_new_session,get_new_connection
from ..orm import Artist,Album,Track
from ..orm.tables import *

from tqdm import tqdm

def inject_connection(method):

  def inner(self, *args, **kwargs):
    if kwargs.get('conn'):
      method(self, *args, **kwargs)
    else:
      with self._new_connection() as conn:
        method(self, *args, conn=conn, **kwargs)

  return inner

def inject_session(method):
  #sort out where this function should live
  def inner(self, *args, **kwargs):
    if kwargs.get('session'):
      method(self, *args, **kwargs)
    else:
      with self._new_session() as session:
        method(self, *args, session=session, **kwargs)

  return inner
  

class DataCleaner(object):
    
    def __init__(self):
        self._new_connection = get_new_connection()
        self._new_session = get_new_session()

    # def _remaining_artists(self, session=None):
    #     return session.query(Artist).filter(Artist.removed != 0)

    # def _remaining_albums(self, session=None):
    #     return session.query(Album).filter(Album.removed != 0)

    # def _remaining_artists(self, session=None):
    #     return session.query(Track).filter(Track.removed != 0)

    @inject_connection
    def _remove_unpopular(self, table, conn=None, threshold=1):
        #filter to just those which have not already been removed and whose popularity is
        #below the threshold
        #set the value of removed to 1 which indicates "unpopular"
        stmt = update(table)\
            .where(
                and_(
                    table.c.removed == 0,
                    table.c.popularity < threshold
                )
            )\
            .values(removed=1)
        conn.execute(stmt)

    def remove_unpopular_artists(self, conn=None, threshold=1):
        self._remove_unpopular(artist_table, conn=conn, threshold=threshold)

    def remove_unpopular_albums(self, conn=None, threshold=1):
        self._remove_unpopular(album_table, conn=conn, threshold=threshold)

    def remove_unpopular_tracks(self, conn=None, threshold=1):
        self._remove_unpopular(track_table, conn=conn, threshold=threshold)

    def remove_invalid_artists(self):
        pass

    def remove_invalid_albums(self):
        pass

    def remove_invalid_tracks(self):
        pass

    @inject_connection
    def _reset_removals(self, table, conn=None):
        stmt = update(table).where(table.c.removed != 0).values(removed=0)
        conn.execute(stmt)

    def reset_removals(self, table, conn=None):
        self._reset_removals(artist_table, conn=conn)
        self._reset_removals(album_table, conn=conn)
        self._reset_removals(track_table, conn=conn)

    @inject_session
    def remove_artist_removed_albums(self, session=None):
        session.query(Album)\
            .filter(
                and_(
                    Album.removed == 0,
                    Album.artists.any(Artist.removed != 0)
                )
            )\
            .update({Album.removed: 5}, synchronize_session='fetch')

    @inject_session
    def remove_artist_removed_tracks(self, session=None):
        artist_removed_tracks = session.query(Track)\
            .filter(
                and_(
                    Track.removed == 0,
                    Track.artists.any(Artist.removed != 0)
                )
            ).update({Track.removed: 5}, synchronize_session='fetch')

    @inject_session
    def remove_album_removed_tracks(self, session=None):
        album_removed_tracks = session.query(Track)\
            .filter(
                and_(
                    Track.removed == 0,
                    Track.albums.any(Album.removed != 0)
                )
            ).update({Track.removed: 5}, synchronize_session='fetch')







        
