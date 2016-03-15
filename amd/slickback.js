( function(root, factory) {
    // Set up appropriately for the environment.
    if ( typeof exports !== 'undefined') {
        // Node/CommonJS
        factory(root, exports, require('underscore'), require('backbone'));
    } else if ( typeof define === 'function' && define.amd) {
        // AMD
        define(['underscore', 'backbone', 'exports'], function(_, Backbone, exports) {
            return factory(root, exports, _, Backbone);
        });
    } else {
        // Browser globals
        root.Slickback = factory(root, {}, root._, root.Backbone);
    }
}(this, function(root, Slickback, _, Backbone) {"use strict";

    Slickback.VERSION = '0.3.0';

    /**
     * Slickback.Scope constructs scope objects that wrap a model
     * or collection to encapsulate a set of parameters to be used
     * to fetch the model or collection.
     */
    function Scope(model, dataOptions) {
        if (!this instanceof Scope) {
            return new Scope(model, dataOptions);
        }
        this.model = model;
        this.dataOptions = dataOptions || {};
        return this;
    }


    _.extend(Scope.prototype, {
        fetch :
          /**
           * Fetch from model or collection, applying scope parameters.
           * Assumes model/collection has a #fetch method which accepts
           * an options object.
           */
            function(fetchOptions) {
              var optionsWithScope = this.makeFetchOptions(fetchOptions);
              return (! _.isUndefined(this.model.fetchWithoutScope)) ? this.model.fetchWithoutScope(optionsWithScope) : this.model.fetch(optionsWithScope);
          },
        makeFetchOptions :
          /**
           * Merge the data object (if any) of the passed options object
           * with the scope parameters. Values in the passed data object
           * take precedence over those set in the scope. A new options
           * object is returned including a data object which is the
           * result of the merge.
           */
            function(fetchOptions) {
              fetchOptions || ( fetchOptions = {});
              var scopedData = _.extend({}, this.dataOptions, fetchOptions.data);
              var fetchOptionsWithScope = _.clone(fetchOptions);
              if (!_.isEqual({}, scopedData)) {
                  fetchOptionsWithScope.data = scopedData;
              }
              return fetchOptionsWithScope;
          },
        extend :
          /**
           * Extend the scope parameters.
           */
            function(newOptions) {
              _.extend(this.dataOptions, newOptions);
          },
        scoped :
          /**
           * Create a new scope, optionally extended with passed parameters.
           */
            function(newOptions) {
              var newDataOptions = _.extend({}, this.dataOptions, newOptions);
              return new Scope(this.model, newDataOptions);
          }
    });

    Slickback.Scope = Scope;

    //SCOPE MODEL MIXIN

    /**
     * Slickback.ScopedModelMixin can be mixed into a model or collection
     * that implements #fetch. It adds a defaultScope member which is accessed
     * via the #scope method, and applied to fetches performed via the
     * #fetchWithScope method.
     */
    Slickback.ScopedModelMixin = {
        scope :
          /**
           * Construct a default scope for the model or
           collection, or return
           * the default scope if already constructed.
           */
            function() {
              return this.defaultScope || (this.defaultScope = new Scope(this));
          },
        extendScope :
          /**
           * Extend the default scope associated with a model or collection.
           */
            function(params) {
              var scope = this.scope();
              scope.extend(params);
          },
        clearScope :
          /**
           * Clear the parameters of the default scope associated with a model
           * or collection.
           */
            function() {
              this.defaultScope = new Scope(this);
          },
        fetchWithoutScope :
          /**
           * Perform a fetch on a model or collection without applying default
           * scope.
           */
            function(options) {
              return this.fetch(options);
          },
        fetchWithScope :
          /**
           * Perform a fetch on a model or collection without applying default
           * scope.
           */
            function(options) {
              return this.fetch(options);
          },
        scoped :
          /**
           * Return a scope for the model or collection, cloned from the
           * default scope.
           */
            function(options) {
              var scope = this.scope();
              return scope.scoped(options);
          },
        defaultScopeEnabled : false,
        installScopedModelDefaults :
          /**
           * Configure a collection to use scoped fetch by default.
           */
            function() {
              if (!this.defaultScopeEnabled) {
                  this.defaultScopeEnabled = true;

                  this.fetchWithoutScope = this.fetch;
                  this.fetch = this.fetchWithScope;
              }
          }
    };

    /**
     *Setup link to slick grid - unfortunately slick grid uses a global...
     * This won't work for common js (if running in node)
     * Any ideas on how to find the slick var?
     */
    var Slick = window.Slick;

    // NOTE: assuming global linkage for SlickGrid

    if ( typeof Slick === "undefined") {
        console.log("Failed to load SlickGrid.");
    }

    /**
     * Adapts a collection to be used as a Slick.Data.DataView
     * for purposes of event subscription and notification.
     * #installDataViewEventHandlers must be invoked on each instance.
     */
    Slickback.CollectionEventsMixin = {
        installDataViewEventHandlers : function() {
            this.onRowCountChanged = new Slick.Event();
            this.onRowsChanged = new Slick.Event();
            this.onPagingInfoChanged = new Slick.Event();
        }
    };

    /**
     *Paginated Mixin
     */

    /**
     * Slickback.PaginatedCollectionMixin can be mixed into a collection
     * that implements #add and #fetch. It adds methods for fetching
     * the collection with pagination parameters, and parsing and adding
     * a fetched response to include pagination values.
     */
    Slickback.PaginatedCollectionMixin = _.extend({}, Slickback.ScopedModelMixin, {
        paginatedScope :
          /**
           * Returns the collection's default scope with pagination parameters.
           */
            function() {
              return this.scoped({
                  page : this.currentPage,
                  per_page : this.perPage
              });
          },
        fetchWithPagination :
          /**
           * Fetches the collection, applying the paginated scope.
           */
            function(params) {
              return this.paginatedScope().fetch(params);
          },
        fetchWithoutPagination :
          /**
           * Fetches the collection without applying the paginated scope.
           */
            function(params) {
              return this.fetch(params);
          },
        parseWithPagination :
          /**
           * Returns a collection with pagination values for a fetch response.
           */
            function(response, xhr) {
              var paginatedEntries = response.entries || response;

              paginatedEntries.currentPage = response.currentPage;
              paginatedEntries.perPage = response.perPage;
              paginatedEntries.totalEntries = response.totalEntries;

              return paginatedEntries;
          },
        parseWithoutPagination :
          /**
           * Invokes a collection's original parse method and returns results.
           */
            function(response, xhr) {
              return this.parse(response, xhr);
          },
        addWithPagination :
          /**
           * Adds models to a collection, setting pagination parameters.
           */
            function(models, options) {
              this.currentPage = models.currentPage || 1;
              this.perPage = models.perPage || models.length;
              this.totalEntries = models.totalEntries;

              return this.addWithoutPagination(models, options);
          },
        addWithoutPagination :
          /**
           * Invokes a collection's original add method and returns results.
           */
            function(models, options) {
              return this.add(models, options);
          },
        defaultPaginationEnabled : false,
        installPaginatedIngestors :
          /**
           * Configure a collection to use paginated methods (fetch/parse/add)
           * by default.
           */
            function() {
              if (!this.defaultPaginationEnabled) {
                  this.defaultPaginationEnabled = true;

                  this.parseWithoutPagination = this.parse;
                  this.parse = this.parseWithPagination;

                  this.addWithoutPagination = this.add;
                  this.add = this.addWithPagination;
              }
          }
    });

    /**
     * Adapts a paginated collection for use with Slick.Controls.Pager
     * (v1.4.3). Assumes currentPage, perPage, and totalEntries members, with
     * page numbering starting at 1. (Slickback.PaginatedCollectionMixin
     * provides this.) Also assumes onPagingInfoChanged event listener.
     * (Slickback.ModelEventsMixin provides this.)
     *
     * Slick.Controls.Pager (v1.4.3) expects the initializing dataView
     * argument to implement getPagingInfo(), setPagingOptions(opts)
     * (both provided by this mixin), as well as the onPagingInfoChanged.
     * subscribe event publisher (provided by SlickGrid.ModelEventsMixin).
     */
    Slickback.PagerAdaptorMixin = {
        getPagingInfo :
          /**
           * Return the pagination parameters expected by Slick.Controls.Pager.
           */
            function() {
              return {
                  pageNum : (this.currentPage || 1) - 1, // slickgrid uses offset 0
                  pageSize : this.perPage,
                  totalRows : this.totalEntries
              };
          },
        setPagingOptions :
          /**
           * Translate Slick.Controls.Pager parameters into the parameters used
           * by Slickback.PaginatedCollectionMixin, and publish the
           * onPagingInfoChanged notification.
           */
            function(opts) {
              if (! _.isUndefined(opts.pageSize)) {
                  this.perPage = opts.pageSize;
              }
              if (! _.isUndefined(opts.pageNum)) {
                  if (_.isNumber(this.totalEntries) && (_.isNumber(this.perPage) && this.perPage > 0)) {
                      var maxPage = Math.max(1, Math.ceil(this.totalEntries / this.perPage));
                      this.currentPage = Math.min((opts.pageNum + 1), maxPage);
                  } else {
                      this.currentPage = opts.pageNum + 1;
                      // pageNum is zero-based
                  }
              }
              // NOTE: this notification will happen again on reset
              this.onPagingInfoChanged.notify(this.getPagingInfo());
              this.fetchWithPagination();
          }
    };

    //EVENT TRANSLATION
    var notifyCollectionChanged = function() {
        if (this.getPagingInfo) {
            this.onPagingInfoChanged.notify(this.getPagingInfo());
        }
        this.onRowCountChanged.notify();
        this.onRowsChanged.notify();
    };

    /**
     * Adapts a collection which supports Backbone-style events
     * (e.g. Backbone.Events #bind) and Slick.Data.DataView-style events
     * (e.g. ModelEventsMixin onRowsChanged), translating Backbone
     * "reset", "add" and "remove" events into "onRowCountChanged" and
     * "onRowsChanged" notifications. If #getPagingInfo is implemented
     * (e.g. PagerAdaptorMixin), also publishes "onPagingInfoChanged".
     *
     * Note that unlike the Slick.Grid examples, the onRowCountChanged
     * notification does not include the previous count of rows and the
     * onRowsChanged notification does not include the difference in rows.
     */
    Slickback.EventTranslationMixin = {
        bindCollectionEventTranslations :
          /**
           * Activates event translation for an instance.
           */
            function() {
              this.bind("reset", notifyCollectionChanged);
              this.bind("add", notifyCollectionChanged);
              this.bind("remove", notifyCollectionChanged);
          }
    };

    //Collection adapter mixin

    /**
     * Adapts a collection that stores its models in a model array
     * (e.g. Backbone.Collection) for use with SlickGrid v2.0
     */
    Slickback.CollectionAdaptorMixin = {
        getLength : function() {
            return this.models.length;
        },
        getItem : function(i) {
            return this.models[i];
        }
    };

    //Slickback Colleciton
    var collection_mixin_members = _.extend({
        initialize :
          /**
           * NOTE: If extending Collection with another initializer,
           * be sure to initialize these mixins.
           */
            function() {
              this.installDataViewEventHandlers();
              this.bindCollectionEventTranslations();
          }
    }, Slickback.CollectionEventsMixin, Slickback.EventTranslationMixin, Slickback.CollectionAdaptorMixin);

    /**
     * A Backbone.Collection adapted to be used as a Slick.Data.DataView.
     */
    Slickback.Collection = Backbone.Collection.extend(collection_mixin_members);

    //Scoped Collection
    var scoped_collection_mixin_members = _.extend({
        initialize : function() {
            this.installDataViewEventHandlers();
            this.bindCollectionEventTranslations();

            this.installScopedModelDefaults();
        }
    }, Slickback.ScopedModelMixin);

    /**
     * A Backbone.Collection, extended with default scope,
     * adapted to be used as a Slick.Data.DataView.
     */
    Slickback.ScopedCollection = Slickback.Collection.extend(scoped_collection_mixin_members);

    //Paginated Collection

    var paginated_mixin_members = _.extend({
        initialize : function() {
            this.installDataViewEventHandlers();

            this.installPaginatedIngestors();

            this.bindCollectionEventTranslations();
        }
    }, Slickback.PaginatedCollectionMixin, Slickback.PagerAdaptorMixin);

    /**
     * A Slickback.Collection enhanced with pagination support.
     */
    Slickback.PaginatedCollection = Slickback.Collection.extend(paginated_mixin_members);

    //Formatter factory

    /**
     * Implements a SlickGrid formatterFactory which uses the field
     * property of a column to get the corresponding value from
     * a Backbone model instance.
     */
    Slickback.BackboneModelFormatterFactory = {
        getFormatter : function(column) {
            return function(row, cell, value, col, data) {
                return data.get(col.field);
            };
        }
    };

    return Slickback;
}));
