( function (root, factory) {
    // Set up appropriately for the environment.
    if (typeof exports !== 'undefined') {
        // Node/CommonJS
        factory(root, exports, require('underscore'),
          require('backbone'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD
        define(['underscore', 'backbone', 'slickback', 'exports'],
          function (_, Backbone, Slickback, exports) {
              factory(root, Slickback, _, Backbone);
          });
    } else {
        // Browser globals
        factory(root, root.Slickback, root._, root.Backbone);
    }
}(this, function (root, Slickback, _, Backbone) {
    "use strict";

    /**
     * Parameters:
     * - precision (default 0 formats as integer)
     * - separated (true for comma-separated, or pass separator string)
     * - allowNull (returns null for blank values; othewise returns zero)
     */
    var numberFormatter = function (row, cell, value, col, data) {
        methods = {
            thousandsSeparated: function (numberValue, separator) {
                var stringValue = String(numberValue);
                var numberParts = stringValue.split('.');
                var units = numberParts[0];
                var fraction = numberParts[1];

                var result = units.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + separator);
                if (fraction)
                    result += ("." + fraction);
                return result;
            },
            getSeparator: function (col) {
                return ( typeof col.separated === 'string') ? col.separated : ',';
            }
        };

        var rawValue = data.get(col.field);

        if (!rawValue || rawValue === "") {
            if (col.allowNull)
                return null;
            rawValue = 0;
        }

        var numberValue;
        if (col.precision) {
            numberValue = ( typeof rawValue === 'number') ? rawValue : parseFloat(rawValue);
            numberValue = numberValue.toFixed(col.precision);
        } else {
            numberValue = ( typeof rawValue === 'number') ? rawValue.toFixed(0) : parseFloat(rawValue).toFixed(0);
        }

        if (col.separated) {
            var separator = methods.getSeparator(col);
            return methods.thousandsSeparated(numberValue, separator);
        } else {
            return String(numberValue);
        }
    }
    /**
     * Strip formatting that would prevent a value from being serialized.
     */
    numberFormatter.unformat = function (value, col) {
        if (( typeof value === 'string') && col.separated) {
            var separator = getSeparator(col);
            var escapedSeparator = separator.replace(/[.]/g, "\\$&");
            var separatorMatcher = new RegExp(escapedSeparator, 'g');
            return value.replace(separatorMatcher, '');
        } else {
            return value;
        }
    };

    Slickback.NumberFormatter = numberFormatter;

    //Choice formatter:
    Slickback.ChoiceFormatter = function (row, cell, value, col, data) {
        var chosen = data.get(col.field);
        // why string?
        var choice = _.find(col.choices, function (choice) {
            // NOTE: using type coercion so element value="2" == column value: 2
            return (choice == chosen || (choice && (choice.value == chosen)));
        });
        return choice ? (choice.label || choice) : ( typeof col.includeBlank === 'string' ? col.includeBlank : '');
    };


}));
