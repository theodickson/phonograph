import spotipy
from spotipy.oauth2 import SpotifyClientCredentials

from tqdm import tqdm

from pyphonograph.orms.spotify_raw import Artist,Album,Track,get_new_session

def chunker(iterable, chunk_size):
  output = []
  while iterable:
    output.append(iterable[:chunk_size])
    iterable = iterable[chunk_size:]
  return output

class SpotifyScraper(object):

  def __init__(self):
    #configure Spotify Web API connection
    self._client_credentials_manager = SpotifyClientCredentials()
    self._sp = spotipy.Spotify(client_credentials_manager = self._client_credentials_manager)
    #configure postgresql connection via SQLAlchemy:
    self._new_session = get_new_session()
  
  def store_first_100k_artists(self, limit=None):
    """Store the first 100k artists in the all artists search.
    We can only yield the first 100k as the API doesn't let you use an offset of greater than 100000.
    Luckily it seems there is a bias towards popularity in the ordering.
    """
    with self._new_session() as session:
      c = 0
      initial_query = self._sp.search(q="year:0000-9999", type="artist", limit=50)
      for artist_blob in tqdm(self._generate_all(initial_query, 'artists'), total=limit if limit else 100050):
        session.merge(Artist.from_json(artist_blob))
        c += 1
        if c % 1000 == 0:
          session.commit()
        if c == limit:
          break

  def artist_albums(self, artist, session):
    initial_query= self._sp.artist_albums(artist.id_, limit=50)
    return tqdm(self._generate_all(initial_query, 'albums'))

  def scrape_artist(self, artist, session):
    #Note that no commit occurs in this routine, thus an artist will have scraped=True if and only if all albums have been scraped.
    for album_blob in self.artist_albums(artist, session):
      session.merge(Album.from_json_simplified(album_blob))
    artist.scraped = True

  def check_albums(self, albums, session, pbar=None):
    for album_blob in self._sp.albums([album.id_ for album in albums])['albums']:
      session.merge(Album.from_json(album_blob))
      pbar.update(1)

  def check_artists(self, artists, session, pbar=None):
    for artist_blob in self._sp.artists([artist.id_ for artist in artists])['artists']:
      session.merge(Artist.from_json(artist_blob))
      pbar.update(1)

  def check_tracks(self, tracks, session, pbar=None):
    for track_blob in self._sp.tracks([track.id_ for track in tracks])['tracks']:
      session.merge(Track.from_json(track_blob))
      pbar.update(1)

  def check_all_unchecked_artists(self, session):
    c = 0
    artists = session.query(Artist).filter(Artist.checked==False).all()
    print("Found {} unchecked artists. Starting check...".format(len(artists)))
    with tqdm(total=len(artists)) as pbar:
      for chunk in chunker(artists, 50):
        self.check_artists(chunk, session, pbar=pbar)
        c += len(chunk)
        if c % 1000 == 0:
          session.commit()
    session.commit()
    return c

  def check_all_unchecked_tracks(self, session):
    c = 0
    tracks = session.query(Track).filter(Track.checked==False).all()
    print("Found {} unchecked tracks. Starting check...".format(len(tracks)))
    with tqdm(total=len(tracks)) as pbar:
      for chunk in chunker(tracks, 50):
        self.check_tracks(chunk, session, pbar=pbar)
        c += len(chunk)
        if c % 1000 == 0:
          session.commit()
    session.commit()
    return c

  def unscraped_artists(self, session, limit=None, order_by=None):
    return session.query(Artist) \
      .filter(Artist.scraped==False) \
      .order_by(order_by) \
      .limit(limit)

  def crawl(self, n=100):
    with self._new_session() as session:
      unscraped_artists = self.unscraped_artists(session, limit=None).count()
      print("Initial unscraped artists: {}".format(unscraped_artists))
      print("Starting crawl...\n")
      while unscraped_artists:
        print("Checking all unchecked artists (so we can scrape artists' albums in descending order of popularity)...\n")
        self.check_all_unchecked_artists(session)
        print("Getting top {} artists by popularity which remain unscraped...\n".format(n))
        artists_to_scrape = self.unscraped_artists(session, limit=n, order_by=Artist.popularity.desc()).all()
        max_popularity = artists_to_scrape[0].popularity
        print("Max unscraped popularity on this iteration: {}. Starting album scrape...\n".format(max_popularity))
        for artist in tqdm(artists_to_scrape):
          self.scrape_artist(artist, session)
        session.commit()
        albums_to_check = session.query(Album).filter(Album.checked==False).all()
        print("Album scrape complete. There are now {} unchecked albums. Checking albums...\n".format(len(albums_to_check)))
        with tqdm(total=len(albums_to_check)) as pbar:
          c = 0
          for chunk in chunker(albums_to_check, 20):
            self.check_albums(chunk, session, pbar=pbar)
            c += 20
            if c % 1000 == 0:
              session.commit()
        print("Done checking albums. Returning to artist check...")
        session.commit()

  def _generate_all(self, initial_query, result_type=None):
    current = initial_query.get(result_type, initial_query)
    for item in current['items']:
        yield item
    while current['next'] is not None:
        current_raw = self._sp.next(current)
        current = current_raw.get(result_type, current_raw)
        for item in current['items']:
            yield item

  def check_one_artist(self):
    with self._new_session() as session:
      artist = session.query(Artist).first()
      self.check_artist(artist, session)

  def delete_all_artists(self):
    with self._new_session() as session:
      session.query(Artist).delete()