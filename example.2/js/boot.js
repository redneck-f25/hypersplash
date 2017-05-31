(function(){

document.body.innerHTML = `
<div id="hypersplash-overlay"><div><span>Startup sequence in progress...</span><br><span class="hyper-progress-bar"><span></span></span></div></div>

<div id="bootstrap-splash-overlay">
    <div class="container">
        <div class="panel panel-primary">
            <div class="panel-heading">
                <h3 class="panel-title">hypersplash</h3>
            </div>
            <div class="panel-body">
                <div class="progress">
                    <div id="bootstrap-splash-progress" class="progress-bar progress-bar-striped active" role="progressbar" x-aria-valuenow="70" x-aria-valuemin="0" x-aria-valuemax="100" x-style="width:70%">
                    <span class="sr-only">70% Complete</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>


<div class="container">
    <div class="panel panel-primary">
        <div class="panel-heading">
            <h3 class="panel-title">hypersplash</h3>
        </div>
        <div class="panel-body">
            <div class="btn-group" role="group" aria-label="...">
                <a class="btn btn-primary" href="?debug=">debug</a>
                <a class="btn btn-primary" href="?">release</a>
            </div>
        </div>
    </div>
</div>
`;

var splash = null;

addEventListener( 'hypersplash-error', function( event ) {
    splash || ( splash = document.getElementById( 'hypersplash-overlay' ) );
    splash.classList.add( 'error' );
    splash.firstElementChild.firstElementChild.innerText = 'Fatal error in startup sequence. ' + event.detail.message;
    splash.firstElementChild.appendChild( document.createElement( 'br' ) );
    var link = splash.firstElementChild.appendChild( document.createElement( 'a' ) );
    link.href = 'javascript:location.reload();';
    link.innerText = 'Reload';
    console.log( event );
});
addEventListener( 'hypersplash-progress', function( event ) {
    if ( event.detail.type === 'component' ) {
        splash || ( splash = document.getElementById( 'hypersplash-overlay' ) );
        splash.firstElementChild.children[ 2 ].firstElementChild.style.width = `${100.0 * event.detail.rate}%`;
        var splash2 = document.getElementById( 'bootstrap-splash-progress' );
        splash2.style.width = `${100.0 * event.detail.rate}%`;
        //splash.firstElementChild.children[ 2 ].insertAdjacentHTML( 'beforeEnd', event.detail.rate + '<br>' );
    } else if ( event.detail.type === 'module' ) {
        if ( event.detail.moduleName === 'bootstrap' ) {
            document.documentElement.classList.add( 'bootstrap' );
        }
    } else if ( event.detail.type === 'complete' ) {
        document.body.insertAdjacentHTML( 'beforeEnd' ,'<div class="alert alert-success" role="alert"><strong>Complete</strong></div>' );
    }
});

})();
