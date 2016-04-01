window.onload = function() {
    var toggleMouseDown = true;
    var toggleTimer = -1;
    var headerArrow = document.querySelector('#arrow');
    var header = document.getElementsByTagName('header')[0];

    document.addEventListener('click', onMouseClick, false);
    document.addEventListener('mousedown', onMouseDown, false);

    function onMouseClick(e) {
  
        e.stopPropagation();
        toggleMouseDown = true;

        if (e.target === headerArrow && toggleMouseDown) {
            if (header.className === '') {
                clearTimeout(toggleTimer);

                toggleMouseDown = false;
                toggleTimer = setTimeout(function() {
                    header.setAttribute('class', 'animate');
                    headerArrow.setAttribute('class', 'animate');
                }, 1000/60);
            } else if (header.className === 'animate') {
                clearTimeout(toggleTimer);

                toggleTimer = setTimeout(function() {
                    header.setAttribute('class', '');
                    headerArrow.setAttribute('class', '');
                }, 1000/60);
            }
        }
    }

    function onMouseDown(e) {

        e.stopPropagation();

        removeEventListener('click', onMouseClick, false);
        if (e.target !== headerArrow && !toggleMouseDown) {
            toggleMouseDown = true;
            clearTimeout(toggleTimer);
            header.setAttribute('class', 'animate');
            headerArrow.setAttribute('class', 'animate');
        }
    }    
};