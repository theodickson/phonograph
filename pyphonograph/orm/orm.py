import sys
import os
from contextlib import contextmanager

import json

from sqlalchemy import Table, Column, String, Boolean, Integer, ForeignKey
from sqlalchemy import create_engine
from sqlalchemy.orm import relationship, backref, sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.dialects import postgresql

import configparser

Base = declarative_base()

artist_track_map = Table('artist_track_map', Base.metadata,
    Column('artist', String, ForeignKey('artist.id')),
    Column('track', String, ForeignKey('track.id'))
)

artist_album_map = Table('artist_album_map', Base.metadata,
    Column('artist', String, ForeignKey('artist.id')),
    Column('album', String, ForeignKey('album.id'))
)


class Artist(Base):
    __tablename__ = 'artist'
    id_ = Column('id', String, primary_key=True)
    name = Column(String, nullable=False)
    popularity = Column(Integer, nullable=True)
    followers = Column(Integer, nullable=True)
    genres = Column(postgresql.ARRAY(String), nullable=True)
    external_urls = Column(postgresql.JSON, nullable=False)
    images = Column(postgresql.JSON, nullable=True)
    checked = Column(Boolean, default=False, nullable=False)
    scraped = Column(Boolean, default=False, nullable=False)

    albums = relationship('Album', secondary=artist_album_map, back_populates='artists')
    tracks = relationship('Track', secondary=artist_track_map, back_populates='artists')
    #images = relationship('Image', back_populates='artist')

    @property
    def uri(self):
        return "spotify:artist:{}".format(self.id_)

    @classmethod
    def from_json(cls, blob):
        return cls(
            id_=blob['id'],
            name=blob['name'],
            popularity=blob['popularity'],
            followers=blob['followers']['total'],
            genres=blob['genres'],
            external_urls=json.dumps(blob['external_urls']),
            images=json.dumps(blob['images']),
            checked=True
        )

    @classmethod
    def from_json_simplified(cls, blob):
        return cls(
            id_=blob['id'],
            name=blob['name'],
            external_urls=json.dumps(blob['external_urls'])
        )
    

class Album(Base):
    __tablename__ = 'album'
    id_ = Column('id', String, primary_key=True)
    name = Column(String, nullable=False)
    album_type = Column(String, nullable=False)
    popularity = Column(Integer, nullable=True)
    release_date = Column(String, nullable=True)
    release_date_precision = Column(String, nullable=True)
    available_markets = Column(postgresql.ARRAY(String), nullable=False)
    genres = Column(postgresql.ARRAY(String), nullable=True)
    external_ids = Column(postgresql.JSON, nullable=True)
    external_urls = Column(postgresql.JSON, nullable=False)
    copyrights = Column(postgresql.JSON, nullable=True)
    images = Column(postgresql.JSON, nullable=False)
    checked = Column(Boolean, default=False, nullable=False)

    artists = relationship('Artist', secondary=artist_album_map, back_populates='albums')
    tracks = relationship('Track', back_populates='album')
    #images = relationship('Image', back_populates='album')

    @property
    def uri(self):
        return "spotify:album:{}".format(self.id_)

    @classmethod
    def from_json(cls, blob):
        id_ = blob['id']
        artists = [Artist.from_json_simplified(x) for x in blob['artists']]
        tracks = [Track.from_json_simplified(x, id_) for x in blob['tracks']['items'] if len(x['artists']) > 1]

        return cls(
            id_=id_,
            name=blob['name'],
            album_type=blob['album_type'],
            popularity=blob['popularity'],
            release_date=blob['release_date'],
            release_date_precision=blob['release_date_precision'],
            available_markets=blob['available_markets'],
            genres=blob['genres'],
            external_urls=json.dumps(blob['external_urls']),
            external_ids=json.dumps(blob['external_ids']),
            copyrights=json.dumps(blob['copyrights']),
            images=json.dumps(blob['images']),
            checked=True,
            artists=artists,
            tracks=tracks
        )

    @classmethod
    def from_json_simplified(cls, blob):
        artists = [Artist.from_json_simplified(x) for x in blob['artists']]
        #images = [Image.from_json(x) for x in blob['images']]

        return cls(
            id_=blob['id'],
            name=blob['name'],
            album_type=blob['album_type'],
            available_markets=blob['available_markets'],
            external_urls=json.dumps(blob['external_urls']),
            images=json.dumps(blob['images']),
            artists=artists,
        )

