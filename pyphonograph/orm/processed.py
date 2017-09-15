import sys
import json

from sqlalchemy import Table, Column, String, Boolean, Integer, ForeignKey
from sqlalchemy.orm import relationship, backref
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.dialects import postgresql

from .utils import *
from .base import Base

processed_artist_track_map = Table('processed_artist_track_map', Base.metadata,
    Column('processed_artist', String, ForeignKey('processed_artist.id'), index=True),
    Column('processed_track', String, ForeignKey('processed_track.id'), index=True)
)

class ProcessedArtist(Base):
    __tablename__ = 'processed_artist'
    id_ = Column('id', String, primary_key=True)
    name = Column(String, nullable=False)
    popularity = Column(Integer, nullable=True)
    followers = Column(Integer, nullable=True)
    _genre = Column(String, nullable=True)
    images = Column(postgresql.JSON, nullable=True)

    tracks = relationship('ProcessedTrack', secondary=processed_artist_track_map, back_populates='artists')

    @property
    def uri(self):
        return "spotify:artist:{}".format(self.id_)
    

class ProcessedTrack(Base):
    __tablename__ = 'processed_track'
    id_ = Column('id', String, primary_key=True)
    name = Column(String, nullable=False)
    popularity = Column(Integer, nullable=True)
    preview_url = Column(String, nullable=True)
    duration_ms = Column(Integer, nullable=False)
    release_year = Column(Integer, nullable=False)
    artists = relationship('ProcessedArtist', secondary=processed_artist_track_map, back_populates='tracks')
