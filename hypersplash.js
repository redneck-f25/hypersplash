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

function nextTick( fn ) {
    setTimeout( fn, 0 );
}

var bootScript = [].slice.call( document.getElementsByTagName( 'script' ) ).pop();
var toLoadMap = {};
var score = 0;

var cssClassName = bootScript.dataset.cssClassName;
var errorEventName = bootScript.dataset.errorEventName;
var progressEventName = bootScript.dataset.progressEventName;
cssClassName && document.documentElement.classList.add( cssClassName );

addEventListener( 'load', function(){
    cssClassName && document.body.classList.add( cssClassName );

    var modulesDefUrl = bootScript.dataset.modulesDef;
    if ( bootScript.dataset.debugRegexp && bootScript.dataset.debugModulesDef ) {
        if ( new RegExp( bootScript.dataset.debugRegexp ).test( location.toString() ) ) {
            modulesDefUrl = bootScript.dataset.debugModulesDef;
        }
    }

    loadModuleDef( modulesDefUrl );
});

function loadModuleDef( modulesDefUrl ) {
    // TODO: handle error
    var req = new XMLHttpRequest();
    // TODO: think about caching
    modulesDefUrl += '?' + Date.now().valueOf()
    req.open( 'GET', modulesDefUrl, true );
    req.overrideMimeType( 'application/json' );
    req.onreadystatechange = function () {
        if ( this.readyState != 4 ) {
            return;
        }
        var modulesDef = JSON.parse( this.responseText );
        nextTick( loadModules.bind( null, modulesDef ) );
    };
    req.send();
}

function loadModules( modulesDef ) {
    for ( var moduleName in modulesDef ) {
        var moduleDef = modulesDef[ moduleName ];
        score += moduleDef[ 1 ],
        toLoadMap[ moduleName ] = {
            name: moduleName,
            components: moduleDef[ 1 ],
            wants: moduleDef[ 0 ],
            wantedBy: {}
        };
    }
    for ( var moduleName in toLoadMap ) {
        var module = toLoadMap[ moduleName ];
        if ( module.wants.length === 0 ) {
            nextTick( loadModule.bind( null, moduleName ) );
        } else for ( var ii = module.wants.length; ii; ) {
            toLoadMap[ module.wants[ --ii ] ].wantedBy[ moduleName ] = true;
        }
    }
}

function loadModule( moduleName ) {
    var module = toLoadMap[ moduleName ];
    for ( var componentType in module.components ) {
        var components = module.components[ componentType ];
        if ( typeof components === 'string' ) {
            module.components[ componentType ] = components = [ components ];
        }
        components.forEach( function( componentSource ){
            nextTick( loadComponent.bind( null, moduleName, componentType, componentSource ) );
        });
    }
}

function loadComponent( moduleName, componentType, componentSource ) {
    var module = toLoadMap[ moduleName ];

    function onComplete() {
        cssClassName && nextTick( function() {
            document.documentElement.classList.remove( cssClassName );
            document.body.classList.remove( cssClassName );
        });
    }

    function onModuleLoaded() {
        delete module.components[ componentType ];
        if ( Object.getOwnPropertyNames( module.components ).length === 0 ) {
            for ( var dependentName in toLoadMap[ moduleName ].wantedBy ) {
                var dependent = toLoadMap[ dependentName ];
                dependent.wants.splice( dependent.wants.indexOf( moduleName ), 1 );
                if ( dependent.wants.length === 0 ) {
                    nextTick( loadModule.bind( null, dependentName ) );
                }
            }
            delete toLoadMap[ moduleName ];
            if ( Object.getOwnPropertyNames( toLoadMap ).length === 0 ) {
                nextTick( onComplete );
            }
        }
    }

    function onComponentLoaded( event ) {
        module.components[ componentType ].splice( module.components[ componentType ].indexOf( componentSource ), 1 );
        if ( module.components[ componentType ].length === 0 ) {
            nextTick( onModuleLoaded );
        }
        progressEventName && window.dispatchEvent( new CustomEvent( progressEventName, { 'detail': {
            moduleName: moduleName,
            componentType: componentType,
            componentSource: componentSource,
            event: event
        }}));
    }

    function onError( event ) {
        errorEventName && window.dispatchEvent( new CustomEvent( errorEventName, { 'detail': {
            moduleName: moduleName,
            componentType: componentType,
            componentSource: componentSource,
            event: event
        }}));
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
                // debugger;
                try {
                    event.target.sheet.cssText;
                    onComponentLoaded( link, event );
                } catch ( e ) {
                    onError( link, event );
                }
             });
            link.addEventListener( 'error', onError );
            break;
        default:
        
    }
}

})();