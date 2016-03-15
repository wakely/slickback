( function(root, factory) {
        // Set up appropriately for the environment.
        if ( typeof exports !== 'undefined') {
            // Node/CommonJS - no need for jquery 
            factory(root, exports, require('underscore'), require('backbone'));
        } else if ( typeof define === 'function' && define.amd) {
            // AMD
            define(['underscore', 'Backbone', 'jquery', 'Slickback', 'exports'], function(_, Backbone, $, Slickback, exports) {
                factory(root, Slickback, $, _, Backbone);
            });
        } else {
            // Browser globals
            factory(root, root.Slickback, (root.jQuery || root.Zepto || root.ender), root._, root.Backbone);
        }
    }(this, function(root, Slickback, $, _, Backbone) {"use strict";

        var unformatValue = function(value, column) {
            return (column.formatter && column.formatter.unformat) ? column.formatter.unformat(value, column) : value;
        };

        var makeElement = function(tag, attributes, content) {
            var $element = $(tag);
            if (attributes)
                $element.attr(attributes);
            if (content)
                $element.html(content);
            return $element;
        };

        var EditorMixin = {
            createTextInputElement : function() {
                var $input = $('<input type="text" class="editor-text" />');
                $input.bind("keydown.nav", function(e) {
                    if (e.keyCode === $.ui.keyCode.LEFT || e.keyCode === $.ui.keyCode.RIGHT) {
                        e.stopImmediatePropagation();
                    }
                });
                $input.appendTo(this.container);
                $input.focus().select();
                return $input;
            },
            createSelectElement : function() {
                var $input = makeElement('<select>', this.column.attributes);
                if (this.column.includeBlank) {
                    var option = _.isString(this.column.includeBlank) ? makeElement('<option>', {
                        value : null
                    }, this.column.includeBlank) : makeElement('<option>', {
                        value : null
                    });
                    $input.append(option);
                }
                _.each(this.column.choices, function(choice) {
                    var value = choice.value || choice;
                    var label = choice.label || value;
                    var option = makeElement('<option>', {
                        value : value
                    }, label);
                    $input.append(option);
                });
                $input.appendTo(this.container);
                $input.focus();
                return $input;
            },
            destroy : function() {
                this.$input.remove();
            },
            focus : function() {
                this.$input.focus();
            },
            loadValue : function(model) {
                var editValue = this.formattedModelValue(model);
                this.defaultValue = editValue;
                this.$input.val(editValue);
                this.$input[0].defaultValue = editValue;
                this.$input.select();
                // ok for selects?
            },
            applyValue : function(model, value) {
                var column = this.column;
                var internalValue = unformatValue(value, column);
                var newValues = {};
                newValues[column.field] = internalValue;
                model.set(newValues);
            },
            isValueChanged : function() {
                /*jshint eqeqeq:false eqnull:true*/
                return (!(this.$input.val() == null && this.defaultValue == null) && (this.$input.val() != this.defaultValue));
            },
            unformattedModelValue : function(model) {
                return model.get(this.column.field);
            },
            formattedModelValue : function(model) {
                var column = this.column;
                return column.formatter ? // NOTE: not passing row,column,value
                column.formatter(null, null, null, column, model) : model.get(column.field);
            },
            unformattedInputValue : function() {
                var inputValue = this.$input.val();
                return unformatValue(inputValue, this.column);
            }
        };

        Slickback.EditorMixin = EditorMixin;

        //Textcell editor
        function TextCellEditor(args) {
            this.container = args.container;
            this.column = args.column;
            this.defaultValue = null;
            this.$input = this.createTextInputElement();
        }


        _.extend(TextCellEditor.prototype, EditorMixin, {
            serializeValue : function() {
                return this.$input.val();
            },
            validate : function() {
                var column = this.column;
                return column.validator ? column.validator(this.$input.val()) : {
                    valid : true,
                    msg : null
                };
            }
        });

        Slickback.TextCellEditor = TextCellEditor;

        //Integer cell editor
        function IntegerCellEditor(args) {
            this.container = args.container;
            this.column = args.column;
            this.defaultValue = null;
            this.$input = this.createTextInputElement();
        }


        _.extend(IntegerCellEditor.prototype, EditorMixin, {
            serializeValue : function() {
                var value = this.unformattedInputValue();
                return parseInt(value, 10) || 0;
            },
            validate : function() {
                return isNaN(this.unformattedInputValue()) ? {
                    valid : false,
                    msg : "Please enter a valid integer"
                } : {
                    valid : true,
                    msg : null
                };
            }
        });

        Slickback.IntegerCellEditor = IntegerCellEditor;

        //Numbercell editor
        function NumberCellEditor(args) {
            this.container = args.container;
            this.column = args.column;
            this.defaultValue = null;
            this.$input = this.createTextInputElement();
        }


        _.extend(NumberCellEditor.prototype, EditorMixin, {
            serializeValue : function() {
                var value = this.unformattedInputValue();
                var precision = this.column.precision;
                return ( precision ? parseFloat(value).toFixed(precision) : parseFloat(value).toFixed(0));
            },
            validate : function() {
                return isNaN(this.unformattedInputValue()) ? {
                    valid : false,
                    msg : "Please enter a valid number"
                } : {
                    valid : true,
                    msg : null
                };
            }
        });

        Slickback.NumberCellEditor = NumberCellEditor;

        //Dropdown cell editor
        function DropdownCellEditor(args) {
            this.container = args.container;
            this.column = args.column;
            this.defaultValue = null;
            this.$input = this.createSelectElement();
        }

        _.extend(DropdownCellEditor.prototype, EditorMixin, {
            loadValue : function(model) {
                var editValue = this.unformattedModelValue(model);
                this.defaultValue = editValue;
                this.$input.val(editValue);
                this.$input[0].defaultValue = editValue;
                this.$input.select();
                // ok for selects?
            },
            serializeValue : function() {
                return this.$input.val();
                // i.e. use value
            },
            validate : function() {
                return {
                    valid : true,
                    msg : null
                };
            }
        });

        Slickback.DropdownCellEditor = DropdownCellEditor;
    }));
