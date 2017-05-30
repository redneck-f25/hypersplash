(function( $ ){
"use strict";

function nextTick( fn ) {
    setTimeout( fn, 0 );
}

var splash = document.getElementById( 'hypersplash-overlay' );
var done = false;
splash.addEventListener( "transitionend", function _splash_ontransitionend( event ) {
    if ( ! done && ! document.documentElement.classList.contains( 'hypersplash-loading' ) ) {
        done = true;
        event.target.removeEventListener( event.type, _splash_ontransitionend );
        nextTick( function(){
            document.body.insertAdjacentHTML( 'beforeEnd' ,'<div class="alert alert-success" role="alert"><strong>Running</strong></div>' );
        });
    }
}, true );

$( function() {
    document.body.insertAdjacentHTML( 'beforeEnd' ,'<div class="alert alert-success" role="alert"><strong>$( document ).ready()</strong></div>' );
});

})( jQuery );
