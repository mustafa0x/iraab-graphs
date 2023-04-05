# -*- coding: utf-8
from __future__ import unicode_literals
import io
import re
import json

morph = {}
for row in io.open('../quran-morphology/quranic-corpus-morphology-0.4-ar.txt'):  # quran-morphology.txt
    w = row[:-1].split('\t')
    k = ':'.join(w[0].split(':')[:-1])
    if w[3].startswith('PREFIX'): w[1] = '-' + w[1]
    elif w[3].startswith('SUFFIX'): w[1] = '+' + w[1]
    elif k in morph and not morph[k][-1][0].startswith(('-', '+')): w[1] = '+' + w[1]
    morph.setdefault(k, []).append(w[1:3])

out = json.dumps(morph, ensure_ascii=False, separators=(',', ': '), indent=4, sort_keys=True)
json_fh = io.open('morph1.json', 'w', encoding='utf-8')
json_fh.write(unicode(re.sub('\n( {12,}| {8}(?=]))', ' ', out)))
