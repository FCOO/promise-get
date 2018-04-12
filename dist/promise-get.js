/****************************************************************************
    promise-get.js,

    (c) 2017, FCOO

    https://github.com/FCOO/promise-get
    https://github.com/FCOO

****************************************************************************/

(function ($, window, Promise/*, document, undefined*/) {
    "use strict";

    //Convert a reason to error-object
    Promise.convertReasonToError = function( reason ){
        var result = new Error(),
            response = reason ? reason.response || {} : {};

        result.name    = 'Error';
        result.message = reason.message || '';
        result.url     = response.url || '';
        result.status  = response.status || '';
        return result;
    };

    //Create a default error-handle. Can be overwritten
    Promise.defaultErrorHandler = Promise.defaultErrorHandler || function( /* reason, url */ ){};

    //Set event handler for unhandled rejections
    window.onunhandledrejection = function(e){
        if (e && e.preventDefault)
            e.preventDefault();

        if (e && e.detail){
            var reason = e.detail.reason || {},
                promise = e.detail.promise,
                promiseOptions = promise.promiseOptions || {},
                response = reason.response || {},
                url = response.url || promiseOptions.url || '';

            //Call default error handler
            Promise.defaultErrorHandler( reason, url );
        }
    };

    /**************************************************************
    Promise.fetch( url, options )
    Fetch the url.
    Retries up to options.retries times with delay between of options.retryDeday ms
    **************************************************************/
    Promise.fetch = function(url, options) {
        options = $.extend( {}, {
            retries   : 3,
            retryDelay: 1000,
<<<<<<< HEAD
            noCache   : true,
            //            cache     : 'reload',  //TODO: Check if it works
=======
            cache     : 'reload',  //TODO: Check if it works
>>>>>>> 9737a9629e6e818fe9c7edef593923502df02ea8
/*REMOVE FOR NOW. NEED TO FIND A WAY TO FORCE NO-CACHE
            headers   : {
                "Cache-Control": 'no-cache'    //TODO: Check if this works
            }
*/
        }, options || {});

        //Adding parame dummy=12345678 if options.noCache: true to force no-cache. TODO: Replaced with correct header
        if (options.noCache)
            url = url + (url.indexOf('?') > 0 ? '&' : '?') + 'dummy='+Math.random().toString(36).substr(2, 9);



        return new Promise(function(resolve, reject) {
            var wrappedFetch = function(n) {
                fetch(url, options)
                    .then(function(response) {
                        resolve(response);
                    })
                    .catch(function(error) {
                        if (n > 0) {
                            setTimeout(function() {
                                wrappedFetch(--n);
                            }, options.retryDelay);
                        }
                        else {
                            reject(error);
                        }
                    });
            };
            wrappedFetch(options.retries);
        });
    };



    /**************************************************************
    Promise.get( url, options[, resolve[, reject[, finally]]] )
    Get the file at url.

    resolve || options.resolve || options.done = function( response )
    reject  || options.reject || options.fail = function( error )
    finally || options.finally || options.always = function( ?? )

    options
        retries: 0
        context: null
        format: null (text,json, xml)
        useDefaultErrorHandler: true => use defaultErrorHandler even if a reject-function is given

    **************************************************************/
    function checkStatus(response) {
        if (response.status >= 200 && response.status < 300) {
            return response;
        }
        else {
            var error = new Error(response.statusText);
            error.response = response;
            throw error;
        }
    }


    function parseXML( response ){
        //Adjusted xml-parser from jQuery.jQuery.parseXML
        var xml;

        // Support: IE 9 - 11 only
        // IE throws on parseFromString with invalid input.
        try {
            xml = ( new window.DOMParser() ).parseFromString( response, "text/xml" );
        }
        catch ( e ) {
            xml = undefined;
        }

        if ( !xml || xml.getElementsByTagName( "parsererror" ).length ) {
            var error = new Error("Invalid XML");
            //error.response = response;
            throw error;
        }
        return xml;
    }


    Promise.get = function(url, options, resolve, reject, fin) {
        options = $.extend({}, {
            //Default options
            url: url,
            useDefaultErrorHandler: true,
            retries               : 0
        }, options || {} );


        resolve = resolve || options.resolve || options.done;
        reject  = reject  || options.reject  || options.fail;
        fin     = fin     || options.finally || options.always;

        if (options.context){
            resolve = resolve ? $.proxy( resolve, options.context ) : null;
            reject = reject   ? $.proxy( reject,  options.context ) : null;
            fin    = fin      ? $.proxy( fin,     options.context ) : null;
        }

        var result =
            Promise.fetch(url, options) //Get the file
            .then(checkStatus);         //Check for status of the response

        switch (options.format){
            case 'text':
                result =
                    result
                        .then( function(response) { return response.text(); });
                break;
            case 'json':
                result =
                    result
                        .then( function(response) { return response.text(); })
                        .then( JSON.parse );
                break;
            case 'xml' :
                result =
                    result
                        .then( function(response) { return response.text(); })
                        .then( parseXML );
                break;
        }

        if (resolve)
            result = result.then( resolve );

        //Adding error/reject promise
        if (reject){
            //If options.useDefaultErrorHandler => also needs to call => Promise.defaultErrorHandler
            if (options.useDefaultErrorHandler)
                result = result.catch( function( /*reason, url */ ){
                    reject.apply( null, arguments );
                    return Promise.defaultErrorHandler.apply( null, arguments );
                });
            else
                //Just use reject as catch
                result = result.catch( reject );

        }
        else {
            if (!options.useDefaultErrorHandler)
                //Prevent the use of Promise.defaultErrorHandler
                result = result.catch( function(){} );

        }

        //Adding finally (if any)
        if (fin)
            result = result.finally( fin );

        result.promiseOptions = options;
        return result;
    };

    /**************************************************************
    Promise.getText( url, options[, resolve[, reject[, finally]]] )
    Same as Promise.get with format = 'text'
    **************************************************************/
    Promise.getText = function(url, options, resolve, reject, fin) {
        return Promise.get( url,
                            $.extend( {}, options , { format: 'text' }),
                            resolve, reject, fin );
    };

    /**************************************************************
    Promise.getJSON( url, options[, resolve[, reject[, finally]]] )
    Same as Promise.get with format = 'json'
    **************************************************************/
    Promise.getJSON = function(url, options, resolve, reject, fin) {
        return Promise.get( url,
                            $.extend( {}, options , { format: 'json' }),
                            resolve, reject, fin );
    };

    /**************************************************************
    Promise.getXML( url, options[, resolve[, reject[, finally]]] )
    Same as Promise.get with format = 'xml'
    **************************************************************/
    Promise.getXML = function(url, options, resolve, reject, fin) {
        return Promise.get( url,
                            $.extend( {}, options , { format: 'xml' }),
                            resolve, reject, fin );
    };


    //Initialize/ready
    $(function() {

    });

}(jQuery, this, Promise, document));

