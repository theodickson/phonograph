from flask import Flask, render_template, jsonify, url_for, request
from flask.ext.stormpath import StormpathManager, login_required
import pickle
import random
import igraph as ig
import sys
from redis import Redis
from os import environ
import itertools

def igrapher(vertices, **kwargs):
	g = ig.Graph(len(vertices))
	g.vs['name'] = vertices
	edges = []
	weights = []
	for pair in itertools.combinations(vertices, 2):
		r.zinterstore('pair', ['artist.tracks:'+pair[0], 'artist.tracks:'+pair[1]])
		weight = len(r.zrange('pair',0,-1))
		if weight > 0:
			edges.append(pair)
			weights.append(weight)
	g.add_edges(edges)
	g.es['weight'] = weights
	try:
		if kwargs['lc']:
			components = g.components()
			largest = max(enumerate(components), key = lambda x:len(x[1]))[1]
			g = g.subgraph(largest)
			return g
	except:
		return g
	
def d3_dictify(g, **kwargs):
	weights = []
	for w in g.es['weight']:
		if w <= 4:
			weights.append(w)
		else:
			weights.append(4)
	l = list(g.layout_fruchterman_reingold(repulserad = 2500, weights = weights))
	d3_dict = {'nodes':[], 'links':[]}
	for i,v in enumerate(g.vs()):
		info = r.hgetall('artist.info:'+v['name'])
		try:
			genre = info['genre']
		except:
			genre = None
		d3_dict['nodes'].append({'id': v['name'], 'name': info['name'], 'popularity': int(info['popularity'])+1, 'genre': genre, 'pos': l[i]})
	for e in g.es():
		try:
			if kwargs['mode'] == 'path':
				d3_dict['links'].append({'source': e.source, 'target': e.target, 'weight': e['weight'], 'track': e['track']})
		except:
			d3_dict['links'].append({'source': e.source, 'target': e.target, 'weight': e['weight']})
	return d3_dict	

def step(currentstep,neighbourhood):
	nextstep = {}
	for n,score in currentstep.items():
		for t in r.zrange('artist.tracks:'+n, 0, -1):
				for a in r.smembers('track.artists:'+t):
					try:
						nextstep[a] += score
					except:
						nextstep[a] = score
	return nextstep

def extend(distances, visited, c):
	distances[c+1] = {}
	for node in distances[c].keys():
		to_check = r.smembers('artist.neighbours:'+node) - visited
		for neighbour in to_check:
			distances[c+1].setdefault(neighbour, []).append(node)
	return distances

def pathfork(path, distances, c):
	forks = []
	for n in distances[c][path[-1]]:
		forks.append(path+[n])
	return forks
					
def find_paths(i,**kwargs):
	distances = {0: { i: []} }
	visited = set([])
	c = 0
	try:
		if kwargs['to']:
			j = kwargs['to']
			while j not in distances[c].keys():
				visited.update(distances[c].keys())
				distances = extend(distances, visited, c)
				c += 1
			paths = [[j,a] for a in distances[c][j]]
			c -= 1
			while c > 0:
				newpaths = []
				for path in paths:
					newpaths += pathfork(path, distances, c)
				paths = newpaths
				c -= 1	
			return paths
	except:
		while c < kwargs['level']:
			visited.update(distances[c].keys())
			distances = extend(distances, visited, c)
			c += 1
		return distances

def pop_sorted(nodes):
	return sorted(nodes, key = lambda x:r.hget('artist.info:'+x, 'popularity'), reverse=True)

def determine_paths(leaf,distances,c):
	c1 = c
	paths = [[leaf,a] for a in distances[c1][leaf]]
	c1 -= 1
	while c1 > 0:
		newpaths = []
		for path in paths:
			newpaths += pathfork(path, distances, c1)
		paths = newpaths
		c1 -= 1	
	return paths

def capitalise(phrase):
	capitalised = []
	for word in phrase.split(' '):
		capitalised.append(word[0].upper()+word[1:])
	return (' ').join(capitalised)
					
app = Flask(__name__)

