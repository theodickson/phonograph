import configparser
import os
from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

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

def get_sessionmaker():
    engine = get_engine()
    Session = sessionmaker(bind=engine)
    return Session

def get_new_session():
    Session = get_sessionmaker()
    return SessionContextMaker(Session)