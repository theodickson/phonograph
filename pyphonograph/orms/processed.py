import sys
import json

from sqlalchemy import Table, Column, String, Boolean, Integer, ForeignKey
from sqlalchemy.orm import relationship, backref
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.dialects import postgresql

from .utils import *

Base = declarative_base()

artist_track_map = Table('artist_track_map', Base.metadata,
    Column('artist', String, ForeignKey('artist.id'), index=True),
    Column('track', String, ForeignKey('track.id'), index=True)
)

class Artist(Base):
    __tablename__ = 'artist'
    id_ = Column('id', String, primary_key=True)
    name = Column(String, nullable=False)
    popularity = Column(Integer, nullable=True)
    followers = Column(Integer, nullable=True)
    _genre = Column(String, nullable=True)
    images = Column(postgresql.JSON, nullable=True)

    tracks = relationship('Track', secondary=artist_track_map, back_populates='artists')

    @property
    def uri(self):
        return "spotify:artist:{}".format(self.id_)
    

class Track(Base):
    __tablename__ = 'track'
    id_ = Column('id', String, primary_key=True)
    name = Column(String, nullable=False)
    popularity = Column(Integer, nullable=True)
    preview_url = Column(String, nullable=True)
    duration_ms = Column(Integer, nullable=False)
    release_year = Column(Integer, nullable=False)
    artists = relationship('Artist', secondary=artist_track_map, back_populates='tracks')


if __name__ == '__main__':

    engine = get_engine()

    if sys.argv[1] == 'recreate_all':
        Base.metadata.drop_all(engine)
        Base.metadata.create_all(engine)