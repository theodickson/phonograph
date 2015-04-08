from os.path import expanduser
from stormpath.client import Client
import sys
import random,string

client = Client(api_key_file_location=expanduser('apiKey.properties'))

application = client.applications.search('Phonograph')[0]

for email in sys.argv[1:]:
	password = ''.join([random.choice(string.ascii_letters + string.digits) for n in xrange(32)])
	application.accounts.create({
		'given_name': 'Not set',
		'surname': 'Not set',
		'email': email,
		'password': password
	})
	