class Track(Base):
    __tablename__ = 'track'
    id_ = Column('id', String, primary_key=True)
    album_id = Column(String, ForeignKey('album.id'))
    name = Column(String, nullable=False)
    popularity = Column(Integer, nullable=True)
    preview_url = Column(String, nullable=True)
    duration_ms = Column(Integer, nullable=False)
    external_ids = Column(postgresql.JSON, nullable=True)
    external_urls = Column(postgresql.JSON, nullable=False)
    checked = Column(Boolean, default=False, nullable=False)

    artists = relationship('Artist', secondary=artist_track_map, back_populates='tracks')
    album = relationship('Album', back_populates='tracks')

    @property
    def uri(self):
        return "spotify:track:{}".format(self.id_)

    @classmethod
    def from_json_simplified(cls, blob, album_id):
        artists = [Artist.from_json_simplified(x) for x in blob['artists']]
        return cls(
            id_=blob['id'],
            album_id=album_id,
            name=blob['name'],
            preview_url=blob['preview_url'],
            duration_ms=blob['duration_ms'],
            external_urls=json.dumps(blob['external_urls']),
            artists=artists
        )

    @classmethod
    def from_json(cls, blob, album_id):
        artists = [Artist.from_json_simplified(x) for x in blob['artists']]
        return cls(
            id_=blob['id'],
            album_id=album_id,
            name=blob['name'],
            popularity=blob['popularity'],
            preview_url=blob['preview_url'],
            duration_ms=blob['duration_ms'],
            external_ids=json.dumps(blob['external_ids']),
            external_urls=json.dumps(blob['external_urls']),
            checked=True,
            artists=artists
        )


# class Image(Base):
#     __tablename__ = 'image'
#     url = Column(String, primary_key=True)
#     height = Column(Integer, nullable=True)
#     width = Column(Integer, nullable=True)
#     artist_id = Column(String, ForeignKey('artist.id'))
#     album_id = Column(String, ForeignKey('album.id'))
#     artist = relationship('Artist', back_populates='images')
#     album = relationship('Album', back_populates='images')

#     @classmethod
#     def from_json(cls, blob, artist_id=None, album_id=None):
#         return cls(
#             url=blob['url'],
#             height=blob['height'],
#             width,
#             preview_url=blob['preview_url'],
#             duration_ms=blob['duration_ms'],
#             external_urls=json.dumps(blob['external_urls'])
#         )


class SessionContextMaker(object):

    def __init__(self, sessionmaker):
        self._sessionmaker = sessionmaker

    @contextmanager
    def __call__(self):
        session = self._sessionmaker()
        try:
            yield session
            session.commit()
        except KeyboardInterrupt:
            session.commit()
        except:
            session.rollback()
            raise
        finally:
            session.close()

def get_config():
    conf = configparser.ConfigParser()
    conf_path = os.path.join(os.path.dirname(__file__), 'config.ini')
    conf.read(conf_path)
    return conf

def get_engine():
    conf = get_config()
    engine_str = 'postgresql+psycopg2://{user}:{password}@/{dbname}'.format(**conf['database'])
    return create_engine(engine_str)

def get_session():
    engine = get_engine()
    Session = sessionmaker(bind=engine)
    return Session

def get_new_session():
    Session = get_session()
    return SessionContextMaker(Session)

if __name__ == '__main__':

    engine = get_engine()

    if sys.argv[1] == 'recreate_all':
        Base.metadata.drop_all(engine)
        Base.metadata.create_all(engine)

        

# engine_str = 'postgresql+psycopg2://{user}:{password}@/{dbname}'.format(**conf['database'])
# engine = create_engine(engine_str)
# Base.metadata.create_all(engine)
# Session = sessionmaker(bind=engine)
# new_session = SessionContextMaker(Session)