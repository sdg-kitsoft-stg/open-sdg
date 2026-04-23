opensdg.chartTypes.line = function(info) {
    var config = opensdg.chartTypes.base(info);

    function getPageLocale() {
        var lang = document.documentElement.lang || 'en';
        return lang.toLowerCase().startsWith('uk') ? 'uk-UA' : lang;
    }

    function formatChartNumber(value) {
        if (value === null || value === undefined || value === '') {
            return '';
        }

        var num = typeof value === 'number'
            ? value
            : Number(String(value).replace(',', '.'));

        if (!Number.isFinite(num)) {
            return value;
        }

        return new Intl.NumberFormat(getPageLocale(), {
            minimumFractionDigits: 0,
            maximumFractionDigits: 20
        }).format(num);
    }

    var overrides = {
        type: 'line',
        options: {
            scales: {
                y: {
                    ticks: {
                        callback: function(value) {
                            return formatChartNumber(value);
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            var label = context.dataset.label ? context.dataset.label + ': ' : '';
                            return label + formatChartNumber(context.parsed.y);
                        }
                    }
                },
            },
        },
        plugins: [{
            beforeDatasetsDraw: function(chart) {
                if (chart.tooltip._active && chart.tooltip._active.length) {
                    var activePoint = chart.tooltip._active[0],
                        ctx = chart.ctx,
                        x = activePoint.element.x,
                        topY = chart.scales.y.top,
                        bottomY = chart.scales.y.bottom;

                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(x, topY);
                    ctx.lineTo(x, bottomY);
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = '#757575';
                    ctx.stroke();
                    ctx.restore();
                }
            }
        }],
    };

    _.merge(config, overrides);
    return config;
}
