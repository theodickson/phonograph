import argparse
import cProfile, pstats, io

class MargumentParser(object):

    def __init__(self, **kwargs):
        self.parser = argparse.ArgumentParser(**kwargs)
        self.mapargs = []
        self.listargs = []

    def add_argument(self, *args, **kwargs):
        if kwargs.get('maparg'):
            self.mapargs.append(args[-1].split('--')[-1])
            del kwargs['maparg']

        if kwargs.get('listarg'):
            self.listargs.append(args[-1].split('--')[-1])
            del kwargs['listarg']

        self.parser.add_argument(*args, **kwargs)

    def parse_args(self, args=None, namespace=None):
        args = self.parser.parse_args(args, namespace)
        for maparg in self.mapargs:
            map_string = getattr(args, maparg)
            map_ = self.mapify(map_string)
            setattr(args, maparg, map_)
        for listarg in self.listargs:
            list_string = getattr(args, listarg)
            list_ = self.listify(list_string)
            setattr(args, listarg, list_)
        return args

    def mapify(self, map_string):
        _map = {}
        if map_string:
            for x in map_string.split(';'):
                key = self.caster(x.split(':')[0])
                value = self.listify(x.split(':')[1])
                if len(value) == 1:
                    value = value[0]
                _map[key] = value
        return _map

    def listify(self, list_string):
        if list_string:
            return [self.caster(x) for x in list_string.split(',')]
        else:
            return []

    def caster(self, string):
        cast_map = {('(',')'): 'int', ('{','}'): 'float'}
        if string in ('None', 'True', 'False'):
            return eval(string)
        for k,v in cast_map.items():
            if string.startswith(k[0]) and string.endswith(k[1]):
                value_string = string[1:-1]
                return eval('%s(%s)' % (v,value_string))
        return string

class TaskParser(MargumentParser):
    """A special MargumentParser for use in tasks.py modules.

    Usually a task name should be provided (i.e. the name of callable object in the tasks.py local namespace).
    The task will be called with any provided args or kwargs (a listarg and maparg, respectively.)

    Alternatively, arbitrary code can be provided, in order to create tasks on-the-fly.
    The code will be exec'd with respect to the provided global and local namespaces. These should be the results of calls to globals() and locals() in the tasks.py module.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        group = self.parser.add_mutually_exclusive_group(required=True)
        group.add_argument('-t', '--task')
        group.add_argument('-c', '--code')
        self.add_argument('-a', '--args', listarg=True)
        self.add_argument('-k', '--kwargs', maparg=True)
        self.add_argument('-p', '--profile', action='store_true')
        
    def run(self, globals_, locals_):
        args = self.parse_args()
        if args.profile:
            self._run_with_profiling(args, globals_, locals_)
        else:
            self._run(args, globals_, locals_)

    def _run(self, args, globals_, locals_):
        if args.task:
            locals_[args.task](*args.args, **args.kwargs)
        else:
            exec(args.code, globals_, locals_)

    def _run_with_profiling(self, args, globals_, locals_):
        pr = cProfile.Profile()
        pr.enable()
        try:
            self._run(args, globals_, locals_)
        except KeyboardInterrupt:
            pass
        pr.disable()
        s = io.StringIO()
        sortby = 'cumulative'
        ps = pstats.Stats(pr, stream=s).sort_stats(sortby)
        ps.print_stats()
        print(s.getvalue())