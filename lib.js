var rels = {}, terms, ajax = function(url, method, data, handler, async) {
        var xhr = new XMLHttpRequest();
        xhr.onload = () => handler(xhr.responseText);
        xhr.open(method, url, async === undefined ? true : async);
        if (method.toLowerCase() === 'post')
            xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        xhr.send(data);
    };

ajax('/quran-morphology/morphology-terms-ar.json', 'get', null, function(data) {
    var group_name, title, pcl_name, phrase_tag;
    terms = JSON.parse(data);
    for (group_name in terms.relations) {
        for (title in terms.relations[group_name])
            rels[title] = terms.relations[group_name][title];
    }
    for (pcl_name in terms.particles)
        terms.types[pcl_name] = terms.particles[pcl_name];
    for (phrase_tag in terms.phrases)
        terms.types[phrase_tag] = terms.phrases[phrase_tag];
    terms.types.ADJ = terms.attrs.ADJ;
    d3.select('#draw').on('click')();
});

d3.select('#draw').on('click', () => {
    d3.select('#graph').html('').append('svg').attr('xmlns', d3.namespaces.svg);
    drawGraph('#graph svg', JSON.parse(d3.select('textarea').node().value));
});

d3.select('#load').on('click', () => {
    var s = d3.select('#surah').node().value, a = d3.select('#ayah').node().value,
        data = `s=${s}&a=${a}&data=` + encodeURI(d3.select('svg').node().outerHTML);
    ajax(`data/${s}.json`, 'get', null, data => {
        data = JSON.parse(data)[a-1];
        var a_parts = Array.isArray(data[0][0]) ? data : [data];

        d3.select('#graph').html('');
        a_parts.forEach(p => {
            d3.select('#graph').append('svg').attr('xmlns', d3.namespaces.svg);
            drawGraph('#graph svg:last-child', p);
        });
    });
});
d3.select('#save').on('click', () => {
    var s = d3.select('#surah').node().value, a = d3.select('#ayah').node().value,
        data = `s=${s}&a=${a}&data=` + encodeURI(d3.select('svg').node().outerHTML);
    ajax('save-graph.php', 'post', data, () => {});
});
d3.select('#save-all').on('click', () => {
    var graph_el = d3.select('#graph'), last;
    graph_el.html('');
    for (var s = 2; s <= 2; s++) {
        if (s > 9 && s < 59) continue;

        ajax(`data/${s}.json`, 'get', null, (s => {
            return data => {
                JSON.parse(data).forEach((d, i) => {
                    i += 1;
                    if (!d[0]) { // Ayah ref
                        ajax(`save-graph.php?s=${s}&a=${i}`, 'post', `data=${i - last}`, () => {}, false);
                        return;
                    }

                    var a_parts = Array.isArray(d[0][0]) ? d : [d], post;
                    a_parts.forEach(p => {
                        graph_el.append('svg').attr('xmlns', d3.namespaces.svg);
                        drawGraph('#graph svg:last-child', p);
                    });
                    post = 'data=' + encodeURI(graph_el.html());
                    ajax(`save-graph.php?s=${s}&a=${i}`, 'post', post, () => {}, false);
                    graph_el.html('');
                    last = i;
                });
            };
        })(s), false);
    }
});
