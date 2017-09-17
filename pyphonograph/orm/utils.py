import configparser
import os
from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


class SessionManager(object):

    def __init__(self, Session):
        self._Session = Session

    @contextmanager
    def __call__(self, *args, **kwargs):
        session = self._Session(*args, **kwargs)
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

    def unmanaged(self, *args, **kwargs):
        return self._Session(*args, **kwargs)


class ConnectionManager(object):

    def __init__(self, engine):
        self._engine = engine

    @contextmanager
    def __call__(self, *args, **kwargs):
        conn = self._engine.connect(*args, **kwargs)
        try:
            yield conn
        finally:
            conn.close()

    def unmanaged(self, *args, **kwargs):
        return self._engine(*args, **kwargs)


def get_config():
    conf = configparser.ConfigParser()
    conf_path = os.path.join(os.path.dirname(__file__), 'config.ini')
    conf.read(conf_path)
    return conf

def get_engine(db="main_db"):
    conf = get_config()
    engine_str = 'postgresql+psycopg2://{user}:{password}@/{dbname}'.format(**conf[db])
    return create_engine(engine_str)

def get_sessionmaker(db="main_db"):
    engine = get_engine(db=db)
    Session = sessionmaker(bind=engine)
    return SessionManager(Session)

def get_connectionmaker(db="main_db"):
    engine = get_engine(db=db)
    return ConnectionManager(engine)