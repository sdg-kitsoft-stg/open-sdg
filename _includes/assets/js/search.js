var indicatorSearch = function () {

    function sanitizeInput(input) {
        if (input === null) return null;

        var doc = new DOMParser().parseFromString(input, 'text/html');
        var stripped = doc.body.textContent || "";

        var map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            "/": '&#x2F;',
            "`": '&grave;',
        };

        var reg = /[&<>"'/`]/ig;

        return stripped.replace(reg, function (match) {
            return map[match];
        });
    }

    function isBadUrl(url) {
        if (!url) return true;
        return (
            url.indexOf('/404') !== -1 ||
            url.indexOf('page-not-found') !== -1
        );
    }

    var urlParams = new URLSearchParams(window.location.search);
    var searchTerms = sanitizeInput(urlParams.get('q'));

    if (searchTerms !== null) {

        document.getElementById('search-bar-on-page').value = searchTerms;
        document.getElementById('search-term').innerHTML = searchTerms;

        var searchTermsToUse = searchTerms;

        if (searchTerms.split('-').length === 3 && searchTerms.length < 15) {
            searchTermsToUse = searchTerms.replace(/-/g, '.');
        }

        var results = [];
        var alternativeSearchTerms = [];
        var noTermsProvided = (searchTerms === '');

        var useLunr = typeof window.lunr !== 'undefined';

        if (useLunr && !noTermsProvided) {

            var searchIndex = lunr(function () {

                this.use(storeUnstemmed);
                this.ref('url');

                this.field('title', { boost: 20 });
                this.field('id', { boost: 50 });

                for (var ref in opensdg.searchItems) {

                    var item = opensdg.searchItems[ref];

                    if (!item) continue;

                    // Goals & Indicators: index fully
                    if (item.type === 'Goals' || item.type === 'Indicators') {
                        this.add(item);
                    }

                    // Pages: index only title
                    if (item.type === 'Pages') {
                        this.add({
                            url: item.url,
                            title: item.title,
                            content: '',
                            id: item.id,
                            type: item.type
                        });
                    }
                }
            });

            results = searchIndex.search(searchTermsToUse);

            // Strict filtering — remove weak matches
            results = results.filter(function (result) {

                var item = opensdg.searchItems[result.ref];
                if (!item) return false;

                var term = searchTermsToUse.toLowerCase();

                // match in title
                if (item.title && item.title.toLowerCase().includes(term)) {
                    return true;
                }

                // match by id for goals/indicators
                if ((item.type === 'Goals' || item.type === 'Indicators') && item.id) {
                    if (item.id.toLowerCase().includes(term)) {
                        return true;
                    }
                }

                return false;
            });

        }

        // remove 404
        results = results.filter(function (result) {
            return !isBadUrl(result.ref);
        });

        var resultItems = [];

        results.forEach(function (result) {

            var originalDoc = opensdg.searchItems[result.ref];
            if (!originalDoc) return;

            var doc = Object.assign({}, originalDoc);

            if (doc.content && doc.content.length > 400) {
                doc.content = doc.content.substring(0, 400) + '...';
            }

            var highlightTerm = searchTermsToUse;

            if (doc.title) {
                doc.title = doc.title.replace(
                    new RegExp('(' + escapeRegExp(highlightTerm) + ')', 'gi'),
                    '<span class="match">$1</span>'
                );
            }

            if (doc.content) {
                doc.content = doc.content.replace(
                    new RegExp('(' + escapeRegExp(highlightTerm) + ')', 'gi'),
                    '<span class="match">$1</span>'
                );
            }

            resultItems.push(doc);
        });

        console.log({
            resultItems,
            searchTerms
        });

        $('.loader').hide();

        var template = _.template(
            $("script.results-template").html()
        );

        $('div.results').html(template({
            searchResults: resultItems,
            resultsCount: resultItems.length,
            didYouMean: false,
        }));

        $('.header-search-bar').hide();
    }

    function escapeRegExp(str) {
        return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/gi, "\\$&");
    }

    function storeUnstemmed(builder) {
        function pipelineFunction(token) {
            token.metadata['unstemmed'] = token.toString();
            return token;
        }

        lunr.Pipeline.registerFunction(pipelineFunction, 'storeUnstemmed');
        var firstPipelineFunction = builder.pipeline._stack[0];
        builder.pipeline.before(firstPipelineFunction, pipelineFunction);
        builder.metadataWhitelist.push('unstemmed');
    }
};

$(function () {

    var $el = $('#indicator_search');

    $('#jump-to-search').show();

    $('#jump-to-search a').click(function () {
        if ($el.is(':hidden')) {
            $('.navbar span[data-target="search"]').click();
        }
        $el.focus();
    });

    indicatorSearch();
});
