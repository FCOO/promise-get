/****************************************************************************
    promise-get.js,

    (c) 2017, FCOO

    https://github.com/FCOO/promise-get
    https://github.com/FCOO

****************************************************************************/

(function ($, window, Promise/*, document, undefined*/) {
    "use strict";

    //Create a default error-handle. Can be overwritten
    Promise.defaultErrorHandler = Promise.defaultErrorHandler || function( /* error: {name, status, message, text, statusText}  */ ){};

    function createErrorObject( reason, url ){
        let response = reason.response || {},
            text     = response.statusText || reason.statusText || response.message || reason.message,
            error    = new Error(text, url);

        $.extend(error, {
            name      : 'Error',
            status    : response.status || reason.status || null,
            url       : url,
            message   : text,
            text      : text,
            statusText: text
        });
        return error;
    }

    //Set event handler for unhandled rejections
    window.onunhandledrejection = function(e, promise){

        if (e && e.preventDefault)
            e.preventDefault();

        //Unknown why, but in some browsers onunhandledrejection is called twice - one time with e.detail
        if (e && e.detail)
            return false;

        let url = '';


        if (promise){
            //Try different ways to get the url
            if (promise.toJSON){
                const pJSON = promise.toJSON();
                url = pJSON && pJSON.rejectionReason ? pJSON.rejectionReason.url : '';
            }

            if (!url)
                url = promise.promiseOptions ? promise.promiseOptions.url : '';
        }


        Promise.defaultErrorHandler( createErrorObject( e, url ) );
    };

    //Promise.defaultPrefetch = function(url, options): To be called before ALL fetch
    Promise.defaultPrefetch = null;

    //Promise.defaultFinally = function(): To be called as finally for ALL Promise.get
    Promise.defaultFinally = null;

    /**************************************************************
    Promise.fetch( url, options )
    Fetch the url.
    Retries up to options.retries times with delay between of options.retryDeday ms
    Princip taken from https://medium.com/@yshen4/javascript-fetch-with-retry-fb7e2e8f8cad

    Original code from https://medium.com/@yshen4/javascript-fetch-with-retry-fb7e2e8f8cad:

    const wait = (delay) => (new Promise((resolve) => setTimeout(resolve, delay)));
    Promise.fetchWithRetry = function(url, tries=2){
        fetch(url)
            .then( (response) => {
                if (response.ok) {
                    return response.json();
                } else {
                    // 1. throw a new exception
                    if (res.status === 401) throw new 4xxError('Not authorized', response)
                    if (res.status === 404) throw new 4xxError(`Resource doesn't exist`, response)
                    // 2. reject instead of throw, peferred
                    return Promise.reject(response);
                }
            })
            .catch( (error) => {
                if (error instanceof 4xxError || tries < 1) {
                    throw error;
                } else {
                    //Retry network error or 5xx errors
                    const delay = Math.floor(Math.random() * 1000);
                    wait(delay).then(()=> Promise.fetchWithRetry(url, tries - 1));
                }
            })
    }
    **************************************************************/
    const wait = (delay) => (new Promise((resolve) => setTimeout(resolve, delay)));
    Promise.fetch = function(url, options) {
        options = $.extend( {}, {
            retries   : 3,
            retryDelay: 1000,
            noCache   : false,
            //            cache     : 'reload',  //TODO: Check if it works
/*REMOVE FOR NOW. NEED TO FIND A WAY TO FORCE NO-CACHE
            headers   : {
                "Cache-Control": 'no-cache'    //TODO: Check if this works
            }
*/
        }, options || {});

        //Adding parame dummy=12345678 if options.noCache: true to force no-cache
        if (options.noCache)
            url = url + (url.indexOf('?') > 0 ? '&' : '?') + 'dummy='+Math.random().toString(36).substr(2, 9);
        //Tried cache: 'reload' but did not seam to work
        //if (options.noCache && !options.cache)
        //    options.cache = 'reload';



        if (Promise.defaultPrefetch && !options.noDefaultPrefetch)
            Promise.defaultPrefetch(url, options);

        return new Promise(function(resolve, reject) {
            fetch(url, options)
                .then((response) => {
                    if (response.ok)
                        resolve(response);
                    else {
                        return Promise.reject(createErrorObject(response, options.url));
                        //return Promise.reject(new Error(response));
                        //return Promise.reject(response);
                        //return createErrorObject(response, options.url);
                    }
                })
                .catch((/*error*/reason) => {
                    if (options.retries > 0){
                        options.retries--;
                        options.noCache = false;
                        options.noDefaultPrefetch = true;
                        wait(options.retryDelay)
                            .then(()=> Promise.fetch(url, options) );
                    }
                    else {
                        let error =  createErrorObject(reason, options.url);
                        if (options.reject)
                            options.reject(error);
                        if (options.useDefaultErrorHandler)
                            reject(error);
                    }
                });
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


    function parseYAML( response ){
        var json;

        try{
            json = window.YAML.parse(response);
        }
        catch (e){
            json = undefined;
            var error = new Error("Invalid YAML");
            throw error;
        }
        return json;
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
            throw error;
        }
        return xml;
    }


    Promise.get = function(url, options, resolve, reject, fin) {
        options = $.extend({}, {
            //Default options
            url                   : url,
            useDefaultErrorHandler: true,
            retries               : 0
        }, options || {} );

        resolve = resolve || options.resolve || options.done;
        reject  = reject  || options.reject  || options.fail;
        fin     = fin     || options.finally || options.always;

        if (options.context){
            resolve = resolve ? resolve.bind(options.context) : null;
            reject = reject   ? reject.bind(options.context)  : null;
            fin    = fin      ? fin.bind(options.context)     : null;
        }

        options.reject = reject;

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
            case 'yaml':
                result =
                    result
                        .then( function(response) { return response.text(); })
                        .then( parseYAML );
                break;
            case 'xml' :
                result =
                    result
                        .then( function(response) { return response.text(); })
                        .then( parseXML );

                if (options.asJSON)
                    result = result.then( function(xml){ return window.xmlToJSON(xml); });
                break;
        }

        if (resolve)
            result = result.then( resolve );

        //Adding finally (if any)
        if (fin || Promise.defaultFinally){
            var finFunc =   fin && Promise.defaultFinally ?
                            function(){
                                fin.apply(null, arguments);
                                Promise.defaultFinally.apply(null, arguments);
                            } : fin || Promise.defaultFinally;

            result = result.finally( finFunc );
        }

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

    /**************************************************************
    Promise.getYAML( url, options[, resolve[, reject[, finally]]] )
    Same as Promise.get with format = 'yaml'.
    Data are converted to json
    **************************************************************/
    Promise.getYAML = function(url, options, resolve, reject, fin) {
        return Promise.get( url,
                            $.extend( {}, options , { format: 'yaml' }),
                            resolve, reject, fin );
    };

}(jQuery, this, Promise, document));


;
/****************************************************************************
    promise-get.js,

    (c) 2017, FCOO

    https://github.com/FCOO/promise-get
    https://github.com/FCOO

****************************************************************************/

(function (window /*, document, undefined*/) {
    "use strict";

    let xmlToJSON = window.xmlToJSON = function(xml) {
        // Create the return object
        var obj = {};

        if (xml.nodeType == 1) {
            // element
            // do attributes
            if (xml.attributes.length > 0) {
                obj["@attributes"] = {};
                for (var j = 0; j < xml.attributes.length; j++) {
                    var attribute = xml.attributes.item(j);
                    obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
                }
            }
        }
        else
            if (xml.nodeType == 3) {
                // text
                obj = xml.nodeValue;
            }

        // do children
        // If all text nodes inside, get concatenated text from them.
        var textNodes = [].slice.call(xml.childNodes).filter(function(node) {
            return node.nodeType === 3;
        });

        if (xml.hasChildNodes() && xml.childNodes.length === textNodes.length) {
            obj = [].slice.call(xml.childNodes).reduce(function(text, node) {
                return text + node.nodeValue;
            }, "");
        }
        else
            if (xml.hasChildNodes()) {
                for (var i = 0; i < xml.childNodes.length; i++) {
                    var item = xml.childNodes.item(i);
                    var nodeName = item.nodeName;
                    if (typeof obj[nodeName] == "undefined") {
                        obj[nodeName] = xmlToJSON(item);
                    }
                    else {
                        if (typeof obj[nodeName].push == "undefined") {
                            var old = obj[nodeName];
                            obj[nodeName] = [];
                            obj[nodeName].push(old);
                        }
                        obj[nodeName].push(xmlToJSON(item));
                    }
                }
            }
        return obj;
    };

}(this, document));
