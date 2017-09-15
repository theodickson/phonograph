import sys
import json

from sqlalchemy import Table, Column, String, Boolean, Integer, SmallInteger, ForeignKey
from sqlalchemy.orm import relationship, backref
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.dialects import postgresql

from .utils import *
from .base import Base

artist_track_map = Table('artist_track_map', Base.metadata,
    Column('artist', String, ForeignKey('artist.id'), index=True),
    Column('track', String, ForeignKey('track.id'), index=True)
)

artist_album_map = Table('artist_album_map', Base.metadata,
    Column('artist', String, ForeignKey('artist.id'), index=True),
    Column('album', String, ForeignKey('album.id'), index=True)
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

    removed = Column(SmallInteger, ForeignKey('entity_removal_info.id'), default=0, index=True)

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

    removed = Column(SmallInteger, ForeignKey('entity_removal_info.id'), default=0, index=True)

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
    album_id = Column(String, ForeignKey('album.id'), index=True)
    name = Column(String, nullable=False)
    popularity = Column(Integer, nullable=True)
    preview_url = Column(String, nullable=True)
    duration_ms = Column(Integer, nullable=False)
    external_ids = Column(postgresql.JSON, nullable=True)
    external_urls = Column(postgresql.JSON, nullable=False)
    checked = Column(Boolean, default=False, nullable=False)

    artists = relationship('Artist', secondary=artist_track_map, back_populates='tracks')
    album = relationship('Album', back_populates='tracks')

    removed = Column(SmallInteger, ForeignKey('entity_removal_info.id'), default=0, index=True)

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


class EntityRemovalInfo(Base):
    __tablename__ = 'entity_removal_info'
    id_ = Column('id', SmallInteger, primary_key=True)
    info = Column('info', String, nullable=False)

    @classmethod
    def populate(cls, session):
        data = [
            (0, 'not_removed'),
            (1, 'unpopular'),
            (2, 'invalid_name'),
            (3, 'duplicate'),
            (4, 'too_many_artists'),
            (5, 'artist_removed'),
            (6, 'invalid_artist_group'),
            (7, 'album_removed'),
            (8, 'multi_artist'),
            (9, 'compilation'),
        ]
        for id_,info in data:
            obj = cls(id_=id_, info=info)
            session.merge(obj)
        session.commit()