# -*- coding: utf-8
from __future__ import unicode_literals, print_function
import io
import re
import json
import sys
import xmltodict
import glob

tolist = lambda l: l if type(l) is list else [l]
for path in glob.glob('treebank-xml/*.xml'):
    print(path)
    contents = io.open(path).read()
    # Change tag of 'ellipsis' so order is preserved
    contents = re.sub('<text.*</text>', '', contents, flags=re.S)  # Speed up parse
    contents = contents.replace('<ellipsis', '<token ellipsis="true"')
    d = xmltodict.parse(contents)
    graphs = d['section']['graphs']['graph']

    for i,g in enumerate(graphs):
        if 'ref' in g['nodes']:
            l = tolist(g['nodes'].pop('ref'))
            g['nodes']['refs'] = [r['@id'] for r in l]

        l = tolist(g['nodes'].pop('token'))
        g['nodes']['tokens'] = [t['@id'] if '@id' in t else t['@morph'][4:] for t in l]

        if 'phrase' in g['nodes']:
            l = tolist(g['nodes'].pop('phrase'))
            g['nodes']['phrases'] = [[[int(p['@start']), int(p['@end'])], p['@tag']] for p in l]

        if 'edges' in g:  # INL has no edges
            l = (g['edges']['edge'] if type(g['edges']['edge']) is list else [g['edges']['edge']])
            g['edges'] = [[[int(e['@dep']), int(e['@head'])], e['@rel'].upper()] for e in l]

        graphs[i] = [g['nodes'], g['edges'] if 'edges' in g else []]

    out = json.dumps(graphs, ensure_ascii=False, separators=(',', ': '), indent=4, sort_keys=True)
    json_fh = io.open('data/' + d['section']['@id'] + '.json', 'w', encoding='utf-8')
    json_fh.write(unicode(re.sub('\n( {16,}| {12}(?=]))', '', out)))
