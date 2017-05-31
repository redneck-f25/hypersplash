(function( $ ){
"use strict";

function nextTick( fn ) {
    setTimeout( fn, 0 );
}

var splash = document.getElementById( 'hypersplash-overlay' );
var splash2 = document.getElementById( 'bootstrap-splash-overlay' );
var done = false;

function _splash_ontransitionend( event ) {
    if ( ! done && ! document.documentElement.classList.contains( 'hypersplash-loading' ) ) {
        done = true;
        splash.removeEventListener( event.type, _splash_ontransitionend );
        splash2.removeEventListener( event.type, _splash_ontransitionend );
        nextTick( function(){
            document.body.insertAdjacentHTML( 'beforeEnd' ,'<div class="alert alert-success" role="alert"><strong>Running</strong></div>' );
        });
    }
}

splash.addEventListener( "transitionend", _splash_ontransitionend, true );
splash2.addEventListener( "transitionend", _splash_ontransitionend, true );

$( function() {
    document.body.insertAdjacentHTML( 'beforeEnd' ,'<div class="alert alert-success" role="alert"><strong>$( document ).ready()</strong></div>' );
});

})( jQuery );
