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

    function norm(s) {
        return (s || '').toString().toLowerCase().trim();
    }

    function includesTerm(haystack, needle) {
        haystack = norm(haystack);
        needle = norm(needle);
        return needle.length > 0 && haystack.indexOf(needle) !== -1;
    }

    function escapeRegExp(str) {
        return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/gi, "\\$&");
    }

    // Lunr pipeline helper (keeps unstemmed token)
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

    var urlParams = new URLSearchParams(window.location.search);
    var searchTerms = sanitizeInput(urlParams.get('q'));

    if (searchTerms !== null) {
        document.getElementById('search-bar-on-page').value = searchTerms;
        document.getElementById('search-term').innerHTML = searchTerms;

        var searchTermsToUse = searchTerms;

        // allow indicator search by dash (best guess)
        if (searchTerms.split('-').length === 3 && searchTerms.length < 15) {
            searchTermsToUse = searchTerms.replace(/-/g, '.');
        }

        var noTermsProvided = (searchTerms === '');

        var lang = (window.opensdg && opensdg.language) ? opensdg.language : 'en';

        // ✅ Use Lunr only if available + language supported
        var useLunr = (typeof window.lunr !== 'undefined');
        if (useLunr && lang !== 'en') {
            // if no language plugin, disable lunr (fallback will handle)
            if (typeof lunr[lang] === 'undefined') {
                useLunr = false;
            }
        }

        // Special-case indicator ids: do not need Lunr
        var searchWords = searchTermsToUse.split(' ');
        var indicatorIdParts = searchWords[0].split('.');
        var isIndicatorSearch = (searchWords.length === 1 && indicatorIdParts.length >= 3);
        if (isIndicatorSearch) {
            useLunr = false;
        }

        var results = [];
        var alternativeSearchTerms = [];

        // -----------------------------
        // LUNR SEARCH (if supported)
        // -----------------------------
        if (useLunr && !noTermsProvided) {
            // English tweak for commas/dashes
            if (lang === 'en') {
                lunr.tokenizer.separator = /[\s\-,]+/;
            }

            var searchIndex = lunr(function () {
                if (lang !== 'en' && lunr[lang]) {
                    this.use(lunr[lang]);
                }

                this.use(storeUnstemmed);
                this.ref('url');

                // We want "strict-ish" results: title/id are primary
                this.field('title', { boost: 20 });
                this.field('id', { boost: 50 });

                // Index documents:
                // Goals/Indicators: title + id + (optionally content)
                // Pages: title only (to reduce noise)
                for (var ref in opensdg.searchItems) {
                    var item = opensdg.searchItems[ref];
                    if (!item || !item.url) continue;

                    if (item.type === 'Goals' || item.type === 'Indicators') {
                        this.add({
                            url: item.url,
                            title: item.title || '',
                            id: item.id || '',
                            // keep content out to stay strict, or include if you want broader matching:
                            content: item.content || '',
                            type: item.type
                        });
                    } else if (item.type === 'Pages') {
                        this.add({
                            url: item.url,
                            title: item.title || '',
                            id: item.id || '',
                            content: '',
                            type: item.type
                        });
                    } else {
                        // default: title-only
                        this.add({
                            url: item.url,
                            title: item.title || '',
                            id: item.id || '',
                            content: '',
                            type: item.type
                        });
                    }
                }
            });

            results = searchIndex.search(searchTermsToUse);

            // ✅ If Lunr returns nothing (common on unsupported/weak languages),
            // we will fallback to basic search below.
        }

        // -----------------------------
        // BASIC FALLBACK SEARCH
        // (Runs when Lunr is off OR returns 0)
        // -----------------------------
        if (!noTermsProvided && (!useLunr || results.length === 0)) {
            var term = searchTermsToUse;

            // Strict relevance:
            // - Goals/Indicators: title OR id contains term
            // - Pages: title contains term (and optionally content contains term — uncomment if needed)
            var matched = [];
            for (var key in opensdg.searchItems) {
                var item = opensdg.searchItems[key];
                if (!item || !item.url) continue;

                if (isBadUrl(item.url)) continue;

                var ok = false;

                if (item.type === 'Goals' || item.type === 'Indicators') {
                    ok = includesTerm(item.title, term) || includesTerm(item.id, term);
                    // If you want allow content matching for these types, add:
                    // ok = ok || includesTerm(item.content, term);
                } else if (item.type === 'Pages') {
                    ok = includesTerm(item.title, term);
                    // If you want Pages to match by content too (less strict, more results), add:
                    // ok = ok || includesTerm(item.content, term);
                } else {
                    ok = includesTerm(item.title, term);
                }

                if (ok) matched.push(item);
            }

            // mimic Lunr results format
            results = matched.map(function (item) { return { ref: item.url }; });
        }

        // remove 404 / page-not-found from Lunr results too
        results = results.filter(function (r) { return !isBadUrl(r.ref); });

        // Build resultItems without mutating opensdg.searchItems
        var resultItems = [];
        results.forEach(function (result) {
            var originalDoc = opensdg.searchItems[result.ref];
            if (!originalDoc) return;

            var doc = Object.assign({}, originalDoc);
            doc.url = normalizeUrl(doc.url);
            
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
            searchTerms: searchTerms,
            searchTermsToUse: searchTermsToUse,
            lang: lang,
            useLunr: useLunr,
            resultItems: resultItems
        });

        $('.loader').hide();

        var template = _.template($("script.results-template").html());
        $('div.results').html(template({
            searchResults: resultItems,
            resultsCount: resultItems.length,
            didYouMean: (alternativeSearchTerms.length > 0) ? alternativeSearchTerms : false,
        }));

        $('.header-search-bar').hide();
    }
    function normalizeUrl(url) {
        if (!url) return url;

        url = url.replace('/uk/uk/', '/uk/');
        url = url.replace(/\/{2,}/g, '/');

        return url;
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
