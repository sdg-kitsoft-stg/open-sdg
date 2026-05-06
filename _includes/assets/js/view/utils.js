/**
 * @param {String} selectedSeries
 * @param {String} selectedUnit
 * @return null
 */
function updateSeriesAndUnitElements(selectedSeries, selectedUnit) {
    var hasSeries = typeof selectedSeries !== 'undefined',
        hasUnit = typeof selectedUnit !== 'undefined',
        hasBoth = hasSeries && hasUnit;
    if (hasSeries || hasUnit || hasBoth) {
        $('[data-for-series], [data-for-unit]').each(function () {
            var elementSeries = $(this).data('for-series'),
                elementUnit = $(this).data('for-unit'),
                seriesMatches = elementSeries === selectedSeries,
                unitMatches = elementUnit === selectedUnit;
            if ((hasSeries || hasBoth) && !seriesMatches && elementSeries !== '') {
                $(this).hide();
            }
            else if ((hasUnit || hasBoth) && !unitMatches && elementUnit !== '') {
                $(this).hide();
            }
            else {
                $(this).show();
            }
        });
    }
}

/**
 * @param {String} contrast
 * @return bool
 */
function isHighContrast(contrast) {
    if (contrast) {
        return contrast === 'high';
    }
    else {
        return $('body').hasClass('contrast-high');
    }
}

/**
 * @param {Object} table
 * @param {String} name
 * @param {String} indicatorId
 * @param {Element} el
 * @return null
 */
function createDownloadButton(table, name, indicatorId, el, selectedSeries, selectedUnit) {
    if (window.Modernizr.blobconstructor) {
        var downloadKey = 'download_csv';
        if (name == 'Chart') {
            downloadKey = 'download_chart';
        }
        if (name == 'Table') {
            downloadKey = 'download_table';
        }
        var gaLabel = 'Download ' + name + ' CSV: ' + indicatorId.replace('indicator_', '');
        var tableCsv = toCsv(table, selectedSeries, selectedUnit);
        var fileName = indicatorId + '.csv';
        var downloadButton = $('<a />').text(translations.indicator[downloadKey])
            .attr(opensdg.autotrack('download_data_current', 'Downloads', 'Download CSV', gaLabel))
            .attr({
                'download': fileName,
                'title': translations.indicator.download_csv_title,
                'aria-label': translations.indicator.download_csv_title,
                'class': 'btn btn-primary btn-download',
                'tabindex': 0,
                'role': 'button',
            });
        var blob = new Blob([tableCsv], {
            type: 'text/csv'
        });
        if (window.navigator && window.navigator.msSaveBlob) {
            // Special behavior for IE.
            downloadButton.on('click.openSdgDownload', function (event) {
                window.navigator.msSaveBlob(blob, fileName);
            });
        }
        else {
            downloadButton
                .attr('href', URL.createObjectURL(blob))
                .data('csvdata', tableCsv);
        }
        if (name == 'Chart') {
            VIEW._chartDownloadButton = downloadButton;
        }
        $(el).append(downloadButton);
    } else {
        var headlineId = indicatorId.replace('indicator', 'headline');
        var id = indicatorId.replace('indicator_', '');
        var gaLabel = 'Download Headline CSV: ' + id;
        $(el).append($('<a />').text(translations.indicator.download_headline)
            .attr(opensdg.autotrack('download_data_headline', 'Downloads', 'Download CSV', gaLabel))
            .attr({
                'href': opensdg.remoteDataBaseUrl + '/headline/' + id + '.csv',
                'download': headlineId + '.csv',
                'title': translations.indicator.download_headline_title,
                'aria-label': translations.indicator.download_headline_title,
                'class': 'btn btn-primary btn-download',
                'tabindex': 0,
                'role': 'button',
            }));
    }
}

function escapeCsvValue(value) {
    if (value === null || typeof value === 'undefined') {
        return '""';
    }

    return '"' + String(value)
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/"/g, '""') + '"';
}

