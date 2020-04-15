# promise-get
>


## Description
Extensions to Promise and Bluebird

Using 
- [bluebird](http://bluebirdjs.com/docs/why-bluebird.html)
- [fetch](https://github.com/github/fetch) (polyfill)
- and implement default error handling and get-methods

## Installation
### bower
`bower install https://github.com/FCOO/promise-get.git --save`

## Demo
http://FCOO.github.io/promise-get/demo/ 


## Usage

### Default error handling

A default error handler is added to `Promise`

	Promise.defaultErrorHandler [function( errorObject: ERROR_OBJECT )]
    ERROR_OBJECT = {
        name      : "Error",
        status    : INTEGER,
        message   : STRING, 
        text      : STRING,
        statusText: STRING
    }
    //message = text = statusText

Every `Promise` that fails and don't have a `.catch` will end in `Promise.defaultErrorHandler`

### Default pre-fetch and finnaly
        
    Promise.defaultPrefetch = function(url, options): To be called before ALL fetch
    Promise.defaultFinally = function(): To be called as finally for ALL Promise.get

### Get methods

	Promise.get( url, options[, resolve[, reject[, finally]]] ) 
	Promise.getText( url, options[, resolve[, reject[, finally]]] ) //Same as Promise.get with format = 'text'
    Promise.getJSON( url, options[, resolve[, reject[, finally]]] ); //Same as Promise.get with format = 'json'
    Promise.getXML( url, options[, resolve[, reject[, finally]]] ); //Same as Promise.get with format = 'xml'

#### Parametre and options

##### resolve
    function( response )

##### reject 
	function( errorObject: ERROR_OBJECT )

##### finally
	function() 

##### options
| Id | Type | Default | Description |
| :--: | :--: | :-----: | --- |
| `resolve` | `function( response )` | `null` | Alternative for parameter `resolve` |
| `done` | `function( response )` | `null` | Alternative for parameter `resolve` |
| `reject` | `function( errorObject: ERROR_OBJECT )` | `null` | Alternative for parameter `reject` |
| `fail` | `function( errorObject: ERROR_OBJECT )` | `null` | Alternative for parameter `reject` |
| `finally` | `function()` | `null` | Alternative for parameter `finally` |
| `always` | `function()` | `null` | Alternative for parameter `finally` |
| `retries` | `number` | `0`| Number Alternative for parameter `finally` |
| `retryDelay` | `number` | `0` | ms between retries |
| `format` | `string` | `"text/plain"` | Format |
| `useDefaultErrorHandler` | `boolean` | `true` | If `true` the default error handler is also called even if a `reject-function` is given. `{reject: null, useDefaultErrorHandler:false}` => No error cached |
| `headers` etc. | | | Standard options for fetch |

## Copyright and License
This plugin is licensed under the [MIT license](https://github.com/FCOO/promise-get/LICENSE).

Copyright (c) 2017 [FCOO](https://github.com/FCOO)

## Contact information

NielsHolt nho@fcoo.dk

