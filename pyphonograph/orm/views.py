track_group_map = """
    CREATE VIEW track_group_map AS (
        SELECT track, array_to_string(array_agg(artist ORDER BY artist), '%%') AS artist_group
        FROM artist_track_map
        GROUP BY track
    )
    """


album_group_map = """
    CREATE VIEW album_group_map AS (
        SELECT album, array_to_string(array_agg(artist ORDER BY artist), '%%') AS artist_group
        FROM artist_album_map
        GROUP BY album
    )
    """

views = [track_group_map, album_group_map]
