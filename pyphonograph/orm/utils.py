import configparser
import os
from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

class SessionContextMaker(object):

    def __init__(self, sessionmaker):
        self._sessionmaker = sessionmaker

    @contextmanager
    def __call__(self, *args, **kwargs):
        session = self._sessionmaker(*args, **kwargs)
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


class ConnectionContextMaker(object):

    def __init__(self, engine):
        self._engine = engine

    @contextmanager
    def __call__(self, *args, **kwargs):
        conn = self._engine.connect(*args, **kwargs)
        try:
            yield conn
        finally:
            conn.close()


def get_config():
    conf = configparser.ConfigParser()
    conf_path = os.path.join(os.path.dirname(__file__), 'config.ini')
    conf.read(conf_path)
    return conf

def get_engine():
    conf = get_config()
    engine_str = 'postgresql+psycopg2://{user}:{password}@/{dbname}'.format(**conf['database'])
    return create_engine(engine_str)

def get_sessionmaker():
    engine = get_engine()
    Session = sessionmaker(bind=engine)
    return Session

def get_new_session():
    Session = get_sessionmaker()
    return SessionContextMaker(Session)

def get_new_connection():
    engine = get_engine()
    return ConnectionContextMaker(engine)