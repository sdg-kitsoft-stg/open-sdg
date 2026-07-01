/**
 * @param {Object} config
 * @param {Object} info
 * @return null
 */
function alterTableConfig(config, info) {
    opensdg.tableConfigAlterations.forEach(function (callback) {
        callback(config, info);
    });
}

/**
 * @param {Object} tableData
 * @return {String}
 */
function formatCsvValue(value, isValueColumn) {
    if (
        isValueColumn &&
        (value === null || typeof value === 'undefined' || String(value).trim() === '')
    ) {
        return '"NA"';
    }

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

function getMetadataCsvRows(selector) {
    var rows = [];
    var $table = $(selector);

    if (!$table.length) {
        return rows;
    }

    $table.find('tbody tr').each(function () {
        var key = $(this).find('th').text().trim();
        var value = $(this).find('td').text().trim().replace(/\s+/g, ' ');

        if (key || value) {
            rows.push([
                formatCsvValue(key, false),
                formatCsvValue(value, false)
            ].join(';'));
        }
    });

    return rows;
}

function toCsv(tableData, selectedSeries, selectedUnit) {
    var delimiter = ';';
    var lines = [];
    var lang = document.documentElement.lang || 'uk';
    var valueColumnIndex = -1;

    var dataHeadings = _.map(tableData.headings, function (heading, index) {
        var translatedHeading = translations.t(heading);

        if (
            !translatedHeading ||
            translatedHeading === '' ||
            translatedHeading === 'undefined'
        ) {
            translatedHeading = lang === 'uk'
                ? 'Значення'
                : 'Value';
        }

        var normalizedHeading = String(translatedHeading || heading).trim();

        if (
            normalizedHeading === 'Value' ||
            normalizedHeading === 'Значення'
        ) {
            valueColumnIndex = index;
        }

        return formatCsvValue(translatedHeading, false);
    });

    var metaHeadings = [];

    if (selectedSeries) {
        metaHeadings.push(formatCsvValue(translations.indicator.series, false));
    }

    if (selectedUnit) {
        metaHeadings.push(formatCsvValue(translations.indicator.unit, false));
    }

    lines.push(dataHeadings.concat(metaHeadings).join(delimiter));

    _.each(tableData.data, function (dataValues) {
        var line = [];

        _.each(tableData.headings, function (heading, index) {
            line.push(formatCsvValue(dataValues[index], index === valueColumnIndex));
        });

        if (selectedSeries) {
            line.push(formatCsvValue(translations.t(selectedSeries), false));
        }

        if (selectedUnit) {
            line.push(formatCsvValue(translations.t(selectedUnit), false));
        }

        lines.push(line.join(delimiter));
    });

    var metadataRows = getMetadataCsvRows('#national .metadata-content');

    if (metadataRows.length) {
        lines.push('');

        if (lang === 'uk') {
            lines.push(formatCsvValue('Поле метаданих Значення метаданих', false));
        } else {
            lines.push(formatCsvValue('Metadata field Metadata value', false));
        }

        lines = lines.concat(metadataRows);
    }

    return '\ufeff' + lines.join('\n');
}

/**
 * @param {Element} el
 * @param {Object} info
 * @return null
 */
function initialiseDataTable(el, info) {
    var nonYearColumns = [];
    for (var i = 1; i < info.table.headings.length; i++) {
        nonYearColumns.push(i);
    }

    var datatables_options = OPTIONS.datatables_options || {
        paging: false,
        bInfo: false,
        bAutoWidth: false,
        searching: false,
        responsive: false,
        order: [[0, 'asc']],
        columnDefs: [
            {
                targets: nonYearColumns,
                createdCell: function (td, cellData, rowData, row, col) {
                    var additionalInfo = Object.assign({}, info);
                    additionalInfo.row = row;
                    additionalInfo.col = col;
                    if (info.chartType === 'binary') {
                        var cellDataInt = Number(cellData);
                        if (cellDataInt === 1) {
                            cellData = translations.indicator.affirmative;
                        } else if (cellDataInt === 0 || cellDataInt === -1) {
                            cellData = translations.indicator.negative;
                        }
                    }
                    $(td).text(alterDataDisplay(cellData, rowData, 'table cell', additionalInfo));
                },
            },
        ],
    }, table = $(el).find('table');

    datatables_options.aaSorting = [];

    alterTableConfig(datatables_options, info);
    table.DataTable(datatables_options);
    table.removeAttr('role');
    table.find('thead th').removeAttr('rowspan').removeAttr('colspan').removeAttr('aria-label');
    setDataTableWidth(table);
};

/**
 * @param {Object} chartInfo
 * @return null
 */
function createSelectionsTable(chartInfo) {
    createTable(chartInfo.selectionsTable, chartInfo.indicatorId, '#selectionsTable', chartInfo.isProxy, chartInfo.observationAttributesTable, chartInfo.chartType);
    $('#tableSelectionDownload').empty();
    createTableTargetLines(chartInfo.graphAnnotations);
    createDownloadButton(chartInfo.selectionsTable, 'Table', chartInfo.indicatorId, '#tableSelectionDownload', chartInfo.selectedSeries, chartInfo.selectedUnit);
    createSourceButton(chartInfo.shortIndicatorId, '#tableSelectionDownload');
    createIndicatorDownloadButtons(chartInfo.indicatorDownloads, chartInfo.shortIndicatorId, '#tableSelectionDownload');
};

/**
 * @param {Array} graphAnnotations
 * @return null
 */
function createTableTargetLines(graphAnnotations) {
    var targetLines = graphAnnotations.filter(function (a) {
        return a.preset === 'target_line';
    });
    var $targetLines = $('#tableTargetLines');
    $targetLines.empty();
    targetLines.forEach(function (targetLine) {
        var targetLineLabel = targetLine.label.content;
        if (!targetLineLabel) {
            targetLineLabel = opensdg.annotationPresets.target_line.label.content;
        }
      var decimalSeparator = (document.documentElement.lang === 'uk') ? ',' : '.';
      $targetLines.append('<dt>' + targetLineLabel + '</dt><dd>' + targetLine.value.toString().replace('.', decimalSeparator) + '</dd>');
    });
    if (targetLines.length === 0) {
        $targetLines.hide();
    } else {
        $targetLines.show();
    }
}

/**
 * @param {Object} table
 * @return bool
 */
function tableHasData(table) {
    for (var i = 0; i < table.data.length; i++) {
        if (table.data[i].length > 1) {
            return true;
        }
    }
    return false;
}

/**
 * @param {Object} table
 * @param {String} indicatorId
 * @param {Element} el
 * @param {bool} isProxy
 * @param {Object} observationAttributesTable
 * @param {String} chartType
 * @return null
 */
function createTable(table, indicatorId, el, isProxy, observationAttributesTable, chartType) {

    var table_class = OPTIONS.table_class || 'table table-hover';

    // clear:
    $(el).html('');

    if (table && tableHasData(table)) {
        var currentTable = $('<table />').attr({
            'class': table_class,
            'width': '100%'
        });

        var tableTitle = MODEL.chartTitle;
        if (isProxy) {
            tableTitle += ' ' + PROXY_PILL;
        }
        currentTable.append('<caption>' + tableTitle + '</caption>');

        var table_head = '<thead><tr>';

        var getHeading = function (text) {
            var arrows = '<span class="sort"><i class="fa fa-sort"></i><i class="fa fa-sort-down"></i><i class="fa fa-sort-up"></i></span>';
            var button = '<span tabindex="0" role="button" aria-describedby="column-sort-info">' + text + '</span>';
            return button + arrows;
        };

        table.headings.forEach(function (heading, index) {
            let translatedHeading = translations.t(heading);

            if (table.headings.length && index === 1) {
                const genericTerms = ['Value', 'Значення', 'Value', 'undefined'];

                if (!translatedHeading || genericTerms.includes(translatedHeading) || genericTerms.includes(heading)) {
                    translatedHeading = (window.location.pathname.indexOf('/uk/') !== -1) ? 'Україна' : 'Ukraine';
                }

                if (window.location.pathname.includes('6-1-1') && !window.location.pathname.includes('16-1-1')) {
                    const [firstHeading, ...restHeadings] = translatedHeading.split(',');
                    if (firstHeading && (firstHeading === 'Ukraine' || firstHeading === 'Україна')) {
                        translatedHeading = `${restHeadings.join(', ')}, ${firstHeading}`;
                    }
                }

                if (window.location.pathname.includes('6-2-1') && !window.location.pathname.includes('16-2-1')) {
                    translatedHeading = (window.location.pathname.indexOf('/uk/') !== -1) ? 'вікові групи' : 'age groups';
                }

                if (window.location.pathname.includes('16-2-1')) {
                    const badgeType = document.querySelector('.badge-edition');
                    const isArchive = badgeType && badgeType.classList.contains('badge-archive');

                    if (isArchive) {
                        translatedHeading = (window.location.pathname.indexOf('/uk/') !== -1) ? 'Потерпіло від кримінальних правопорушень (рівень на 100 тис. населення)' : 'Victims of criminal offenses (per 100 thousand population)';
                    }
                }
            }

            const finalTitleText = translatedHeading || heading;
            const title = getHeading(finalTitleText);

            if (title) {
                table_head += '<th' + (!index ? '' : ' class="table-value"') + ' scope="col">' + title + '</th>';
            }
        });

        table_head += '</tr></thead>';
        currentTable.append(table_head);
        currentTable.append('<tbody></tbody>');

        table.data.forEach(function (data) {
            var row_html = '<tr>';
            table.headings.forEach(function (heading, index) {
                // For accessibility set the Year column to a "row" scope th.
                var isYear = (index == 0);
                var cell_prefix = (isYear) ? '<th scope="row"' : '<td';
                var cell_suffix = (isYear) ? '</th>' : '</td>';
                row_html += cell_prefix + (isYear ? '' : ' class="table-value"') + '>' + (data[index] !== null && data[index] !== undefined ? data[index] : '-') + cell_suffix;
            });
            row_html += '</tr>';
            currentTable.find('tbody').append(row_html);
        });

        $(el).append(currentTable);

        // initialise data table and provide some info for alterations.
        var alterationInfo = {
            table: table,
            indicatorId: indicatorId,
            observationAttributesTable: observationAttributesTable,
            chartType: chartType,
        };
        initialiseDataTable(el, alterationInfo);

        $(el).removeClass('table-has-no-data');
        $('#selectionTableFooter').show();

        $(el).find('th')
            .removeAttr('tabindex')
            .click(function () {
                var sortDirection = $(this).attr('aria-sort');
                $(this).find('span[role="button"]').attr('aria-sort', sortDirection);
            });

        let tableWrapper = document.querySelector('.dataTables_wrapper');
        if (tableWrapper) {
            tableWrapper.addEventListener('scroll', function (e) {
                if (tableWrapper.scrollLeft > 0) {
                    tableWrapper.classList.add('scrolled-x');
                } else {
                    tableWrapper.classList.remove('scrolled-x');
                }
                if (tableWrapper.scrollTop > 0) {
                    tableWrapper.classList.add('scrolled-y');
                } else {
                    tableWrapper.classList.remove('scrolled-y');
                }
            });
        }
    } else {
        $(el).append($('<h3 />').text(translations.indicator.data_not_available));
        $(el).addClass('table-has-no-data');
        $('#selectionTableFooter').hide();
    }
}

/**
 * @param {Object} table
 * @return null
 */
function setDataTableWidth(table) {
    table.find('thead th').each(function () {
        var textLength = $(this).text().length;
        for (var loop = 0; loop < VIEW._tableColumnDefs.length; loop++) {
            var def = VIEW._tableColumnDefs[loop];
            if (textLength < def.maxCharCount) {
                if (!def.width) {
                    $(this).css('white-space', 'nowrap');
                } else {
                    // $(this).css('width', def.width + 'px');
                    $(this).data('width', def.width);
                }
                break;
            }
        }
    });

    table.removeAttr('style width');

    var totalWidth = 0;
    table.find('thead th').each(function () {
        if ($(this).data('width')) {
            totalWidth += $(this).data('width');
        } else {
            totalWidth += $(this).width();
        }
    });

    // ascertain whether the table should be width 100% or explicit width:
    // var containerWidth = table.closest('.dataTables_wrapper').width();

    table.css('width', '100%');
    // if (totalWidth > containerWidth) {
    //     table.css('width', totalWidth + 'px');
    // } else {
    //     table.css('width', '100%');
    // }
}

/**
 * @param {Object} table
 * @return null
 */
function updateChartDownloadButton(table, selectedSeries, selectedUnit) {
    if (typeof VIEW._chartDownloadButton !== 'undefined') {
        var tableCsv = toCsv(table, selectedSeries, selectedUnit);
        var blob = new Blob([tableCsv], {
            type: 'text/csv'
        });
        var fileName = VIEW._chartDownloadButton.attr('download');
        if (window.navigator && window.navigator.msSaveBlob) {
            // Special behavior for IE.
            VIEW._chartDownloadButton.off('click.openSdgDownload')
            VIEW._chartDownloadButton.on('click.openSdgDownload', function (event) {
                window.navigator.msSaveBlob(blob, fileName);
            });
        } else {
            VIEW._chartDownloadButton
                .attr('href', URL.createObjectURL(blob))
                .data('csvdata', tableCsv);
        }
    }
}