app.config['SECRET_KEY'] = '1z2x3c4v'
#app.config['STORMPATH_API_KEY_FILE'] = 'apiKey.properties'
app.config['STORMPATH_API_KEY_ID'] = '3S78EIIR7QOHIP3ITREFDHH2Y' #CHANGE THIS
app.config['STORMPATH_API_KEY_SECRET'] = 'w8G+2O6bjyT5aO18oWP8n6bAS9vs3eRmMbVdvM2lS0M'
app.config['STORMPATH_APPLICATION'] = 'Phonograph'
app.config['STORMPATH_ENABLE_REGISTRATION'] = False
app.config['STORMPATH_ENABLE_FORGOT_PASSWORD'] = True
app.config['STORMPATH_LOGIN_TEMPLATE'] = 'login.html'
app.config['STORMPATH_FORGOT_PASSWORD_TEMPLATE'] = 'reset.html'
app.config['STORMPATH_FORGOT_PASSWORD_CHANGE_TEMPLATE'] = 'set.html'
stormpath_manager = StormpathManager(app)

r = Redis()

@app.route("/")
#@login_required
def index():
    return render_template("index.html")

@app.route("/start")
#@login_required
def start():
	return jsonify({'origin': random.choice(r.keys(pattern='artist.tracks*')).split(':')[1]})
		
@app.route("/path")
#@login_required
def path_finder():
	i = request.args['seed'].split(',')[0]
	j = request.args['seed'].split(',')[1]
	path = random.choice(find_paths(i,to=j))
	g = ig.Graph(len(path))
	g.vs['name'] = path
	edges = [(path[x],path[x+1]) for x in xrange(0,len(path)-1)]
	weights = []
	tracks = []
	for k,l in edges:
		r.zinterstore('tracks', ['artist.tracks:'+k, 'artist.tracks:'+l])
		edgetracks = r.zrevrange('tracks', 0, -1)
		tracks.append({'id': edgetracks[0], 'name': r.hget('track.info:'+edgetracks[0], 'name'), 'artists': [r.hget('artist.info:'+artist, 'name') for artist in list(r.smembers('track.artists:'+edgetracks[0]))]})
		weights.append(len(edgetracks))
	g.add_edges(edges)
	g.es['weight'] = weights
	g.es['track'] = tracks
	return jsonify(d3_dictify(g, mode='path'))
		
@app.route("/neighbourhood")
#@login_required
def get_neighbourhood():
	origin = request.args['seed'].split(',')[0]
	size = int(request.args['seed'].split(',')[1])
	#level = int(request.args['seed'].split(',')[2])
	currentstep = {origin:1}
	neighbourhood = set([origin])
	visited = set([origin])
	while len(neighbourhood) < size:
		currentstep = step(currentstep,neighbourhood)
		n = size - len(neighbourhood)
		to_consider = {k:v for k,v in currentstep.items() if k not in visited}
		print len(to_consider.keys())
		to_add = {k:v for k,v in sorted(to_consider.items(), key = lambda x:x[1], reverse=True)[0:n]}
		print len(to_add.keys())
		if len(to_add.keys()) == 0:
			break
		else:
			neighbourhood.update(to_add.keys())
			visited.update(currentstep.keys())
			currentstep = to_add
		print len(neighbourhood)
	vertices = list(neighbourhood)
	g = igrapher(vertices)
	
	return jsonify(d3_dictify(g))

@app.route("/zoom")
#@login_required
def zoom():
	seed = request.args['seed'].split(',')
	origin = seed[0]
	size = int(seed[1])
	level = int(seed[2])
	distances = find_paths(origin, level=level)
	chosen = set([origin])
	c = max(distances.keys())
	k = 1
	by_pop = pop_sorted(distances[c].keys())
	top_half = by_pop[0:len(by_pop)/2]
	bottom_half = by_pop[len(by_pop)/2:]
	ranked_leaves = random.sample(top_half, len(top_half))+bottom_half
	paths = {}
	while len(chosen) < size:
		for leaf in ranked_leaves:
			if leaf in paths.keys():
				chosen.update(paths[leaf][-1])
				if len(chosen) >= size:
					break
				paths[leaf].pop()
			else:
				paths[leaf] = determine_paths(leaf,distances,c)
				chosen.update(paths[leaf][-1])
				if len(chosen) >= size:
					break
				paths[leaf].pop()
		onpaths = []
		for v in paths.values():
			for p in v:
				for n in p:
					onpaths.append(n)
		if not onpaths:
			if c > 1:
				c -= 1
				#ranked_leaves = sorted(distances[c].keys(), reverse=True, key = lambda x:len(distances[c][x]))
				ranked_leaves = random.sample(distances[c].keys(), len(distances[c].keys()))
			else:
				distances = find_paths(origin, level=level+k)
				k += 1
				chosen = set([origin])
				c = max(distances.keys())
				#ranked_leaves = sorted(distances[c].keys(), reverse=True, key = lambda x:len(distances[c][x]))
				ranked_leaves = random.sample(distances[c].keys(), len(distances[c].keys()))
				paths = {}
	return jsonify(d3_dictify(igrapher(list(chosen))))
	