function formatExcelCsvValue(value) {
    if (value === null || typeof value === 'undefined') {
        return '""';
    }

    var str = String(value).trim();
    var lang = document.documentElement.lang || 'uk';

    if (/^-?\d+\.\d+$/.test(str)) {
        if (lang === 'uk') {
            str = str.replace('.', ',');
        }
    }

    return '"' + str.replace(/"/g, '""') + '"';
}

function parseCsvLine(line) {
    var result = [];
    var current = '';
    var inQuotes = false;

    for (var i = 0; i < line.length; i++) {
        var char = line[i];
        var nextChar = line[i + 1];

        if (char === '"' && inQuotes && nextChar === '"') {
            current += '"';
            i++;
        } else if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }

    result.push(current);

    return result;
}

function convertSourceCsvForExcel(sourceCsv) {
    return sourceCsv
        .trim()
        .split(/\r?\n/)
        .map(function (line) {
            return parseCsvLine(line)
                .map(formatExcelCsvValue)
                .join(';');
        })
        .join('\n');
}

function getMetadataCsvRows(selector) {
    var rows = [];
    var $table = $(selector);

    if (!$table.length) {
        return rows;
    }

    $table.find('tbody tr').each(function () {
        var key = $(this).find('th').text();
        var value = $(this).find('td').text();

        if ($.trim(key) || $.trim(value)) {
            rows.push([
                formatExcelCsvValue(key),
                formatExcelCsvValue(value)
            ].join(';'));
        }
    });

    return rows;
}

function downloadCsvWithMetadata(indicatorId) {
    var sourceUrl = opensdg.remoteDataBaseUrl + '/data/' + indicatorId + '.csv';

    $.get(sourceUrl)
        .done(function (sourceCsv) {
            var lines = [];

            lines.push(convertSourceCsvForExcel(sourceCsv));

            var metadataRows = getMetadataCsvRows('#national .metadata-content');

            if (metadataRows.length) {
                var lang = document.documentElement.lang || 'uk';

                lines.push('');

                if (lang === 'uk') {
                    lines.push('"Поле метаданих";"Значення метаданих"');
                } else {
                    lines.push('"Metadata field";"Metadata value"');
                }

                lines = lines.concat(metadataRows);
            }

            var csv = lines.join('\n');

            var blob = new Blob(['\ufeff' + csv], {
                type: 'text/csv;charset=utf-8'
            });

            if (window.navigator && window.navigator.msSaveBlob) {
                window.navigator.msSaveBlob(blob, indicatorId + '.csv');
                return;
            }

            var url = URL.createObjectURL(blob);
            var link = document.createElement('a');

            link.href = url;
            link.download = indicatorId + '.csv';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            URL.revokeObjectURL(url);
        });
}

/**
 * @param {String} indicatorId
 * @param {Element} el
 * @return null
 */
function createSourceButton(indicatorId, el) {
    var gaLabel = 'Download Source CSV: ' + indicatorId;

    var $button = $('<button />').text(translations.indicator.download_source)
        .attr(opensdg.autotrack('download_data_source', 'Downloads', 'Download CSV', gaLabel))
        .attr({
            'type': 'button',
            'title': translations.indicator.download_source_title,
            'aria-label': translations.indicator.download_source_title,
            'class': 'btn btn-primary btn-download',
        });

    $button.on('click.openSdgDownloadSource', function (e) {
        e.preventDefault();
        downloadCsvWithMetadata(indicatorId);
    });

    $(el).append($button);
}

/**
 * @param {Object} indicatorDownloads
 * @param {String} indicatorId
 * @param {Element} el
 * @return null
 */
function createIndicatorDownloadButtons(indicatorDownloads, indicatorId, el) {
    if (indicatorDownloads) {
        var buttonLabels = Object.keys(indicatorDownloads);
        for (var i = 0; i < buttonLabels.length; i++) {
            var buttonLabel = buttonLabels[i];
            var href = indicatorDownloads[buttonLabel].href;
            var buttonLabelTranslated = translations.t(buttonLabel);
            var gaLabel = buttonLabel + ': ' + indicatorId;
            $(el).append($('<a />').text(buttonLabelTranslated)
                .attr(opensdg.autotrack(buttonLabel, 'Downloads', buttonLabel, gaLabel))
                .attr({
                    'href': opensdg.remoteDataBaseUrl + '/' + href,
                    'download': href.split('/').pop(),
                    'title': buttonLabelTranslated,
                    'class': 'btn btn-primary btn-download',
                    'tabindex': 0,
                    'role': 'button',
                }));
        }
    }
}
