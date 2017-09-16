import itertools

from tqdm import tqdm

from sqlalchemy.sql.expression import update,and_,any_

from ..orm.utils import get_new_session,get_new_connection
from ..orm import Artist,Album,Track
from ..orm.tables import *

from .funclib import detect_overlapping_artists


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

    def reset_removals(self, table, conn=None):
        self._reset_removals(artist_table, conn=conn)
        self._reset_removals(artist_group_table, conn=conn)
        self._reset_removals(album_table, conn=conn)
        self._reset_removals(track_table, conn=conn)

    def run(self):
        #need to make sure all codes are used
        self.index_artist_groups()

        self.remove_unpopular_artists()
        self.remove_invalid_artists()

        self.remove_unpopular_albums()
        self.remove_invalid_albums()
        self.remove_artist_removed_albums()

        self.remove_artist_removed_groups()
        self.remove_overlapping_groups()
        self.remove_artist_group_removed_albums()
        self.remove_artist_group_removed_tracks()
        self.remove_duplicate_albums_by_group()

        self.remove_unpopular_tracks()
        self.remove_invalid_tracks()
        self.remove_artist_removed_tracks()
        self.remove_album_removed_tracks()

        self.remove_duplicate_tracks_by_artist_group()

        self.remove_artist_removed_albums()
        self.remove_artist_removed_tracks()
        self.remove_album_removed_tracks()

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
    def index_artist_groups(self, conn=None):
        conn.execute(self.UPDATE_ARTIST_GROUPS)
        conn.execute(self.DELETE_ARTIST_GROUP_MAP)
        conn.execute(self.CREATE_ARTIST_GROUP_MAP)
        conn.execute(self.ADD_ARTIST_GROUPS_TO_ALBUMS)
        conn.execute(self.ADD_ARTIST_GROUPS_TO_TRACKS)

    @inject_session
    def remove_artist_removed_albums(self, session=None):
        self._remove_rel_removed(Album, 'artists', Artist, session=session)

    @inject_session
    def remove_artist_removed_groups(self, session=None):
        self._remove_rel_removed(Group, 'artists', Artist, session=session)

    @inject_session
    def remove_artist_removed_tracks(self, session=None):
        self._remove_rel_removed(Track, 'artists', Artist, session=session)

    @inject_session
    def remove_album_removed_tracks(self, session=None):
        self._remove_rel_removed(Track, 'album', Album, rel_type="m2o", reason=7, session=session)

    @inject_session
    def remove_artist_group_removed_tracks(self, session=None):
        self._remove_rel_removed(Track, 'group', Group, rel_type="m2o", reason=10, session=session)

    @inject_session
    def remove_artist_group_removed_albums(self, session=None):
        self._remove_rel_removed(Album, 'group', Group, rel_type="m2o", reason=10, session=session)

    @inject_session
    def remove_overlapping_groups(self, session=None):
        #TODO - periodic commits
        total = self._remaining_groups(session=session).count()
        for group in tqdm(self._remaining_groups(session=session), total=total):
            bad_artists = detect_overlapping_artists(group.artists)
            if bad_artists:
                group.removed = 6
                for artist in bad_artists:
                    artist.removed = 8


    @inject_session
    def remove_duplicate_albums_by_group(self, session=None):
        self._remove_exact_duplicates_by_group(self, lambda x:x.albums, session=session)

    @inject_session
    def remove_duplicate_tracks_by_group(self, session=None):
        self._remove_exact_duplicates_by_group(self, lambda x:x.tracks, session=session)

    def _remaining_artists(self, session=None):
        return session.query(Artist).filter(Artist.removed != 0)

    def _remaining_groups(self, session=None):
        return session.query(Group).filter(Group.removed != 0)

    def _remaining_albums(self, session=None):
        return session.query(Album).filter(Album.removed != 0)

    def _remaining_artists(self, session=None):
        return session.query(Track).filter(Track.removed != 0)

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


    @inject_connection
    def _reset_removals(self, table, conn=None):
        stmt = update(table).where(table.c.removed != 0).values(removed=0)
        conn.execute(stmt)


    def _remove_rel_removed(self, cls, attr, other_cls, rel_type, reason=5, session=None):
        if rel_type = "m2m":
            pred = getattr(cls, attr).any(other_class.removed != 0)
        elif rel_type = "m2o"
            pred = getattr(cls, attr).removed != 0
        else:
            raise ValueError

        session.query(cls)\
            .filter(
                and_(
                    cls.removed == 0,
                    pred
                )
            )\
            .update({cls.removed: 5}, synchronize_session='fetch')

    def _remove_exact_duplicates_by_group(self, getter, session=None):
        #TODO - periodic commits
        total = self._remaining_groups(session=session).count()
        for group in tqdm(self._remaining_groups(session=session), total=total):
            sorted_entities = sorted(getter(group), key=lambda x:x.name)
            for name,group in itertools.groupby(sorted_entities, lambda x:x.name):
                entities_by_popularity = sorted(group, lambda x:x.popularity, reverse=True)
                for entity in entities_by_popularity[1:]:
                    entity.removed = 3

    UPDATE_ARTIST_GROUPS = """
        INSERT INTO artist_group (
            SELECT DISTINCT id FROM (
                (SELECT array_to_string(array_agg(artist ORDER BY artist), '%%') AS id
                FROM artist_track_map
                GROUP BY track)
                UNION ALL
                (SELECT array_to_string(array_agg(artist ORDER BY artist), '%%') AS id
                FROM artist_album_map
                GROUP BY album)
            ) t
        ) ON CONFLICT DO NOTHING
        """

    DELETE_ARTIST_GROUP_MAP = "DELETE FROM artist_group_map"

    CREATE_ARTIST_GROUP_MAP = """
        INSERT INTO artist_group_map (
            SELECT DISTINCT unnest(string_to_array(id, '%%')) as artist, id as artist_group
            FROM artist_group
        )
        """

    #Note that track_group_map and album_group_map in the queries below are manually created view.
    ADD_ARTIST_GROUPS_TO_TRACKS = """
        UPDATE track AS t
        SET artist_group = m.artist_group
        FROM track_group_map as m
        WHERE t.id = m.track
        """
    ADD_ARTIST_GROUPS_TO_ALBUMS = """
        UPDATE album AS t
        SET artist_group = m.artist_group
        FROM album_group_map as m
        WHERE t.id = m.album
        """





        
