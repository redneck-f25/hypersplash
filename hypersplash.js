(function(){
"use strict";
// hyperslash - Simple module loader and splash screen
//
// Copyright 2017 BitCtrl Systems GmbH <https://www.bitctrl.de>
// Copyright 2017 Daniel Hammerschmidt <daniel@redneck-engineering.com>
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
//
// 1. Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
//
// 2. Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in
//    the documentation and/or other materials provided with the
//    distribution.
//
// 3. Neither the name of the copyright holder nor the names of its
//    contributors may be used to endorse or promote products derived
//    from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
// HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
// INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
// BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
// CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
// LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY
// WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

// TODO: add counter for loaded and remaining components to detect disruption
//       in module dependencies

function nextTick( fn ) {
    setTimeout( fn, 0 );
}

var splashScript = [].slice.call( document.getElementsByTagName( 'script' ) ).pop();
var toLoadMap = {};

var componentsCount = 0;
var componentsLoadedCount = 0;
var modulesCount = 0;
var modulesInQueueCount = 0;
var failed = false;

var cssClassName = splashScript.dataset.cssClassName;
var errorEventName = splashScript.dataset.errorEventName;
var progressEventName = splashScript.dataset.progressEventName;

var debugMode = false;

// callback to modify URLs
var urlReplacer = splashScript.dataset.urlReplacer;
if ( urlReplacer ) {
    urlReplacer = Function( 'DEBUG', 'url', 'module', 'type', urlReplacer );
} else {
    urlReplacer = function( DEBUG, url ) { return url; };
}

// add the css class name to <head> immediately (before initial rendering)
cssClassName && document.documentElement.classList.add( cssClassName );

addEventListener( 'load', function(){
    // add the css class name to <body> after loading (after initial rendering)
    cssClassName && document.body.classList.add( cssClassName );

    var modulesConfUrl = splashScript.dataset.modulesDef;
    if ( splashScript.dataset.debugRegexp && splashScript.dataset.debugModulesDef ) {
        if ( new RegExp( splashScript.dataset.debugRegexp ).test( location.toString() ) ) {
            debugMode = true;
            modulesConfUrl = splashScript.dataset.debugModulesDef;
        }
    }

    loadModulesConf( modulesConfUrl );
});

function loadModulesConf( modulesConfUrl ) {
    // TODO: handle error
    var req = new XMLHttpRequest();
    req.open( 'GET', urlReplacer( debugMode, modulesConfUrl ), true );
    req.overrideMimeType( 'application/json' );
    req.onreadystatechange = function () {
        if ( this.readyState != 4 ) {
            return;
        }
        var modulesDef = JSON.parse( this.responseText );
        nextTick( parseModulesConf.bind( null, modulesDef ) );
    };
    req.send();
}

function parseModulesConf( modulesConf ) {
    // build initial map with 'wants'-references 
    for ( var moduleName in modulesConf ) {
        var moduleConf = modulesConf[ moduleName ];
        if ( moduleConf[ 0 ] instanceof Array ) {
            var wants = moduleConf[ 0 ];
            var components = moduleConf[ 1 ];
        } else {
            var wants = [];
            var components = moduleConf[ 0 ];
        }
        toLoadMap[ moduleName ] = {
            name: moduleName,
            components: components,
            wants: wants,
            wantedBy: {}
        };
    }
    // make reverse 'wanted-by'-references
    for ( var moduleName in toLoadMap ) {
        var module = toLoadMap[ moduleName ];
        ++modulesCount;
        for ( var componentType in module.components ) {
            var componentsByType = module.components[ componentType ];
            if ( typeof componentsByType === 'string' ) {
                module.components[ componentType ] = componentsByType = [ componentsByType ];
            } else if ( componentsByType.length === 0 ) {
                delete module.components[ componentType ];
                continue;
            }
            componentsCount += componentsByType.length;
        }
        if ( module.wants.length === 0 ) {
            ++modulesInQueueCount;
            nextTick( loadModule.bind( null, moduleName ) );
        } else for ( var ii = module.wants.length; ii; ) {
            var prerequisiteName = module.wants[ --ii ];
            if ( toLoadMap.hasOwnProperty( prerequisiteName ) ) {
                toLoadMap[ prerequisiteName ].wantedBy[ moduleName ] = true;
            } else {
                dispatchError({ message: `Unresolved dependency ${prerequisiteName} for module ${moduleName}.` });
            }
        }
    }
    if ( !modulesInQueueCount ) {
        dispatchError({ message: `No module w/o dependencies found.` });
    }
}

function dispatchError( detail ) {
    failed = true;
    errorEventName && window.dispatchEvent( new CustomEvent( errorEventName, { detail: detail }));
}

function loadModule( moduleName ) {
    if ( failed ) return;
    var module = toLoadMap[ moduleName ];
    for ( var componentType in module.components ) {
        var componentsByType = module.components[ componentType ];
        componentsByType.forEach( function( componentSource ){
            nextTick( loadComponent.bind( null, moduleName, componentType, componentSource ) );
        });
    }
}

function loadComponent( moduleName, componentType, componentSource ) {
    if ( failed ) return;
    var module = toLoadMap[ moduleName ];
    componentSource = urlReplacer( debugMode, componentSource, moduleName, componentType );

    function onComplete() {
        cssClassName && nextTick( function() {
            document.documentElement.classList.remove( cssClassName );
            document.body.classList.remove( cssClassName );
        });
        progressEventName && window.dispatchEvent( new CustomEvent( progressEventName, { detail: {
            type: 'complete',
        }}));
    }

    function onModuleLoaded() {
        delete module.components[ componentType ];
        if ( Object.getOwnPropertyNames( module.components ).length === 0 ) {
            for ( var dependentName in toLoadMap[ moduleName ].wantedBy ) {
                var dependent = toLoadMap[ dependentName ];
                dependent.wants.splice( dependent.wants.indexOf( moduleName ), 1 );
                if ( dependent.wants.length === 0 ) {
                    ++modulesInQueueCount;
                    nextTick( loadModule.bind( null, dependentName ) );
                }
            }
            delete toLoadMap[ moduleName ];
            var modulesToLoadCount = Object.getOwnPropertyNames( toLoadMap ).length;
            if ( 0 === --modulesInQueueCount && 0 !== modulesToLoadCount ) {
                dispatchError({ message: 'Circular reference in dependencies.' });
            } else if ( 0 === modulesToLoadCount ) {
                nextTick( onComplete );
            }
            progressEventName && window.dispatchEvent( new CustomEvent( progressEventName, { detail: {
                type: 'module',
                moduleName: moduleName
            }}));
        }
    }

    function onComponentLoaded( event ) {
        var rate = 1.0 * ++componentsLoadedCount / componentsCount;
        module.components[ componentType ].splice( module.components[ componentType ].indexOf( componentSource ), 1 );
        if ( module.components[ componentType ].length === 0 ) {
            nextTick( onModuleLoaded );
        }
        progressEventName && window.dispatchEvent( new CustomEvent( progressEventName, { detail: {
            type: 'component',
            rate: rate,
            moduleName: moduleName,
            componentType: componentType,
            componentSource: componentSource,
            event: event
        }}));
    }

    function onError( event ) {
        dispatchError({
            message: `Cannot load component "${componentSource}" of module "${moduleName}"`,
            moduleName: moduleName,
            componentType: componentType,
            componentSource: componentSource,
            event: event
        });
    }

    switch( componentType ) {
        case 'js':
            var script = document.head.appendChild( document.createElement( 'script' ) );
            script.src = componentSource;
            script.addEventListener( 'load', onComponentLoaded );
            script.addEventListener( 'error', onError );
            break;
        case 'css':
            var link = document.head.appendChild( document.createElement( 'link' ) );
            link.type = 'text/css';
            link.rel = 'stylesheet';
            link.href = componentSource;
            link.addEventListener( 'load', function( event ) {
                // handle error in ie and edge
                try {
                    event.target.sheet.cssText;
                    onComponentLoaded.call( link, event );
                } catch ( e ) {
                    onError.call( link, event );
                }
             });
            link.addEventListener( 'error', onError );
            break;
        default:
        
    }
}

})();