@app.route("/custom")
#@login_required
def custom_subgraph():
	size = request.args['seed'].split(',')[0]
	startIds = request.args['seed'].split(',')[1:]
	startPairs = itertools.combinations(startIds,2)
	all_paths = []
	skeleton = []
	paths_dict = {}
	for pair in startPairs:
		paths = find_paths(pair[0],to=pair[1])
		paths_dict[pair] = {'paths': paths, 'distance': len(paths[0])}
		skeleton+=paths[0]
		for path in paths:
			all_paths += path	
	all_paths = list(set(all_paths))
	skeleton = list(set(skeleton))
	max_count = max([len(pair['paths']) for pair in paths_dict.values()])
	sorted_pairs = sorted(paths_dict.keys(), key = lambda x:paths_dict[x]['distance'])
	counter = 1
	while len(skeleton) < size:
		print counter
		if counter > max_count:
			break
		for pair in sorted_pairs:
			if len(skeleton) >= size:
				break
			else:
				try:
					skeleton += paths_dict[pair]['paths'][counter]
				except:
					sorted_pairs.remove(pair)
		counter += 1
		skeleton = list(set(skeleton))

	g = ig.Graph(len(skeleton))
	g.vs['name'] = skeleton
	edges = []
	weights = []
	for pair in itertools.combinations(skeleton, 2):
		r.zinterstore('pair', ['artist.tracks:'+pair[0], 'artist.tracks:'+pair[1]])
		weight = len(r.zrange('pair',0,-1))
		if weight > 0:
			edges.append(pair)
			weights.append(weight)
	g.add_edges(edges)
	g.es['weight'] = weights
	return jsonify(d3_dictify(g))
	
@app.route("/edgeLookup")
#@login_required
def edge_lookup():
	ids = request.args['seed'].split(',')
	r.zinterstore(ids[0]+ids[1], ['artist.tracks:'+ids[0], 'artist.tracks:'+ids[1]])
	r.expire(ids[0]+ids[1], 1)
	trackIds = r.zrevrange(ids[0]+ids[1], 0, -1)
	trackInfo = [r.hgetall('track.info:'+t) for t in trackIds]
	print trackInfo
	trackNames = [t['name'] for t in trackInfo]
	artistIds = [r.smembers('track.artists:'+t) for t in trackIds]
	print artistIds
	artists = {}
	artistNames = []
	for t in artistIds:
		tnames = []
		for a in t:
			try:
				tnames.append(artists[a])
			except:
				name = r.hget('artist.info:'+a, 'name')
				if name != None:
					tnames.append(name)
					artists[a] = name
		artistNames.append(tnames)
	print trackNames
	print artistNames
	return jsonify({"trackIds": trackIds, "trackNames": trackNames, "artistNames": artistNames})

@app.route("/autocomplete")
def autocomplete():
	query = request.args['terms']
	#print query
	terms = [q.lower() for q in query.split(',')]
	#print terms
	r.zinterstore('artistsearch', terms)
	values = r.zrevrange('artistsearch', 0, 20)
	response = {'response': [{'value': value, 'label': r.hget('artist.info:'+value, 'name')} for value in values]}
	return jsonify(response)

@app.route("/genresearch")
def genre_search():
	query = request.args['terms']
	terms = ['term.matcher:'+q.lower() for q in query.split(',')]
	r.zinterstore('genresearch', terms)
	values = r.zrevrange('genresearch', 0, 20)
	response = {'response': [{'value': value, 'label': capitalise(value)} for value in values]}
	return jsonify(response)

@app.route("/genresubgraph")
def genre_subgraph():
	term = request.args['seed'].split(',')[0]
	size = int(request.args['seed'].split(',')[1])
	results = r.zrevrange('term.artists:'+term, 0, size*3)
	n = len(results) - size
	g = igrapher(results)
	deg = sorted(enumerate(g.degree()), key = lambda x:x[1])
	g.delete_vertices([x[0] for x in deg[0:n]])
	return jsonify(d3_dictify(g))
	
if __name__ == "__main__":
    app.run(debug=True)