// Helpers
const round = i => +i.toFixed(2)
const lvl_height = lvl => round(10 + Math.pow(lvl, 1.8) * 10)
function within(e1, e2) {
    let c = (a, b) => a - b, e1s = e1.slice().sort(c), e2s = e2.slice().sort(c)
    return JSON.stringify(e1s) !== JSON.stringify(e2s) && e2s[0] >= e1s[0] && e2s[1] <= e1s[1]
}

function prep_data(data) {
    let word_i = 0
    data = data.map((d, i) => {
        if (!(i && data[i-1][0][0] === '-') && d[0][0] !== '+' && !Array.isArray(d[0]))
            word_i++
        return {i: i + 1, word_i: word_i, word: d[0], tag: d[1], parent: d[2], edge_lbl: d[3], type: get_type(d[0])}
    })

    set_lvls(data.filter(d => d.parent || d.type === 'phrase'))
    console.log(data)
    add_pres_sufs(data)
    prep_refs(data)
    return data
}
/*
 * Sort words/phrases by length ASC.
 * Words: level = 1 + highest edge & phrase within its edge. Verify phrases aren't over self.
 * Phrases: level = 1 +
 */
function set_lvls(data) {
    const vals = x => x.type === 'phrase' ? x.word : [x.i, x.parent]
    const calc = x => Math.abs(vals(x).reduce((a, b) => a - b))
    const max_lvl = (ar, f) => Math.max(0, ...ar.filter(f).map(e => e.level))
    const cmpr = (a, b) => calc(a) - calc(b)
    data.slice().sort(cmpr).forEach(e1 => {
        e1.level = 1 + max_lvl(data, e2 => within(vals(e1), vals(e2)))
    })
    console.log(data.map(x => x.level + '-' + x.i))
}
function get_type(w) {
    return Array.isArray(w) ? 'phrase' :
            /^\(?\-/.test(w) ? 'pre' :
            /^\(?\+/.test(w) ? 'suf' :
            w.indexOf('|') > 0 ? 'ref' :
            'word'
}
function add_pres_sufs(data) {
    const words = data.filter(d => !Array.isArray(d.word))
    const re3 = /ٰ(&zwj;)/g
    const re4 = /(&zwj;)ٰ/g
    const tpl = (cls, text) => `<tspan class="word ${cls}">${text}</tspan>`
    const add_zwjs = t => {
        let re = /([ئبت-خس-غف-نهي])(<[^>]+>)([آ-ي])/g, repl = '$1&zwj;$2&zwj;$3'
        return t.replace(re, repl).replace(re, repl)
    }
    let cur_w

    // Add prefixes
    words.slice().reverse().forEach(d => {
        if (d.word[0] !== '-') {
            if (d.word[0] !== '+')
                cur_w = d
            return
        }
        cur_w.html = tpl(d.tag, d.word.slice(1)) + (cur_w.html || cur_w.word)
    })
    // Add suffixes
    words.forEach(d => {
        if (d.word[0] !== '+') {
            if (d.word[0] !== '-')
                cur_w = d
            return
        }
        let pron_cls = d.tag === 'PRON' && /SUBJ|SecondObject/.test(d.edge_lbl) ? d.edge_lbl : ''
        cur_w.html = (cur_w.html || cur_w.word) + tpl(d.tag + ' ' + pron_cls, d.word.slice(1))
    })
    // Add joiners
    words.filter(d => d.html).forEach(d => d.html = add_zwjs(d.html).replace(re3, 'ـٰ$1').replace(re4, '$1ـٰ'))
}
function prep_refs(data) {
    // Simply remove the ayah ref
    data.filter(d => !Array.isArray(d.word) && d.word.indexOf('|') > 0).forEach(d => {
        let k = d.html ? 'html' : 'word'
        d[k] = `(${d[k].replace(/\|[\d:]+/g, '')})`
    })
}
function position_p(d, graphW, graphH, data) {
    d.p_top = graphH - (30 * (d.level + 1))
    d.p_left = graphW - (wordW * (data[d.word[0]-1].word_i-1))
    d.p_right = graphW - (wordW * (data[d.word[1]-1].word_i-1))
    d.p_mid = (d.p_right + d.p_left) / 2
}
function position_edge(d, graphW, graphH, data) {
    const parent = data[d.parent-1]
    const isPhrase = d.type === 'phrase'
    const pre_suf = d.word_i === parent.word_i && !isPhrase
    const pre_suf_d = pre_suf && d.type === 'word' ? parent : d
    const is_pre = pre_suf && pre_suf_d.type === 'pre'
    const is_suf = pre_suf && pre_suf_d.type === 'suf'
    const p_parent = Array.isArray(parent.word)

    d.bottom = graphH - 2.2 * wordH
    if (isPhrase) {
        d.top = d.p_top - 40
        if (Math.abs(data[d.word[d.parent < d.word[0] ? 0 : 1]-1].word_i - parent.word_i) > 1) {
            // d.top -= 50 // todo
            console.log(d, 'large')
        }
        d.left = graphW - (wordW * ((data[d.word[0]-1].word_i-1 + data[d.word[1]-1].word_i-1) / 2))
        d.right = graphW - (wordW * (parent.word_i-1))
        if (p_parent) {
            d.bottom = parent.p_top - 25
            d.right = parent.p_mid
        }
        d.arrow = (d.top - 12) + ((d.bottom - (d.top - 12)) * 0.25)
    }
    else {
        d.top = round(d.bottom - lvl_height(d.level) - 15)
        d.top += is_pre || is_suf ? 15 : 0
        d.left = graphW - (d.word_i - 1 + (is_suf ? 0.18 : 0)) * wordW
        d.right = graphW - (parent.word_i - 1 - (is_pre ? 0.18 : 0)) * wordW
        if (p_parent) {
            d.bottom = parent.p_top - 25
            d.right = parent.p_mid
        }
        d.arrow = d.top + ((d.bottom - d.top) * 0.25)
    }
    d.mid = (d.right + d.left) / 2
    d.diff = (d.right - d.left) / 2.5
    // ? d.top + 15 : d.bottom
    // M${d.left},${My} C${d.mid-d.diff},${d.top} ${d.mid+d.diff},${d.top} ${d.right},${d.bottom}
}

let wordW = 80, wordH = 20

function drawGraph(svgEl, data) {
    data = prep_data(data)

    const svg = d3.select(svgEl)
    const graphW = wordW * (data[data.length -1].word_i - 1)
    const linked = data.filter(d => d.parent)
    const linked_words = linked.filter(d => !Array.isArray(d.word))
    const phrases = data.filter(d => Array.isArray(d.word))
    const factor = 1.7
    const graphH = lvl_height(Math.max(0, ...linked_words.map(d => d.level))) + 150

    phrases.forEach(d => position_p(d, graphW + (wordW / 2), graphH, data))
    linked.forEach(d => position_edge(d, graphW + (wordW / 2), graphH, data))

    svg.html('')
        .attr('width', (graphW + wordW) * factor)
        .attr('height', (graphH + wordH / 2) * factor)
        .attr('viewBox', (a, b, els) => `0 0 ${els[0].clientWidth / factor} ${els[0].clientHeight / factor}`)

    /* Words */
    svg.selectAll('.word').data(data.filter(d => !/^\(?[-+]/.test(d.word) && !Array.isArray(d.word))).enter()
        .append('text')
        .html(d => d.html || d.word)
        .attr('class', d => 'word ' + d.tag + ((d.html || d.word).slice(0, 1) === '(' ? ' filler' : ''))
        .attr('x', d => graphW + (wordW / 2) - (wordW * (d.word_i-1)))
        .attr('y', graphH - wordH)

    /* Phrase Labels */
    svg.selectAll('.phrase-lbl').data(phrases).enter()
        .append('text')
        .text(d => terms.types[d.tag])
        .attr('class', d => 'edge-lbl phrase-lbl ' + d.tag)
        .attr('x', d => d.p_mid)
        .attr('y', d => d.p_top - 9)

    /* Phrases */
    svg.selectAll('.phrase').data(phrases).enter()
        .append('line')
        .attr('class', d => 'phrase ' + d.tag)
        .attr('x1', d => d.p_right - 10)
        .attr('x2', d => d.p_left + 10)
        .attr('y1', d => d.p_top)
        .attr('y2', d => d.p_top)

    /* Edges */
    svg.selectAll('.edge').data(linked).enter()
        .append('path')
        .attr('class', d => 'edge-grp edge ' + d.edge_lbl)
        .attr('d', function(d) {
            let My = Array.isArray(d.word) || Array.isArray(data[d.parent-1].word) ? d.top + 15 : d.bottom
            return `M${d.left},${My} C${d.mid-d.diff},${d.top} ${d.mid+d.diff},${d.top} ${d.right},${d.bottom}`
        })

    /* Edge Lables */
    svg.selectAll().data(linked).enter() //'.edge-lbl'
        .append('text')
        .text(d => rels[d.edge_lbl] + (/PREDX|SUBJX/.test(d.edge_lbl) ? ` «${data[d.parent-1].word}»` : ''))
        .attr('class', d => 'edge-lbl ' + d.edge_lbl)
        .attr('x', d => d.mid)
        .attr('y', d => d.arrow - 8)
        .each(function(d, i, nodes) {  // Bg for readability
            let b = nodes[i].getBBox(), r = document.createElementNS(d3.namespaces.svg, 'rect')
            d3.select(r)
                .attr('class', 'clear-bg').attr('x', b.x).attr('y', b.y+3)
                .attr('width', b.width).attr('height', b.height-6)
            this.parentNode.insertBefore(r, this)
        })

    /* Arrows */
    svg.selectAll('.arrow').data(linked).enter()
        .append('path')
        .attr('class', d => 'edge-grp arrow ' + d.edge_lbl)
        .attr('d', 'M0,-1.96 L1.70,0.98 L-1.70,0.98 Z')
        .attr('transform', d => {
            let a = d.type === 'phrase' ? d.word[0] : d.i
                b = d.type === 'phrase' ? data[d.parent-1].word[0] : d.parent
            return `translate(${d.mid}, ${d.arrow}) rotate(${a < b ? '-' : ''}90)`
        })
}
