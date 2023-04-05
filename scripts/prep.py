# -*- coding: utf-8
from __future__ import unicode_literals, print_function
import io
import re
import json
import sys

morph = json.load(io.open('morph.json'))
terms = json.load(io.open('../quran-morphology/morphology-terms-ar.json'))
terms['types'].update(terms['particles'])
terms['types'].update(terms['attrs'])
surah = json.load(io.open('data-pre/' + sys.argv[1] + '.json'))

items = []
apref = sys.argv[1] + ':'
cur_ayah = ''
last_ayah = ''
for g in surah:
    item = []
    nodes, edges = g
    det = ''

    for ref in (nodes['refs'] if 'refs' in nodes else []):
        w_morph = morph[apref + ref]
        for i, part in enumerate(w_morph):
            if part[1] != 'DET':
                item.append([part[0] + '|' + ref, part[1]])

    for t in nodes['tokens']:
        if ':' in t:
            cur_ayah = t.split(':')[0]
            w_morph = morph[apref + t]
            for i, part in enumerate(w_morph):
                if part[1] == 'DET':
                    w_morph[i + 1][0] = part[0][1:] + w_morph[i + 1][0]
                else:
                    item.append([part[0], part[1]])
        else:  # Ellipses
            if ' ' in t:  # PRON
                part = terms['pronoun_forms'][t[t.index(' ') + 1:]]
                t = t[:t.index(' ')]
            else:
                part = terms['types'][t]
            item.append(['(%s)' % part, t])

    if 'phrases' in nodes:
        item += nodes['phrases']

    # item = [i for i in item if i[1] not in ['DET', 'ATT', 'DIST', 'ADDR']]
    for e in edges:
        if e[0][0] - 1 >= len(item):
            print('too long', cur_ayah, e[0])
            e[0][0] = len(item) - 1
        item[e[0][0] - 1] += [e[0][1], e[1]]

    for i,p in enumerate(item):
        continue
        if p[1] not in ['DET', 'ATT', 'DIST', 'ADDR']:
            continue
        for p in item[i+1:]:
            if len(p) > 2 and p[2] > (i + 1):
                p[2] += 1
            #elif type(p[0]) is list:
            #    p[0][0] += 1
            #    p[0][1] += 1

    # Combine graphs of the same ayah
    if cur_ayah == last_ayah:
        items[-1].append(item)
    else:
        items.append([item])
    ayah_nums = [t.split(':')[0] for t in nodes['tokens'] if ':' in t]
    last_ayah = ayah_nums[0]

    # Add empty item for each additional ayah current item contains
    for i in range(1, len(set(ayah_nums))):
        items.append([])

for i, item in enumerate(items):
    if len(item) == 1:
        items[i] = item[0]  # Unnest

out = json.dumps(items, ensure_ascii=False, separators=(',', ': '), indent=4, sort_keys=True)
out = re.sub(r'\[\n {12}(\[ \d)', r'[ \1', re.sub(r'\n( {12,}(?!\[=)|(?<!=\]\n) {8,}(?=]))', ' ', re.sub(r'\n( {16,}| {12}(?=]))', '=', out)).replace('=', ' '))
io.open('data/%s.json' % sys.argv[1], 'w', encoding='utf-8').write(unicode(out))
