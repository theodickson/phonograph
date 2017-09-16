from fuzzywuzzy import fuzz

splitters = [' & ', ', ', ' and ', ' ft ', ' feat ', ' vs ', ' featuring ', ' with ', ' + ']
standardise_splitters = ['.', "'", '"', '-', 'symphony', 'orchestra', 'ensemble', 'choir', 'his'] + splitters

def standardise(name):
    name = name.lower()
    for s in standardise_splitters:
        name = name.replace(s, '')
    return name

def detect_overlapping_artists(artists):
    #return the set of redundant artists

    std_names = {artist: standardise(artist.name) for artist in artists}

    #first map all artists their list of 'split names'
    split_names = {}
    for artist,std_name in std_names.items():
        for s in splitters:
            name = name.replace(s, '§')
        split_name = name.split('§')
        if len(split_name) > 1:
            split_names[artist] = split_name

    bad_artists = set()
    #then for each artists whose name has been split, test if any of the components
    #match another artists name in the group
    for artist,split_name in split_names.items():
        for component in split_name:
            if any(fuzz.ratio(component,othername) > 95 for std_name in std_names.values()):
                bad_artists.add(artist)

    return bad_artists